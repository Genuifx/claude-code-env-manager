import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importTranscriptWindow() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'workspaceTranscriptWindow.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-transcript-window-test-'));
  const outputPath = path.join(tempDir, 'workspaceTranscriptWindow.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('initial transcript render count is capped to the first batch', async () => {
  const { getInitialTranscriptRenderCount } = await importTranscriptWindow();

  assert.equal(getInitialTranscriptRenderCount(120, 48), 48);
  assert.equal(getInitialTranscriptRenderCount(12, 48), 12);
  assert.equal(getInitialTranscriptRenderCount(12, 0), 0);
});

test('latest transcript window keeps the newest messages visible first', async () => {
  const { getLatestTranscriptWindow } = await importTranscriptWindow();
  const messages = Array.from({ length: 8 }, (_, index) => `message-${index + 1}`);

  assert.deepEqual(getLatestTranscriptWindow(messages, 3), [
    'message-6',
    'message-7',
    'message-8',
  ]);
  assert.deepEqual(getLatestTranscriptWindow(messages, 20), messages);
});
