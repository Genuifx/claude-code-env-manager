import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function readSource(...parts) {
  return fs.readFile(path.join(desktopDir, 'src', ...parts), 'utf8');
}

test('workspace composers keep per-keystroke draft text out of page state', async () => {
  const source = await readSource('pages', 'Workspace.tsx');

  assert.doesNotMatch(source, /onValueChange=\{setComposePrompt\}/);
  assert.doesNotMatch(source, /onValueChange=\{setHistoryComposerText\}/);
  assert.match(source, /const composePromptRef = useRef\(''\);/);
  assert.match(source, /const historyComposerTextRef = useRef\(''\);/);
  assert.match(source, /onValueChange=\{handleComposePromptChange\}/);
  assert.match(source, /onValueChange=\{handleHistoryComposerTextChange\}/);
  assert.match(source, /valueRevision=\{composePromptRevision\}/);
  assert.match(source, /valueRevision=\{historyComposerRevision\}/);
});

test('live workspace composer keeps typing out of the native session render hot path', async () => {
  const source = await readSource('components', 'workspace', 'WorkspaceNativeSessionView.tsx');

  assert.doesNotMatch(source, /const \[composerText,\s*setComposerText\] = useState\(''\);/);
  assert.doesNotMatch(source, /onValueChange=\{setComposerText\}/);
  assert.match(source, /const composerTextRef = useRef\(''\);/);
  assert.match(source, /const \[composerHasDraft, setComposerHasDraft\] = useState\(false\);/);
  assert.match(source, /const text = payload\?\.text \?\? composerTextRef\.current\.trim\(\);/);
  assert.match(source, /valueRevision=\{composerDraftRevision\}/);
  assert.match(source, /onValueChange=\{handleComposerTextChange\}/);
});

test('composer value revision forces explicit parent resets without requiring per-key parent updates', async () => {
  const source = await readSource('components', 'workspace', 'WorkspaceSessionComposer.tsx');

  assert.match(source, /valueRevision\?: number;/);
  assert.match(source, /const syncedValueRevisionRef = useRef\(valueRevision\);/);
  assert.match(source, /valueRevision === syncedValueRevisionRef\.current/);
  assert.match(source, /\}, \[value, valueRevision\]\);/);
});
