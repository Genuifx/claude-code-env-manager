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

test('radix inner wrapper override stays scoped to workspace transcripts', async () => {
  const styles = await fs.readFile(path.join(desktopDir, 'src', 'index.css'), 'utf8');

  assert.match(
    styles,
    /\.workspace-transcript-scroll\s+\[data-radix-scroll-area-viewport\]\s*>\s*div\s*\{/,
  );
  assert.doesNotMatch(
    styles,
    /\/\*[^*]*Radix ScrollArea[^*]*\*\/\s*\[data-radix-scroll-area-viewport\]\s*>\s*div\s*\{/,
  );
});
