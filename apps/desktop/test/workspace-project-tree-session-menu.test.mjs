import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');
const projectTreePath = path.join(desktopDir, 'src', 'components', 'workspace', 'ProjectTree.tsx');

test('ProjectTree keeps left-click session selection separate from the shadcn context menu', async () => {
  const source = await fs.readFile(projectTreePath, 'utf8');

  assert.match(source, /ContextMenu/);
  assert.match(source, /ContextMenuTrigger asChild/);
  assert.match(source, /ContextMenuContent/);
  assert.match(source, /onClick=\{\(\) => onSelect\(session\)\}/);
  assert.match(source, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.doesNotMatch(source, /onContextMenu\s*=/);
  assert.doesNotMatch(source, /DropdownMenu/);
});

test('ProjectTree exposes context menu copy actions for ids and ccem links', async () => {
  const source = await fs.readFile(projectTreePath, 'utf8');

  assert.match(source, /buildCcemSessionLinkForHistorySession/);
  assert.match(source, /ContextMenuItem/);
  assert.match(source, /workspace\.copySessionId/);
  assert.match(source, /workspace\.copySessionLink/);
  assert.match(source, /navigator\.clipboard\.writeText/);
});
