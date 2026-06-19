import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

test('workspace message actions are revealed by transcript content hover, not row hover', async () => {
  const component = await fs.readFile(
    path.join(desktopDir, 'src', 'components', 'workspace', 'WorkspaceMessageBubble.tsx'),
    'utf8',
  );

  assert.match(component, /className=\{cn\(spacingClass,\s*'workspace-msg-virtualized'\)\}/);
  assert.doesNotMatch(component, /workspace-msg-virtualized\s+group\/msg/);
  assert.doesNotMatch(component, /group\/msg\s+workspace-msg-virtualized/);

  assert.match(
    component,
    /className="group\/msg relative ml-auto max-w-\[78%\] min-w-\[220px\]"/,
  );
  assert.match(
    component,
    /className="group\/msg relative w-fit max-w-full"/,
  );
  assert.match(
    component,
    /group-hover\/msg:pointer-events-auto group-hover\/msg:opacity-100/,
  );
});

test('workspace does not render estimated token speed in transcript or session rows', async () => {
  const [messageBubble, projectTree, sidebarSessions] = await Promise.all([
    fs.readFile(
      path.join(desktopDir, 'src', 'components', 'workspace', 'WorkspaceMessageBubble.tsx'),
      'utf8',
    ),
    fs.readFile(
      path.join(desktopDir, 'src', 'components', 'workspace', 'ProjectTree.tsx'),
      'utf8',
    ),
    fs.readFile(
      path.join(desktopDir, 'src', 'components', 'workspace', 'workspaceSidebarSessions.ts'),
      'utf8',
    ),
  ]);

  assert.match(
    messageBubble,
    /group-hover\/msg:pointer-events-auto group-hover\/msg:opacity-100/,
  );
  assert.doesNotMatch(messageBubble, /outputTokensPerSecond|output_tokens_per_second|t\/s/);
  assert.doesNotMatch(projectTree, /outputTokensPerSecond|output_tokens_per_second|t\/s/);
  assert.doesNotMatch(sidebarSessions, /outputTokensPerSecond|output_tokens_per_second|t\/s/);
});
