import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importWorkspaceCronCommand() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-cron-command-test-'));
  const outfile = path.join(tempDir, 'workspaceCronCommand.mjs');

  await build({
    entryPoints: [path.join(desktopDir, 'src', 'components', 'workspace', 'workspaceCronCommand.ts')],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

async function importComposerCapabilities() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-composer-capabilities-test-'));
  const outfile = path.join(tempDir, 'composerCapabilities.mjs');

  await build({
    entryPoints: [path.join(desktopDir, 'src', 'components', 'workspace', 'composerCapabilities.ts')],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

test('parses /ccem-cron workspace command into a scheduled GitHub pull task', async () => {
  const { parseWorkspaceCronCommand } = await importWorkspaceCronCommand();

  const draft = parseWorkspaceCronCommand(
    '/ccem-cron 每天早中晚都主动拉取一下最新的github代码',
    '/Users/wzt/G/Github/claude-code-env-manager',
  );

  assert.deepEqual(draft, {
    name: '拉取最新 GitHub 代码',
    cronExpression: '0 8,12,18 * * *',
    prompt: '请在当前工作区主动拉取最新的 GitHub 代码。执行前先检查当前分支和未提交改动；如存在会被覆盖的本地改动或合并冲突风险，请停止并报告，不要强制覆盖。',
    workingDir: '/Users/wzt/G/Github/claude-code-env-manager',
    executionProfile: 'standard',
  });
});

test('ignores normal workspace prompts and empty cron commands', async () => {
  const { isWorkspaceCronCommand, parseWorkspaceCronCommand } = await importWorkspaceCronCommand();

  assert.equal(parseWorkspaceCronCommand('帮我看下状态', '/tmp/project'), null);
  assert.equal(parseWorkspaceCronCommand('/ccem-cron', '/tmp/project'), null);
  assert.equal(parseWorkspaceCronCommand('/ccem-cron   ', '/tmp/project'), null);
  assert.equal(parseWorkspaceCronCommand('/ccem-cron 每天检查一下', null), null);
  assert.equal(isWorkspaceCronCommand('/ccem-cronology 每天检查一下'), false);
});

test('/ccem-cron is available as a workspace slash command for both providers', async () => {
  const { getComposerCapabilities } = await importComposerCapabilities();

  for (const provider of ['claude', 'codex']) {
    assert.ok(
      getComposerCapabilities(provider).commands.some((command) => command.token === '/ccem-cron'),
      `${provider} should expose /ccem-cron`,
    );
  }
});
