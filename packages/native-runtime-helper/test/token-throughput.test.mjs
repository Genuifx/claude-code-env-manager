import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');

async function importTokenThroughputModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-token-throughput-test-'));
  const outfile = path.join(tempDir, 'tokenThroughput.mjs');
  await build({
    entryPoints: [path.join(packageDir, 'src', 'tokenThroughput.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
  });
  return import(pathToFileURL(outfile).href);
}

test('computes output token speed from the first-token generation window', async () => {
  const { buildOutputTokenThroughput } = await importTokenThroughputModule();

  assert.deepEqual(
    buildOutputTokenThroughput({
      outputTokens: 120,
      startedAtMs: 1_000,
      firstOutputAtMs: 1_500,
      completedAtMs: 4_500,
    }),
    {
      first_token_ms: 500,
      output_duration_ms: 3_000,
      output_tokens_per_second: 40,
    },
  );
});

test('falls back to total stream duration before first output is observed', async () => {
  const { buildOutputTokenThroughput } = await importTokenThroughputModule();

  assert.deepEqual(
    buildOutputTokenThroughput({
      outputTokens: 120,
      startedAtMs: 1_000,
      firstOutputAtMs: null,
      completedAtMs: 5_000,
    }),
    {
      first_token_ms: null,
      output_duration_ms: 4_000,
      output_tokens_per_second: 30,
    },
  );
});

test('omits token speed when the output or duration is not usable', async () => {
  const { buildOutputTokenThroughput } = await importTokenThroughputModule();

  assert.deepEqual(
    buildOutputTokenThroughput({
      outputTokens: 0,
      startedAtMs: 1_000,
      firstOutputAtMs: 1_500,
      completedAtMs: 4_500,
    }),
    {
      first_token_ms: 500,
      output_duration_ms: 3_000,
      output_tokens_per_second: null,
    },
  );
});
