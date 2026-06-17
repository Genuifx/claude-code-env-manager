import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconPath = path.resolve(__dirname, '../src-tauri/icons/icon.ico');

function readIcoEntries(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.readUInt16LE(0), 0, 'ico reserved field');
  assert.equal(buffer.readUInt16LE(2), 1, 'ico type');
  const count = buffer.readUInt16LE(4);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    const offset = 6 + index * 16;
    const width = buffer[offset] === 0 ? 256 : buffer[offset];
    const height = buffer[offset + 1] === 0 ? 256 : buffer[offset + 1];
    entries.push({ width, height });
  }
  return entries;
}

test('Windows icon contains multiple resolutions for shell shortcuts', () => {
  const entries = readIcoEntries(iconPath);
  const sizes = new Set(entries.map((entry) => `${entry.width}x${entry.height}`));

  for (const size of ['16x16', '24x24', '32x32', '48x48', '64x64', '256x256']) {
    assert.ok(sizes.has(size), `missing ${size} icon layer`);
  }
});
