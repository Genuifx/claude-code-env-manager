import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');

async function importImageInputModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-image-test-'));
  const outfile = path.join(tempDir, 'imageInputs.mjs');

  await build({
    entryPoints: [path.join(packageDir, 'src', 'imageInputs.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

function makeImagePart(sizeBytes = 100) {
  return {
    type: 'image',
    image: {
      mediaType: 'image/png',
      base64Data: Buffer.alloc(sizeBytes, 0x41).toString('base64'),
    },
  };
}

test('createLocalImageInputs writes temp files for image parts', async () => {
  const { createLocalImageInputs } = await importImageInputModule();

  const parts = [
    { type: 'text', text: 'hello' },
    makeImagePart(50),
    makeImagePart(60),
  ];

  const result = createLocalImageInputs(parts);
  assert.equal(result.inputs.length, 3);
  assert.equal(result.tempFiles.length, 2);
  assert.equal(result.inputs[0].type, 'text');
  assert.equal(result.inputs[1].type, 'local_image');
  assert.equal(result.inputs[2].type, 'local_image');

  // Verify files exist
  for (const f of result.tempFiles) {
    assert.ok(existsSync(f), `temp file ${f} should exist`);
  }

  // Cleanup
  for (const f of result.tempFiles) {
    try { await fs.unlink(f); } catch {}
  }
});

test('cleanupTempFiles deletes all created temp files', async () => {
  const { createLocalImageInputs, cleanupTempFiles } = await importImageInputModule();

  const parts = [makeImagePart(50), makeImagePart(60)];
  const result = createLocalImageInputs(parts);
  assert.equal(result.tempFiles.length, 2);

  // Verify files exist before cleanup
  for (const f of result.tempFiles) {
    assert.ok(existsSync(f));
  }

  // Cleanup
  cleanupTempFiles(result.tempFiles);

  // Verify files are deleted
  for (const f of result.tempFiles) {
    assert.ok(!existsSync(f), `temp file ${f} should be deleted`);
  }
});

test('cleanupTempFiles silently ignores already-deleted files', async () => {
  const { cleanupTempFiles } = await importImageInputModule();

  // Should not throw on non-existent files
  cleanupTempFiles(['/nonexistent/file1.png', '/nonexistent/file2.png']);
});

test('cleanupTempFiles runs in finally block when error is thrown', async () => {
  const { createLocalImageInputs, cleanupTempFiles } = await importImageInputModule();

  const parts = [makeImagePart(50), makeImagePart(60)];
  const result = createLocalImageInputs(parts);
  const tempFiles = result.tempFiles;

  // Simulate try/finally with error — verify cleanup runs before error propagates
  assert.throws(
    () => {
      try {
        throw new Error('simulated stream error');
      } finally {
        cleanupTempFiles(tempFiles);
      }
    },
    /simulated stream error/,
  );

  // Verify files are deleted despite the error
  for (const f of tempFiles) {
    assert.ok(!existsSync(f), `temp file ${f} should be deleted after error`);
  }
});

test('cleanupTempFiles runs in finally block when abort is signaled', async () => {
  const { createLocalImageInputs, cleanupTempFiles } = await importImageInputModule();

  const parts = [makeImagePart(50)];
  const result = createLocalImageInputs(parts);
  const tempFiles = result.tempFiles;

  // Simulate try/finally with abort error
  assert.throws(
    () => {
      try {
        const err = new Error('aborted');
        err.name = 'AbortError';
        throw err;
      } finally {
        cleanupTempFiles(tempFiles);
      }
    },
    /aborted/,
  );

  // Verify files are deleted despite the abort
  for (const f of tempFiles) {
    assert.ok(!existsSync(f), `temp file ${f} should be deleted after abort`);
  }
});

test('createLocalImageInputs rejects single image exceeding size limit', async () => {
  const { createLocalImageInputs, MAX_SINGLE_IMAGE_BYTES } = await importImageInputModule();

  // Create base64 that decodes to > MAX_SINGLE_IMAGE_BYTES
  const oversizedBase64 = Buffer.alloc(MAX_SINGLE_IMAGE_BYTES + 1024, 0x41).toString('base64');
  const parts = [{
    type: 'image',
    image: { mediaType: 'image/png', base64Data: oversizedBase64 },
  }];

  assert.throws(
    () => createLocalImageInputs(parts),
    /exceeds max size/i,
  );
});

test('createLocalImageInputs rejects total image size exceeding limit', async () => {
  const { createLocalImageInputs, MAX_SINGLE_IMAGE_BYTES, MAX_TOTAL_IMAGE_BYTES } = await importImageInputModule();

  // Each image just under the single limit (29.999MB), enough images to exceed total (300MB)
  // ceil(300MB / 29.999MB) + 1 = 11 images
  const singleSize = MAX_SINGLE_IMAGE_BYTES - 1024;
  const numImages = Math.ceil((MAX_TOTAL_IMAGE_BYTES + 1024) / singleSize);
  const imgBase64 = Buffer.alloc(singleSize, 0x41).toString('base64');
  const parts = Array.from({ length: numImages }, () => ({
    type: 'image',
    image: { mediaType: 'image/png', base64Data: imgBase64 },
  }));

  assert.throws(
    () => createLocalImageInputs(parts),
    /total image size exceeds limit/i,
  );
});

test('createLocalImageInputs cleans up already-written files when an error occurs mid-batch', async () => {
  const { createLocalImageInputs, MAX_SINGLE_IMAGE_BYTES } = await importImageInputModule();
  const { existsSync, readdirSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');

  const imagesDir = join(tmpdir(), 'ccem-images');
  // Snapshot files before the call
  const filesBefore = new Set(existsSync(imagesDir) ? readdirSync(imagesDir) : []);

  // First image: valid small image → gets written to disk
  // Second image: exceeds single limit → throws before write
  const parts = [
    { type: 'image', image: { mediaType: 'image/png', base64Data: Buffer.alloc(1024, 0x41).toString('base64') } },
    { type: 'image', image: { mediaType: 'image/png', base64Data: Buffer.alloc(MAX_SINGLE_IMAGE_BYTES + 1024, 0x41).toString('base64') } },
  ];

  // Should throw
  assert.throws(
    () => createLocalImageInputs(parts),
    /exceeds max size/i,
  );

  // Verify no new files leaked in the temp dir
  const filesAfter = existsSync(imagesDir) ? readdirSync(imagesDir) : [];
  const newFiles = filesAfter.filter(f => !filesBefore.has(f));
  assert.equal(newFiles.length, 0, `No temp files should leak after error; found: ${newFiles.join(', ')}`);
});

test('createLocalImageInputs handles text-only parts without creating files', async () => {
  const { createLocalImageInputs } = await importImageInputModule();

  const parts = [
    { type: 'text', text: 'hello' },
    { type: 'text', text: 'world' },
  ];

  const result = createLocalImageInputs(parts);
  assert.equal(result.inputs.length, 2);
  assert.equal(result.tempFiles.length, 0);
});

test('temp files are cleaned up even when some files fail to delete', async () => {
  const { createLocalImageInputs, cleanupTempFiles } = await importImageInputModule();

  const parts = [makeImagePart(50)];
  const result = createLocalImageInputs(parts);

  // Pre-delete the file, then cleanup — should not throw
  await fs.unlink(result.tempFiles[0]);
  cleanupTempFiles(result.tempFiles); // should not throw
});
