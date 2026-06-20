import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

test('workspace message actions are revealed by explicit transcript content hover state', async () => {
  const component = await fs.readFile(
    path.join(desktopDir, 'src', 'components', 'workspace', 'WorkspaceMessageBubble.tsx'),
    'utf8',
  );

  assert.match(component, /className=\{cn\(spacingClass,\s*'workspace-msg-virtualized'\)\}/);
  assert.doesNotMatch(component, /workspace-msg-virtualized\s+group\/msg/);
  assert.doesNotMatch(component, /group\/msg\s+workspace-msg-virtualized/);
  assert.doesNotMatch(component, /group-hover\/msg/);
  assert.doesNotMatch(component, /group-focus-within\/msg/);
  assert.doesNotMatch(component, /absolute top-full/);
  assert.doesNotMatch(
    component,
    /absolute bottom-0 z-10[^\n']*(?:border-border\/35|bg-background\/95|shadow-sm|backdrop-blur)/,
  );

  assert.match(component, /const \[isActionHovering,\s*setIsActionHovering\] = useState\(false\);/);
  assert.match(component, /const showMessageActions = isActionHovering \|\| isActionFocusWithin;/);

  assert.match(
    component,
    /className="relative ml-auto max-w-\[78%\] min-w-\[220px\] pb-6"[\s\S]*?onPointerEnter=\{\(\) => setIsActionHovering\(true\)\}[\s\S]*?onPointerLeave=\{\(\) => setIsActionHovering\(false\)\}/,
  );
  assert.match(
    component,
    /className="relative w-fit max-w-full pb-6"[\s\S]*?onPointerEnter=\{\(\) => setIsActionHovering\(true\)\}[\s\S]*?onPointerLeave=\{\(\) => setIsActionHovering\(false\)\}/,
  );
  assert.match(
    component,
    /visible \? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'/,
  );
  assert.match(component, /absolute bottom-0 z-10/);
  assert.match(
    component,
    /<MessageMetaBar message=\{message\} isUser visible=\{showMessageActions\} t=\{t\} \/>/,
  );
  assert.match(
    component,
    /<MessageMetaBar message=\{message\} isUser=\{false\} visible=\{showMessageActions\} t=\{t\} \/>/,
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
    /visible \? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'/,
  );
  assert.doesNotMatch(messageBubble, /outputTokensPerSecond|output_tokens_per_second|t\/s/);
  assert.doesNotMatch(projectTree, /outputTokensPerSecond|output_tokens_per_second|t\/s/);
  assert.doesNotMatch(sidebarSessions, /outputTokensPerSecond|output_tokens_per_second|t\/s/);
});
