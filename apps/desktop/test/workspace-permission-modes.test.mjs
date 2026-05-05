import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importWorkspacePermissionModes() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'workspacePermissionModes.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-permission-test-'));
  const outputPath = path.join(tempDir, 'workspacePermissionModes.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('keeps Claude plan sessions distinct from read-only permission mode', async () => {
  const {
    getWorkspacePermissionModeDisplayName,
    normalizeWorkspacePermissionModeName,
  } = await importWorkspacePermissionModes();

  assert.equal(normalizeWorkspacePermissionModeName('plan'), 'plan');
  assert.equal(getWorkspacePermissionModeDisplayName('plan'), 'Plan');
  assert.notEqual(normalizeWorkspacePermissionModeName('plan'), 'readonly');
});

test('normalizes runtime permission aliases back to ccem permission names', async () => {
  const { normalizeWorkspacePermissionModeName } = await importWorkspacePermissionModes();

  assert.equal(normalizeWorkspacePermissionModeName('bypassPermissions'), 'yolo');
  assert.equal(normalizeWorkspacePermissionModeName('acceptEdits'), 'dev');
  assert.equal(normalizeWorkspacePermissionModeName('read-only'), 'readonly');
  assert.equal(normalizeWorkspacePermissionModeName('unknown-mode'), 'dev');
});
