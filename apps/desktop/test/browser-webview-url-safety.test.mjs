import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const desktopDir = path.resolve(import.meta.dirname, '..');

test('browser backend avoids Wry webview.url because it can panic on empty WKWebView URLs', async () => {
  const browserSource = await fs.readFile(
    path.join(desktopDir, 'src-tauri', 'src', 'browser.rs'),
    'utf8',
  );

  assert.doesNotMatch(browserSource, /\.url\(\)/);
  assert.match(browserSource, /fn browser_page_metadata\(webview: &tauri::Webview\)/);
  assert.match(browserSource, /\.URL\(\)[\s\S]*\.and_then\(\|url\| url\.absoluteString\(\)\)/);
  assert.match(browserSource, /current_url: Option<String>/);
  assert.match(browserSource, /record_browser_page_metadata/);
});
