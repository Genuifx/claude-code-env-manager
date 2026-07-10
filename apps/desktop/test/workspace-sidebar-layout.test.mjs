import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importLayoutModule() {
  const sourcePath = path.join(
    desktopDir,
    'src',
    'components',
    'workspace',
    'workspaceSidebarLayout.ts',
  );
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-sidebar-layout-'));
  const outputPath = path.join(tempDir, 'workspaceSidebarLayout.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('workspace sidebar width clamps to the supported range', async () => {
  const {
    WORKSPACE_SIDEBAR_DEFAULT_WIDTH_PX,
    WORKSPACE_SIDEBAR_MAX_WIDTH_PX,
    WORKSPACE_SIDEBAR_MIN_WIDTH_PX,
    clampWorkspaceSidebarWidth,
  } = await importLayoutModule();

  assert.equal(WORKSPACE_SIDEBAR_DEFAULT_WIDTH_PX, 280);
  assert.equal(WORKSPACE_SIDEBAR_MAX_WIDTH_PX, 420);
  assert.equal(WORKSPACE_SIDEBAR_MIN_WIDTH_PX, 220);
  assert.equal(clampWorkspaceSidebarWidth('500'), 420);
  assert.equal(clampWorkspaceSidebarWidth(120), 220);
  assert.equal(clampWorkspaceSidebarWidth('not-a-width'), 280);
});

test('workspace sidebar resize derives width from the right border drag point', async () => {
  const { calculateWorkspaceSidebarWidth } = await importLayoutModule();

  assert.equal(calculateWorkspaceSidebarWidth({ layoutLeft: 20, pointerClientX: 300 }), 280);
  assert.equal(calculateWorkspaceSidebarWidth({ layoutLeft: 20, pointerClientX: 900 }), 420);
  assert.equal(calculateWorkspaceSidebarWidth({ layoutLeft: 20, pointerClientX: 100 }), 220);
});
