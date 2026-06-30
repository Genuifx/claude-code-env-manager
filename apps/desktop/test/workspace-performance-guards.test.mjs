import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function readSource(...parts) {
  return fs.readFile(path.join(desktopDir, ...parts), 'utf8');
}

test('workspace review drawer stays lazy and only mounts while open', async () => {
  const workspace = await readSource('src', 'pages', 'Workspace.tsx');
  const nativeView = await readSource('src', 'components', 'workspace', 'WorkspaceNativeSessionView.tsx');

  assert.doesNotMatch(
    workspace,
    /from ['"]@\/components\/workspace\/WorkspaceReviewDrawer['"]/,
    'Workspace page must not statically import the heavy review drawer',
  );
  assert.doesNotMatch(
    nativeView,
    /from ['"]\.\/WorkspaceReviewDrawer['"]/,
    'Native session view must not statically import the heavy review drawer',
  );
  assert.match(
    workspace,
    /shouldRenderWorkspaceReview && workspaceReviewOpen && workspaceReviewModel/,
    'Workspace page should only mount the lazy drawer when the review panel is open',
  );
  assert.match(
    nativeView,
    /isReviewDrawerOpen && reviewModel/,
    'Native session view should only mount the lazy drawer when the review panel is open',
  );
});

test('prompt input avoids unconditional URL decoration and trigger scans', async () => {
  const hook = await readSource('src', 'components', 'use-prompt-area.ts');

  assert.match(
    hook,
    /function segmentsContainUrlHint/,
    'PromptArea should keep a cheap URL hint guard before DOM URL decoration',
  );
  assert.match(
    hook,
    /if \(segmentsContainUrlHint\(segments\)\) \{\s*decorateURLsInEditor\(editor\)/,
    'PromptArea input should not decorate URLs unless text contains a URL hint',
  );
  assert.match(
    hook,
    /function shouldRunTriggerDetectionAfterInput/,
    'PromptArea should guard trigger detection with cursor-local text checks',
  );
  assert.match(
    hook,
    /if \(shouldRunTriggerDetectionAfterInput\(segments, savedCursorOffset, triggers, activeTrigger\)\) \{\s*runTriggerDetection\(\)/,
    'PromptArea input should not run trigger detection on every ordinary keystroke',
  );
});

test('workspace transcript items opt into browser paint skipping', async () => {
  const css = await readSource('src', 'index.css');

  assert.match(
    css,
    /\.workspace-msg-virtualized,[\s\S]*?content-visibility: auto;/,
    'workspace transcript messages should use content-visibility for long timelines',
  );
  assert.match(
    css,
    /\.workspace-msg-virtualized \{[\s\S]*?contain-intrinsic-size: auto 220px;/,
    'workspace transcript messages should reserve a stable intrinsic size while skipped',
  );
});
