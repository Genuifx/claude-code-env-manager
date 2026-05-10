import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importDomHelpers() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-prompt-area-chip-test-'));
  const outfile = path.join(tempDir, 'dom-helpers.mjs');

  await build({
    entryPoints: [path.join(desktopDir, 'src', 'components', 'dom-helpers.ts')],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

test('triggerless image chips are valid prompt-area chips', async () => {
  const { createChipSegmentFromParts } = await importDomHelpers();

  assert.deepEqual(
    createChipSegmentFromParts(
      '',
      '[Image #1]',
      '[Image #1]',
      { kind: 'image', attachmentId: 'attachment-image-1', placeholder: '[Image #1]' },
      false,
    ),
    {
      type: 'chip',
      trigger: '',
      value: '[Image #1]',
      displayText: '[Image #1]',
      data: { kind: 'image', attachmentId: 'attachment-image-1', placeholder: '[Image #1]' },
    },
  );

  assert.equal(
    createChipSegmentFromParts(undefined, '[Image #1]', '[Image #1]'),
    null,
  );
});
