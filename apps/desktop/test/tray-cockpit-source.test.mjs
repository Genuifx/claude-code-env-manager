import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');
const sourceDir = path.join(desktopDir, 'src');
const tauriSrcDir = path.join(desktopDir, 'src-tauri', 'src');

test('tray cockpit owns left-click while preserving the native context menu', async () => {
  const [traySource, mainSource, entrySource, appSource, capabilitySource, cssSource, cockpitSource] =
    await Promise.all([
      fs.readFile(path.join(tauriSrcDir, 'tray.rs'), 'utf8'),
      fs.readFile(path.join(tauriSrcDir, 'main.rs'), 'utf8'),
      fs.readFile(path.join(sourceDir, 'main.tsx'), 'utf8'),
      fs.readFile(path.join(sourceDir, 'App.tsx'), 'utf8'),
      fs.readFile(path.join(desktopDir, 'src-tauri', 'capabilities', 'default.json'), 'utf8'),
      fs.readFile(path.join(sourceDir, 'index.css'), 'utf8'),
      fs.readFile(path.join(sourceDir, 'pages', 'TrayCockpit.tsx'), 'utf8'),
    ]);

  const capabilities = JSON.parse(capabilitySource);

  assert.match(traySource, /pub const TRAY_COCKPIT_LABEL: &str = "tray-cockpit"/);
  assert.match(traySource, /\.show_menu_on_left_click\(false\)/);
  assert.match(
    traySource,
    /on_tray_icon_event[\s\S]*MouseButton::Left[\s\S]*MouseButtonState::Up[\s\S]*toggle_tray_cockpit/,
  );
  assert.match(traySource, /WebviewWindowBuilder::new[\s\S]*TRAY_COCKPIT_LABEL[\s\S]*index\.html\?window=tray-cockpit/);
  assert.match(traySource, /const TRAY_COCKPIT_PANEL_WIDTH: f64 = 390\.0/);
  assert.match(traySource, /const TRAY_COCKPIT_PANEL_HEIGHT: f64 = 700\.0/);
  assert.match(traySource, /const TRAY_COCKPIT_SHADOW_MARGIN: f64 = 64\.0/);
  assert.match(traySource, /const TRAY_COCKPIT_WIDTH: f64 = TRAY_COCKPIT_PANEL_WIDTH \+ TRAY_COCKPIT_SHADOW_MARGIN \* 2\.0/);
  assert.match(traySource, /inner_size\(TRAY_COCKPIT_WIDTH, TRAY_COCKPIT_HEIGHT\)/);
  assert.match(traySource, /#\[tauri::command\][\s\S]*pub fn open_tray_cockpit/);

  assert.match(mainSource, /use tray::\{create_tray, TRAY_COCKPIT_LABEL\}/);
  assert.match(mainSource, /tray::open_tray_cockpit/);
  assert.match(mainSource, /window\.label\(\) == TRAY_COCKPIT_LABEL[\s\S]*api\.prevent_close\(\)[\s\S]*hide_tray_cockpit/);
  assert.match(entrySource, /label === 'tray-cockpit'[\s\S]*return TrayCockpit/);
  assert.match(entrySource, /requestedWindow === 'tray-cockpit'[\s\S]*return TrayCockpit/);
  assert.match(appSource, /listen<TrayOpenTabRequest>\('tray-open-tab'[\s\S]*navigateToTab\(event\.payload\.tab\)/);
  assert.deepEqual(capabilities.windows, ['main', 'desktop-pet', 'tray-cockpit']);
  for (const permission of [
    'core:window:allow-hide',
    'core:window:allow-set-focus',
    'core:window:allow-show',
    'core:window:allow-unminimize',
  ]) {
    assert.ok(capabilities.permissions.includes(permission), `${permission} is required for tray dock actions`);
  }

  assert.match(cssSource, /html\[data-window='tray-cockpit'\]/);
  assert.match(cssSource, /@keyframes tray-cockpit-enter/);
  assert.match(cssSource, /@keyframes tray-chart-draw/);
  assert.match(cssSource, /@keyframes tray-bar-sweep/);
  assert.match(cssSource, /prefers-reduced-motion/);
  assert.match(cssSource, /tray-logo-image/);
  assert.match(cockpitSource, /function StatStrip/);
  assert.match(cockpitSource, /function ActivityChart/);
  assert.match(cockpitSource, /function ProviderSplit/);
  assert.match(cockpitSource, /function HealthRow/);
  assert.match(cockpitSource, /function TrayLogo/);
  assert.match(cockpitSource, /previewTheme === 'dark' \|\| previewTheme === 'light'/);
  assert.match(cockpitSource, /src="\/logo_preview\.png"/);
  assert.match(cockpitSource, /alt="CCEM"/);
  assert.doesNotMatch(cockpitSource, /<svg className="tray-logo-mark/);
  assert.match(cockpitSource, /tray-logo-ring/);
  assert.match(cockpitSource, /tray-chart-line/);
  assert.match(cockpitSource, /tray-provider-bar/);
  assert.match(cockpitSource, /tray-dock-button/);
  assert.match(cockpitSource, /invoke<UsageStats>\('get_usage_stats'\)/);
  assert.match(cockpitSource, /invoke<CronTask\[]>\('list_cron_tasks'\)/);
  assert.match(cockpitSource, /WebviewWindow\.getByLabel\('main'\)/);
  assert.match(cockpitSource, /emit\('tray-open-tab'/);
});
