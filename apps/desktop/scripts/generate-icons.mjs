#!/usr/bin/env node
// Generate simple placeholder PNG icons for Tauri
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple CRC32 implementation
function crc32(buf) {
  let crc = 0xffffffff;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  const result = Buffer.alloc(4);
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
  return result;
}

// Create PNG with gradient
const createPNG = (size) => {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(6, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('IHDR'),
    ihdrData,
    ihdrCrc
  ]);

  const rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0);
    for (let x = 0; x < size; x++) {
      const r = Math.floor(100 + (x / size) * 55);
      const g = Math.floor(50 + (y / size) * 50);
      const b = Math.floor(180 + (x / size) * 75);
      rawData.push(r, g, b, 255);
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawData), { level: 9 });
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(compressed.length, 0);
  const idat = Buffer.concat([idatLen, Buffer.from('IDAT'), compressed, idatCrc]);

  const iendCrc = crc32(Buffer.from('IEND'));
  const iend = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from('IEND'), iendCrc]);

  return Buffer.concat([signature, ihdr, idat, iend]);
};

const iconsDir = path.join(__dirname, '../src-tauri/icons');

[32, 128, 256, 512].forEach(size => {
  fs.writeFileSync(path.join(iconsDir, `${size}x${size}.png`), createPNG(size));
  console.log(`Created ${size}x${size}.png`);
});

fs.writeFileSync(path.join(iconsDir, 'icon.png'), createPNG(512));
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), createPNG(256));
console.log('Created icon.png and 128x128@2x.png');
