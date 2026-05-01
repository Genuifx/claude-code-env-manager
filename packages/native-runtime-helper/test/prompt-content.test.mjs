import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');

async function importPromptContentModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-prompt-content-test-'));
  const outfile = path.join(tempDir, 'prompt-content.mjs');

  await build({
    entryPoints: [path.join(packageDir, 'src', 'promptContent.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

const image = (label, placeholder) => ({
  mediaType: 'image/png',
  base64Data: label,
  placeholder,
});

test('interleaves prompt images at their text placeholders', async () => {
  const { buildPromptContentParts } = await importPromptContentModule();

  const parts = buildPromptContentParts('先看 [Image #2] 再看 [Image #1]', [
    image('one', '[Image #1]'),
    image('two', '[Image #2]'),
  ]);

  assert.deepEqual(parts, [
    { type: 'text', text: '先看' },
    { type: 'image', image: image('two', '[Image #2]') },
    { type: 'text', text: '再看' },
    { type: 'image', image: image('one', '[Image #1]') },
  ]);
});

test('appends unmatched images after the remaining prompt text', async () => {
  const { buildPromptContentParts } = await importPromptContentModule();

  const parts = buildPromptContentParts('解释这段文字', [
    image('one', '[Image #1]'),
  ]);

  assert.deepEqual(parts, [
    { type: 'text', text: '解释这段文字' },
    { type: 'image', image: image('one', '[Image #1]') },
  ]);
});
