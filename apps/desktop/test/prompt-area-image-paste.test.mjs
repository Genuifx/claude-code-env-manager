import test from 'node:test';
import assert from 'node:assert/strict';
import { File } from 'node:buffer';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importPromptAreaEvents() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-prompt-area-events-test-'));
  const outfile = path.join(tempDir, 'use-prompt-area-events.mjs');

  await build({
    entryPoints: [path.join(desktopDir, 'src', 'components', 'use-prompt-area-events.ts')],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

function imageFile(name, type = 'image/png') {
  return new File([new Uint8Array([1, 2, 3])], name, { type, lastModified: 1 });
}

function item(file) {
  return {
    type: file.type,
    getAsFile: () => file,
  };
}

test('collects every image provided by clipboard files', async () => {
  const { collectClipboardImageFiles } = await importPromptAreaEvents();
  const first = imageFile('first.png');
  const second = imageFile('second.webp', 'image/webp');
  const textFile = new File(['hello'], 'note.txt', { type: 'text/plain' });

  assert.deepEqual(
    collectClipboardImageFiles([first, textFile, second], []),
    [first, second],
  );
});

test('falls back to clipboard items for screenshot-style image paste', async () => {
  const { collectClipboardImageFiles } = await importPromptAreaEvents();
  const first = imageFile('screenshot.png');
  const second = imageFile('capture.jpeg', 'image/jpeg');

  assert.deepEqual(
    collectClipboardImageFiles([], [
      { type: 'text/plain', getAsFile: () => null },
      item(first),
      item(second),
    ]),
    [first, second],
  );
});

test('uses clipboard files as the authoritative source when files and items both exist', async () => {
  const { collectClipboardImageFiles } = await importPromptAreaEvents();
  const fileImage = imageFile('from-files.png');
  const itemImage = imageFile('from-items.png');

  assert.deepEqual(
    collectClipboardImageFiles([fileImage], [item(itemImage)]),
    [fileImage],
  );
});
