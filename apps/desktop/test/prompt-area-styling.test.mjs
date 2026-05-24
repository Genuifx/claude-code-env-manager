import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

test('prompt area editor wraps long input without horizontal scrolling', async () => {
  const component = await fs.readFile(
    path.join(desktopDir, 'src', 'components', 'prompt-area.tsx'),
    'utf8',
  );

  assert.match(component, /overflow-x-hidden/);
  assert.match(component, /\[overflow-wrap:anywhere\]/);
  assert.match(component, /\[word-break:break-word\]/);
});
