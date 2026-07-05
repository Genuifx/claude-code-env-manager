import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importWorkspaceProjectTreeModel() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'workspaceProjectTreeModel.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-project-tree-model-test-'));
  const outputPath = path.join(tempDir, 'workspaceProjectTreeModel.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

function historySession(overrides = {}) {
  return {
    id: 'session-1',
    source: 'codex',
    display: 'Review the git diff',
    timestamp: Date.parse('2026-06-30T12:00:00.000Z'),
    project: '/Users/wzt/G/Github/claude-code-env-manager',
    projectName: 'claude-code-env-manager',
    envName: 'DeepSeek',
    configSource: 'ccem',
    ...overrides,
  };
}

test('classifies nested git worktree projects as temporary and preserves their parent', async () => {
  const { classifyProject } = await importWorkspaceProjectTreeModel();
  const mainProject = '/Users/wzt/G/Github/claude-code-env-manager';
  const worktree = `${mainProject}/.worktrees/ui-mainflow-1782663992`;

  const classification = classifyProject(worktree, [mainProject, worktree]);

  assert.equal(classification.bucket, 'temporary');
  assert.equal(classification.source, 'worktree');
  assert.equal(classification.parentProject, mainProject);
  assert.equal(classification.parentProjectName, 'claude-code-env-manager');
});

test('manual project classification overrides automatic worktree detection', async () => {
  const { classifyProject } = await importWorkspaceProjectTreeModel();
  const mainProject = '/Users/wzt/G/Github/claude-code-env-manager';
  const worktree = `${mainProject}/.worktrees/e2e-checkpoint-repo`;

  const classification = classifyProject(worktree, [mainProject, worktree], {
    [worktree]: 'main',
  });

  assert.equal(classification.bucket, 'main');
  assert.equal(classification.source, 'manual');
});

test('stable project order keeps existing rows in place and appends new projects', async () => {
  const { reconcileProjectOrder } = await importWorkspaceProjectTreeModel();
  const previous = ['/repo/a', '/repo/b'];
  const latestActivityOrder = ['/repo/b', '/repo/c', '/repo/a'];

  const next = reconcileProjectOrder(previous, latestActivityOrder);

  assert.deepEqual(next, ['/repo/a', '/repo/b', '/repo/c']);
});

test('organize order can still use current activity order explicitly', async () => {
  const { buildProjectNodes } = await importWorkspaceProjectTreeModel();
  const sessions = [
    historySession({
      id: 'old',
      project: '/repo/old',
      projectName: 'old',
      timestamp: Date.parse('2026-06-30T11:00:00.000Z'),
    }),
    historySession({
      id: 'new',
      project: '/repo/new',
      projectName: 'new',
      timestamp: Date.parse('2026-06-30T13:00:00.000Z'),
    }),
  ];

  const activityOrder = buildProjectNodes(sessions).map((node) => node.project);

  assert.deepEqual(activityOrder, ['/repo/new', '/repo/old']);
});

test('stabilizes project sessions when runtime updates reshuffle timestamps', async () => {
  const { stabilizeProjectNodeSessions } = await importWorkspaceProjectTreeModel();
  const previousNodes = [
    {
      project: '/repo/app',
      projectName: 'app',
      latestTimestamp: 3,
      sessions: [
        historySession({ id: 'first', project: '/repo/app', projectName: 'app', timestamp: 3 }),
        historySession({ id: 'second', project: '/repo/app', projectName: 'app', timestamp: 2 }),
        historySession({ id: 'third', project: '/repo/app', projectName: 'app', timestamp: 1 }),
      ],
    },
  ];
  const nextNodes = [
    {
      project: '/repo/app',
      projectName: 'app',
      latestTimestamp: 10,
      sessions: [
        historySession({ id: 'third', project: '/repo/app', projectName: 'app', timestamp: 10 }),
        historySession({ id: 'first', project: '/repo/app', projectName: 'app', timestamp: 3 }),
        historySession({ id: 'second', project: '/repo/app', projectName: 'app', timestamp: 2 }),
      ],
    },
  ];

  const stable = stabilizeProjectNodeSessions(previousNodes, nextNodes);

  assert.deepEqual(stable[0].sessions.map((session) => session.id), ['first', 'second', 'third']);
  assert.equal(stable[0].sessions[2].timestamp, 10);
});

test('stabilized project sessions place fresh sessions before retained rows', async () => {
  const { stabilizeProjectNodeSessions } = await importWorkspaceProjectTreeModel();
  const previousNodes = [
    {
      project: '/repo/app',
      projectName: 'app',
      latestTimestamp: 3,
      sessions: [
        historySession({ id: 'first', project: '/repo/app', projectName: 'app', timestamp: 3 }),
        historySession({ id: 'second', project: '/repo/app', projectName: 'app', timestamp: 2 }),
      ],
    },
  ];
  const nextNodes = [
    {
      project: '/repo/app',
      projectName: 'app',
      latestTimestamp: 4,
      sessions: [
        historySession({ id: 'fresh', project: '/repo/app', projectName: 'app', timestamp: 4 }),
        historySession({ id: 'second', project: '/repo/app', projectName: 'app', timestamp: 2 }),
        historySession({ id: 'first', project: '/repo/app', projectName: 'app', timestamp: 3 }),
      ],
    },
  ];

  const stable = stabilizeProjectNodeSessions(previousNodes, nextNodes);

  assert.deepEqual(stable[0].sessions.map((session) => session.id), ['fresh', 'first', 'second']);
});

test('stabilized project sessions append backfilled sessions behind retained rows', async () => {
  const { stabilizeProjectNodeSessions } = await importWorkspaceProjectTreeModel();
  const previousNodes = [
    {
      project: '/repo/app',
      projectName: 'app',
      latestTimestamp: 3,
      sessions: [
        historySession({ id: 'first', project: '/repo/app', projectName: 'app', timestamp: 3 }),
        historySession({ id: 'active', project: '/repo/app', projectName: 'app', timestamp: 2 }),
      ],
    },
  ];
  const nextNodes = [
    {
      project: '/repo/app',
      projectName: 'app',
      latestTimestamp: 10,
      sessions: [
        historySession({ id: 'active', project: '/repo/app', projectName: 'app', timestamp: 10 }),
        historySession({ id: 'backfill', project: '/repo/app', projectName: 'app', timestamp: 4 }),
        historySession({ id: 'first', project: '/repo/app', projectName: 'app', timestamp: 3 }),
      ],
    },
  ];

  const stable = stabilizeProjectNodeSessions(previousNodes, nextNodes);

  assert.deepEqual(stable[0].sessions.map((session) => session.id), ['first', 'active', 'backfill']);
});

test('detects active sidebar sessions from runtime decorations', async () => {
  const { isSessionActiveInSidebar } = await importWorkspaceProjectTreeModel();
  const session = historySession({ id: 'active-session', source: 'claude' });

  assert.equal(isSessionActiveInSidebar(session, {
    'claude:active-session': { visualState: 'attention' },
  }), true);
  assert.equal(isSessionActiveInSidebar(session, {
    'claude:active-session': { visualState: 'identity' },
  }), false);
});

test('keeps active temporary projects in the fixed strip until dismissed', async () => {
  const { splitProjectNodesForSidebar } = await importWorkspaceProjectTreeModel();
  const mainNode = {
    project: '/repo/main',
    projectName: 'main',
    latestTimestamp: 2,
    sessions: [historySession({ project: '/repo/main', projectName: 'main' })],
  };
  const temporaryNode = {
    project: '/repo/main/.worktrees/ui-mainflow-123',
    projectName: 'ui-mainflow-123',
    latestTimestamp: 1,
    sessions: [historySession({
      id: 'active-temp',
      project: '/repo/main/.worktrees/ui-mainflow-123',
      projectName: 'ui-mainflow-123',
    })],
  };
  const classificationsByProject = {
    [mainNode.project]: {
      project: mainNode.project,
      bucket: 'main',
      source: 'regular',
    },
    [temporaryNode.project]: {
      project: temporaryNode.project,
      bucket: 'temporary',
      source: 'worktree',
      parentProject: mainNode.project,
      parentProjectName: mainNode.projectName,
    },
  };

  const fixed = splitProjectNodesForSidebar(
    [mainNode, temporaryNode],
    classificationsByProject,
    new Set([temporaryNode.project]),
    new Set()
  );

  assert.deepEqual(fixed.mainProjectNodes.map((node) => node.project), [mainNode.project]);
  assert.deepEqual(fixed.activeTemporaryProjectNodes.map((node) => node.project), [temporaryNode.project]);
  assert.deepEqual(fixed.temporaryProjectNodes, []);

  const dismissed = splitProjectNodesForSidebar(
    [mainNode, temporaryNode],
    classificationsByProject,
    new Set([temporaryNode.project]),
    new Set([temporaryNode.project])
  );

  assert.deepEqual(dismissed.activeTemporaryProjectNodes, []);
  assert.deepEqual(dismissed.temporaryProjectNodes.map((node) => node.project), [temporaryNode.project]);
});
