import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importWorkspaceSidebarSessions() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'workspaceSidebarSessions.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-sidebar-test-'));
  const outputPath = path.join(tempDir, 'workspaceSidebarSessions.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

function nativeSession(overrides = {}) {
  return {
    runtime_id: 'native-1',
    provider: 'claude',
    provider_session_id: null,
    project_dir: '/Users/wzt/G/Github/claude-code-env-manager',
    env_name: 'DeepSeek',
    status: 'processing',
    created_at: '2026-05-02T12:52:35.000Z',
    updated_at: '2026-05-02T12:52:40.000Z',
    ...overrides,
  };
}

test('adds live native sessions to the workspace sidebar before provider history exists', async () => {
  const { buildWorkspaceSidebarSessions } = await importWorkspaceSidebarSessions();

  const sessions = buildWorkspaceSidebarSessions([], [
    {
      session: nativeSession(),
      initialPrompt: '/impeccable craft 工作间的 transcript 渲染',
    },
  ]);

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].id, 'native-1');
  assert.equal(sessions[0].source, 'claude');
  assert.equal(sessions[0].display, '/impeccable craft 工作间的 transcript 渲染');
  assert.equal(sessions[0].projectName, 'claude-code-env-manager');
  assert.equal(sessions[0].envName, 'DeepSeek');
});

test('deduplicates live native sessions after matching provider history appears', async () => {
  const { buildWorkspaceSidebarSessions } = await importWorkspaceSidebarSessions();
  const history = [
    {
      id: 'provider-1',
      source: 'claude',
      display: '历史里的真实标题',
      timestamp: Date.parse('2026-05-02T12:53:00.000Z'),
      project: '/Users/wzt/G/Github/claude-code-env-manager',
      projectName: 'claude-code-env-manager',
      envName: 'DeepSeek',
      configSource: 'ccem',
    },
  ];

  const sessions = buildWorkspaceSidebarSessions(history, [
    {
      session: nativeSession({
        runtime_id: 'native-1',
        provider_session_id: 'provider-1',
        status: 'ready',
      }),
      initialPrompt: '临时标题',
    },
  ]);

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].id, 'provider-1');
  assert.equal(sessions[0].display, '历史里的真实标题');
});

test('omits terminal native sessions from the workspace sidebar', async () => {
  const { buildWorkspaceSidebarSessions } = await importWorkspaceSidebarSessions();

  const sessions = buildWorkspaceSidebarSessions([], [
    {
      session: nativeSession({
        runtime_id: 'native-stopped',
        status: 'stopped',
      }),
      initialPrompt: '已经停止的任务',
    },
    {
      session: nativeSession({
        runtime_id: 'native-running',
        status: 'processing',
        updated_at: '2026-05-02T12:53:00.000Z',
      }),
      initialPrompt: '还在运行的任务',
    },
  ]);

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].id, 'native-running');
  assert.equal(sessions[0].display, '还在运行的任务');
});
