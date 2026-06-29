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

test('prompt area uses a zero-width inline sentinel for trailing newlines', async () => {
  const promptAreaHook = await fs.readFile(
    path.join(desktopDir, 'src', 'components', 'use-prompt-area.ts'),
    'utf8',
  );
  const domHelpers = await fs.readFile(
    path.join(desktopDir, 'src', 'components', 'dom-helpers.ts'),
    'utf8',
  );
  const css = await fs.readFile(
    path.join(desktopDir, 'src', 'index.css'),
    'utf8',
  );

  assert.match(promptAreaHook, /document\.createElement\('span'\)/);
  assert.match(promptAreaHook, /prompt-area-trailing-newline-sentinel/);
  assert.doesNotMatch(promptAreaHook, /const sentinel = document\.createElement\('br'\)/);
  assert.match(domHelpers, /isPromptAreaSentinel/);
  assert.match(css, /\.ccem-prompt-area \.prompt-area-trailing-newline-sentinel/);
  assert.match(css, /width: 0;/);
  assert.match(css, /line-height: inherit;/);
});
