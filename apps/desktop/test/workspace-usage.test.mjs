import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importWorkspaceUsage() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'workspaceUsage.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-usage-test-'));
  const outputPath = path.join(tempDir, 'workspaceUsage.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

function event(seq, payload) {
  return {
    runtime_id: 'runtime-1',
    seq,
    occurred_at: `2026-05-12T00:00:${String(seq).padStart(2, '0')}.000Z`,
    payload,
  };
}

test('uses the latest context_usage snapshot without requiring token events', async () => {
  const { computeSessionUsage } = await importWorkspaceUsage();

  const usage = computeSessionUsage([
    event(1, {
      type: 'context_usage',
      provider: 'codex',
      used_tokens: 167_000,
      max_tokens: 258_400,
      raw_max_tokens: 258_400,
      percentage: 64.6,
      auto_compact_threshold: null,
      is_auto_compact_enabled: true,
      model: 'gpt-5.5-codex',
      categories: [],
    }),
  ]);

  assert.equal(usage.turnCount, 0);
  assert.equal(usage.context.provider, 'codex');
  assert.equal(usage.context.usedTokens, 167_000);
  assert.equal(usage.context.maxTokens, 258_400);
  assert.equal(Math.round(usage.context.percentage), 65);
});

test('does not double-count Claude per-message usage when turn total exists', async () => {
  const { computeSessionUsage } = await importWorkspaceUsage();

  const usage = computeSessionUsage([
    event(1, {
      type: 'token_usage',
      provider: 'claude',
      input_tokens: 10,
      output_tokens: 5,
      cache_read_tokens: 2,
      cache_creation_tokens: 1,
    }),
    event(2, {
      type: 'token_usage',
      provider: 'claude',
      input_tokens: 30,
      output_tokens: 7,
      cache_read_tokens: 4,
      cache_creation_tokens: 3,
      total_cost_usd: 0.0123,
      scope: 'turn_total',
    }),
  ]);

  assert.equal(usage.turnCount, 1);
  assert.equal(usage.totalInputTokens, 30);
  assert.equal(usage.totalOutputTokens, 7);
  assert.equal(usage.totalCacheReadTokens, 4);
  assert.equal(usage.totalCacheCreationTokens, 3);
  assert.equal(usage.estimatedCostUsd, 0.0123);
});

test('tracks the latest output token speed without double-counting Claude per-message usage', async () => {
  const { computeSessionUsage } = await importWorkspaceUsage();

  const usage = computeSessionUsage([
    event(1, {
      type: 'token_usage',
      provider: 'claude',
      input_tokens: 10,
      output_tokens: 5,
      cache_read_tokens: 0,
      cache_creation_tokens: 0,
      output_tokens_per_second: 42.5,
    }),
    event(2, {
      type: 'token_usage',
      provider: 'claude',
      input_tokens: 30,
      output_tokens: 7,
      cache_read_tokens: 4,
      cache_creation_tokens: 3,
      total_cost_usd: 0.0123,
      scope: 'turn_total',
      output_tokens_per_second: 31.25,
    }),
  ]);

  assert.equal(usage.turnCount, 1);
  assert.equal(usage.totalOutputTokens, 7);
  assert.equal(usage.latestOutputTokensPerSecond, 31.25);
});

test('keeps Claude per-message token speed even before turn total arrives', async () => {
  const { computeSessionUsage } = await importWorkspaceUsage();

  const usage = computeSessionUsage([
    event(1, {
      type: 'token_usage',
      provider: 'claude',
      input_tokens: 10,
      output_tokens: 5,
      cache_read_tokens: 0,
      cache_creation_tokens: 0,
      output_tokens_per_second: 42.5,
    }),
  ]);

  assert.equal(usage.turnCount, 0);
  assert.equal(usage.totalOutputTokens, 0);
  assert.equal(usage.latestOutputTokensPerSecond, 42.5);
});
