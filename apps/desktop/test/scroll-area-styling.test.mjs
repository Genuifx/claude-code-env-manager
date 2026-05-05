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

test('fullscreen mac window controls stay centered in the titlebar row', async () => {
  const styles = await fs.readFile(path.join(desktopDir, 'src', 'index.css'), 'utf8');

  const readPixelVar = (name) => {
    const match = styles.match(new RegExp(`${name}:\\s*(\\d+)px`));
    assert.ok(match, `${name} should be declared as a px variable`);
    return Number(match[1]);
  };

  const titlebarHeight = readPixelVar('--ccem-titlebar-height');
  const controlSize = readPixelVar('--ccem-window-controls-size');
  const controlTop = readPixelVar('--ccem-window-controls-top');

  assert.equal(controlTop, (titlebarHeight - controlSize) / 2);
  assert.match(
    styles,
    /\.mac-window-controls-button\s*\{[\s\S]*width:\s*var\(--ccem-window-controls-size\);[\s\S]*height:\s*var\(--ccem-window-controls-size\);/,
  );
});
