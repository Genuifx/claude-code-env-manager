import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importMarkdownCodeBlocks() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'history', 'markdownCodeBlocks.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-markdown-renderer-test-'));
  const outputPath = path.join(tempDir, 'markdownCodeBlocks.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('no-language fenced and indented markdown code blocks stay block-level', async () => {
  const { isMarkdownCodeBlock } = await importMarkdownCodeBlocks();

  assert.equal(isMarkdownCodeBlock(undefined, 'inline code'), false);
  assert.equal(isMarkdownCodeBlock(undefined, 'single fenced line\n'), true);
  assert.equal(isMarkdownCodeBlock(undefined, 'first line\nsecond line\n'), true);
  assert.equal(isMarkdownCodeBlock('language-ts', 'const value = 1;'), true);
});
