import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

test('tauri devUrl uses an IPv4 loopback host', async () => {
  const tauriConfigPath = path.join(desktopDir, 'src-tauri', 'tauri.conf.json');
  const tauriConfig = JSON.parse(await fs.readFile(tauriConfigPath, 'utf8'));

  assert.equal(tauriConfig.build.devUrl, 'http://127.0.0.1:1421');
});

test('vite dev server binds an IPv4 loopback host', async () => {
  const viteConfigPath = path.join(desktopDir, 'vite.config.ts');
  const viteConfig = await fs.readFile(viteConfigPath, 'utf8');

  assert.match(viteConfig, /host:\s*['"]127\.0\.0\.1['"]/);
});
