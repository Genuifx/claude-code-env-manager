import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

test('scroll area viewport hides native browser scrollbars from app CSS', async () => {
  const component = await fs.readFile(
    path.join(desktopDir, 'src', 'components', 'ui', 'scroll-area.tsx'),
    'utf8',
  );
  const styles = await fs.readFile(path.join(desktopDir, 'src', 'index.css'), 'utf8');

  assert.match(component, /ccem-scroll-area-viewport/);
  assert.match(styles, /\.ccem-scroll-area-viewport\s*\{/);
  assert.match(styles, /scrollbar-width:\s*none/);
  assert.match(styles, /\.ccem-scroll-area-viewport::\-webkit-scrollbar\s*\{/);
  assert.match(styles, /display:\s*none/);
});

test('radix inner wrapper override stays scoped to ccem scroll areas', async () => {
  const styles = await fs.readFile(path.join(desktopDir, 'src', 'index.css'), 'utf8');

  assert.match(
    styles,
    /\.ccem-scroll-area-viewport\s*>\s*div\s*\{/,
  );
  assert.doesNotMatch(
    styles,
    /\/\*[^*]*Radix ScrollArea[^*]*\*\/\s*\[data-radix-scroll-area-viewport\]\s*>\s*div\s*\{/,
  );
});

test('workspace virtualized transcript rows keep paint slop for left-edge glyphs', async () => {
  const styles = await fs.readFile(path.join(desktopDir, 'src', 'index.css'), 'utf8');

  assert.match(
    styles,
    /\.workspace-msg-virtualized,\s*\.workspace-tool-payload-virtualized,\s*\.workspace-tool-row-virtualized,\s*\.workspace-tool-digest-virtualized\s*\{[\s\S]*contain:\s*layout paint;/,
  );
  assert.match(
    styles,
    /\.workspace-msg-virtualized,\s*\.workspace-tool-row-virtualized,\s*\.workspace-tool-digest-virtualized\s*\{[\s\S]*margin-inline:\s*-2px;[\s\S]*padding-inline:\s*2px;/,
  );
});

test('fullscreen mac window controls stay centered in the titlebar row', async () => {
  const styles = await fs.readFile(path.join(desktopDir, 'src', 'index.css'), 'utf8');

  const readPixelVar = (name) => {
    const match = styles.match(new RegExp(`${name}:\\s*(\\d+)px`));
    assert.ok(match, `${name} should be declared as a px variable`);
    return Number(match[1]);
  };

  const titlebarHeight = readPixelVar('--ccem-titlebar-height');
  const controlCenter = readPixelVar('--ccem-titlebar-control-center-y');
  const controlSize = readPixelVar('--ccem-window-controls-size');
  const controlHalfSize = readPixelVar('--ccem-window-controls-half-size');
  const actionHalfSize = readPixelVar('--ccem-titlebar-action-half-size');
  const sidebarToggleSize = readPixelVar('--ccem-sidebar-toggle-size');
  const updateIndicatorSize = readPixelVar('--ccem-update-indicator-size');

  assert.equal(controlCenter, titlebarHeight / 2);
  assert.equal(controlHalfSize, controlSize / 2);
  assert.equal(actionHalfSize, sidebarToggleSize / 2);
  assert.equal(actionHalfSize, updateIndicatorSize / 2);
  assert.match(
    styles,
    /--ccem-window-controls-top:\s*calc\(\s*var\(--ccem-titlebar-control-center-y\)\s*-\s*var\(--ccem-window-controls-half-size\)\s*\);/,
  );
  assert.match(
    styles,
    /--ccem-titlebar-action-top:\s*calc\(\s*var\(--ccem-titlebar-control-center-y\)\s*-\s*var\(--ccem-titlebar-action-half-size\)\s*\);/,
  );
  assert.match(
    styles,
    /\.app-sidebar-toggle-anchor\s*\{[\s\S]*top:\s*var\(--ccem-titlebar-action-top\);/,
  );
  assert.match(
    styles,
    /\.app-update-indicator-anchor\s*\{[\s\S]*top:\s*var\(--ccem-titlebar-action-top\);/,
  );
  assert.match(
    styles,
    /\.app-titlebar-row\s*\{[\s\S]*padding-top:\s*0;/,
  );
  assert.match(
    styles,
    /\.mac-window-controls-button\s*\{[\s\S]*width:\s*var\(--ccem-window-controls-size\);[\s\S]*height:\s*var\(--ccem-window-controls-size\);/,
  );
});
