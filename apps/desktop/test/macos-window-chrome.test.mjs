import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');
const tauriSrcDir = path.join(desktopDir, 'src-tauri', 'src');

test('macOS traffic light sync retries through minimize restore animation', async () => {
  const mainSource = await fs.readFile(path.join(tauriSrcDir, 'main.rs'), 'utf8');

  assert.match(
    mainSource,
    /const MACOS_TRAFFIC_LIGHT_SYNC_DELAYS:\s*\[u64;\s*4\]\s*=\s*\[0,\s*120,\s*320,\s*800\];/,
  );
  assert.match(
    mainSource,
    /RunEvent::Reopen[\s\S]*window\.show\(\)[\s\S]*window\.unminimize\(\)[\s\S]*window\.set_focus\(\)[\s\S]*schedule_macos_traffic_light_sync_series\(window,\s*"reopen"\)/,
  );
});

test('visible-window restore paths resync macOS traffic lights', async () => {
  const [mainSource, traySource, petNotificationSource] = await Promise.all([
    fs.readFile(path.join(tauriSrcDir, 'main.rs'), 'utf8'),
    fs.readFile(path.join(tauriSrcDir, 'tray.rs'), 'utf8'),
    fs.readFile(path.join(tauriSrcDir, 'pet_notifications.rs'), 'utf8'),
  ]);

  assert.match(
    mainSource,
    /main_window\.show\(\)[\s\S]*main_window\.set_focus\(\)[\s\S]*main_window\.app_handle\(\)\.get_webview_window\("main"\)[\s\S]*schedule_macos_traffic_light_sync_series\(main_webview_window,\s*"boot show"\)/,
  );
  assert.match(
    traySource,
    /"open_window"[\s\S]*window\.show\(\)[\s\S]*window\.unminimize\(\)[\s\S]*window\.set_focus\(\)[\s\S]*resync_main_window_chrome\(&window,\s*"tray open"\)/,
  );
  assert.match(
    traySource,
    /"settings"[\s\S]*window\.show\(\)[\s\S]*window\.unminimize\(\)[\s\S]*window\.set_focus\(\)[\s\S]*resync_main_window_chrome\(&window,\s*"tray settings"\)/,
  );
  assert.match(
    petNotificationSource,
    /main_window\.show\(\)[\s\S]*main_window\.unminimize\(\)[\s\S]*main_window\.set_focus\(\)[\s\S]*schedule_macos_traffic_light_sync_series\(\s*main_window\.clone\(\),\s*"pet notification restore",\s*\)/,
  );
});
