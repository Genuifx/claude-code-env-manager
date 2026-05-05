import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');

async function importPermissionModesModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-runtime-permission-test-'));
  const outfile = path.join(tempDir, 'permissionModes.mjs');

  await build({
    entryPoints: [path.join(packageDir, 'src', 'permissionModes.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

test('maps ccem permission names to Claude Agent SDK permission modes', async () => {
  const { normalizeClaudePermissionMode } = await importPermissionModesModule();

  assert.deepEqual(normalizeClaudePermissionMode('yolo'), {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
  });
  assert.deepEqual(normalizeClaudePermissionMode('dev'), {
    permissionMode: 'acceptEdits',
    allowDangerouslySkipPermissions: false,
  });
  assert.deepEqual(normalizeClaudePermissionMode('readonly'), {
    permissionMode: 'plan',
    allowDangerouslySkipPermissions: false,
  });
  assert.deepEqual(normalizeClaudePermissionMode('safe'), {
    permissionMode: 'default',
    allowDangerouslySkipPermissions: false,
  });
});

test('passes persisted Claude plan sessions through as plan mode', async () => {
  const { normalizeClaudePermissionMode } = await importPermissionModesModule();

  assert.deepEqual(normalizeClaudePermissionMode('plan'), {
    permissionMode: 'plan',
    allowDangerouslySkipPermissions: false,
  });
});
