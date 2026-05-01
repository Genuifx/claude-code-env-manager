import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importComposerAttachments() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'composerAttachments.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-composer-placeholder-test-'));
  const outputPath = path.join(tempDir, 'composerAttachments.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('splits image placeholders for highlighted composer rendering', async () => {
  const { splitComposerImagePlaceholders } = await importComposerAttachments();

  assert.deepEqual(splitComposerImagePlaceholders('这是啥 [Image #1] 然后 [Image #2]'), [
    { kind: 'text', text: '这是啥 ' },
    { kind: 'image', text: '[Image #1]' },
    { kind: 'text', text: ' 然后 ' },
    { kind: 'image', text: '[Image #2]' },
  ]);
});
