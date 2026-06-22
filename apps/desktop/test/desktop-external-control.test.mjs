import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');
const tauriDir = path.join(desktopDir, 'src-tauri');

test('desktop registers the external control server on startup', async () => {
  const mainSource = await fs.readFile(path.join(tauriDir, 'src', 'main.rs'), 'utf8');
  const controlSource = await fs.readFile(path.join(tauriDir, 'src', 'external_control.rs'), 'utf8');
  const appSource = await fs.readFile(path.join(desktopDir, 'src', 'App.tsx'), 'utf8');
  const cargoSource = await fs.readFile(path.join(tauriDir, 'Cargo.toml'), 'utf8');

  assert.match(mainSource, /mod external_control;/);
  assert.match(mainSource, /ExternalControlManager::new/);
  assert.match(mainSource, /external_control_manager_for_setup\.start/);
  assert.match(controlSource, /ccem-control-request/);
  assert.match(appSource, /ccem-control-request/);
  assert.match(cargoSource, /rand = /);
});
