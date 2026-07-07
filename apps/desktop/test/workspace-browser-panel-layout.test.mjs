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
    'browserPanelLayout.ts',
  );
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-browser-panel-layout-'));
  const outputPath = path.join(tempDir, 'browserPanelLayout.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('browser sidebar width clamps to the supported range', async () => {
  const {
    BROWSER_PANEL_DEFAULT_WIDTH_PERCENT,
    BROWSER_PANEL_MAX_WIDTH_PERCENT,
    BROWSER_PANEL_MIN_WIDTH_PERCENT,
    clampBrowserPanelWidthPercent,
  } = await importLayoutModule();

  assert.equal(BROWSER_PANEL_DEFAULT_WIDTH_PERCENT, 50);
  assert.equal(BROWSER_PANEL_MAX_WIDTH_PERCENT, 60);
  assert.equal(BROWSER_PANEL_MIN_WIDTH_PERCENT, 30);
  assert.equal(clampBrowserPanelWidthPercent('70'), 60);
  assert.equal(clampBrowserPanelWidthPercent(12), 30);
  assert.equal(clampBrowserPanelWidthPercent('not-a-width'), 50);
});

test('browser sidebar resize derives width from the left border drag point', async () => {
  const { calculateBrowserPanelWidthPercent } = await importLayoutModule();

  assert.equal(calculateBrowserPanelWidthPercent({
    layoutWidth: 1000,
    layoutRight: 1000,
    pointerClientX: 500,
  }), 50);

  assert.equal(calculateBrowserPanelWidthPercent({
    layoutWidth: 1000,
    layoutRight: 1000,
    pointerClientX: 200,
  }), 60);

  assert.equal(calculateBrowserPanelWidthPercent({
    layoutWidth: 1000,
    layoutRight: 1000,
    pointerClientX: 850,
  }), 30);
});
