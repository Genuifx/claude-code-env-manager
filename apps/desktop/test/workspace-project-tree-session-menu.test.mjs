import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');
const projectTreePath = path.join(desktopDir, 'src', 'components', 'workspace', 'ProjectTree.tsx');

test('ProjectTree exposes a session context menu for copying ids and ccem links', async () => {
  const source = await fs.readFile(projectTreePath, 'utf8');

  assert.match(source, /DropdownMenu/);
  assert.match(source, /buildCcemSessionLink/);
  assert.match(source, /onContextMenu=\{/);
  assert.match(source, /workspace\.copySessionId/);
  assert.match(source, /workspace\.copySessionLink/);
  assert.match(source, /navigator\.clipboard\.writeText/);
});
