import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function readNativeSessionView() {
  return fs.readFile(
    path.join(desktopDir, 'src', 'components', 'workspace', 'WorkspaceNativeSessionView.tsx'),
    'utf8',
  );
}

test('workspace external actions hover menu stays non-modal so the trigger hover does not flicker', async () => {
  const component = await readNativeSessionView();

  assert.match(
    component,
    /<DropdownMenu\s+modal=\{false\}\s+open=\{isExternalActionsOpen\}\s+onOpenChange=\{handleExternalActionsOpenChange\}>/,
  );
  assert.match(
    component,
    /const handleExternalActionsOpenChange = useCallback\(\(open: boolean\) => \{[\s\S]*?if \(open\) \{[\s\S]*?openExternalActionsMenu\(\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?closeExternalActionsMenu\(\);[\s\S]*?\}, \[closeExternalActionsMenu, openExternalActionsMenu\]\);/,
  );
  assert.doesNotMatch(
    component,
    /<DropdownMenu open=\{isExternalActionsOpen\} onOpenChange=\{setIsExternalActionsOpen\}>/,
  );
});

test('workspace external actions tooltip is suppressed while its menu is open', async () => {
  const component = await readNativeSessionView();

  assert.match(
    component,
    /\{!isExternalActionsOpen && \(\s*<TooltipContent side="top">\{t\('workspace\.externalActions'\)\}<\/TooltipContent>\s*\)\}/,
  );
});
