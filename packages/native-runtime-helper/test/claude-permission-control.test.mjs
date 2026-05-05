import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');

async function importClaudePermissionControlModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-claude-permission-control-test-'));
  const outfile = path.join(tempDir, 'claudePermissionControl.mjs');

  await build({
    entryPoints: [path.join(packageDir, 'src', 'claudePermissionControl.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

test('updates an active Claude Agent SDK query into plan mode', async () => {
  const { applyClaudePermissionModeToQuery } = await importClaudePermissionControlModule();
  const calls = [];
  const query = {
    async setPermissionMode(mode) {
      calls.push(mode);
    },
  };

  const permission = await applyClaudePermissionModeToQuery(query, 'plan');

  assert.deepEqual(calls, ['plan']);
  assert.deepEqual(permission, {
    permissionMode: 'plan',
    allowDangerouslySkipPermissions: false,
  });
});

test('restores the active Claude Agent SDK query to the underlying permission mode', async () => {
  const { applyClaudePermissionModeToQuery } = await importClaudePermissionControlModule();
  const calls = [];
  const query = {
    async setPermissionMode(mode) {
      calls.push(mode);
    },
  };

  const permission = await applyClaudePermissionModeToQuery(query, 'yolo');

  assert.deepEqual(calls, ['bypassPermissions']);
  assert.deepEqual(permission, {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
  });
});
