import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importPetNotifications() {
  const sourcePath = path.join(desktopDir, 'src', 'lib', 'petNotifications.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-pet-notification-test-'));
  const outputPath = path.join(tempDir, 'petNotifications.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

function session(overrides = {}) {
  return {
    runtime_id: 'runtime-1',
    provider: 'codex',
    transport: 'native_sdk',
    provider_session_id: 'provider-1',
    project_dir: '/tmp/project-a',
    env_name: 'official',
    perm_mode: 'dev',
    runtime_perm_mode: null,
    effort: null,
    status: 'running',
    created_at: '2026-05-01T08:00:00.000Z',
    updated_at: '2026-05-01T08:01:00.000Z',
    is_active: true,
    last_event_seq: 1,
    can_handoff_to_terminal: true,
    last_error: null,
    ...overrides,
  };
}

function interactiveSession(overrides = {}) {
  return {
    id: 'session-1',
    client: 'claude',
    envName: 'official',
    workingDir: '/tmp/legacy-project',
    startedAt: new Date('2026-05-01T08:04:00.000Z'),
    status: 'running',
    permMode: 'dev',
    terminalType: 'iterm2',
    windowId: '123',
    itermSessionId: 'iterm-session-1',
    ...overrides,
  };
}

function tauriInteractiveSession(overrides = {}) {
  return {
    id: 'session-raw-1',
    client: 'claude',
    env_name: 'official',
    working_dir: '/tmp/raw-project',
    start_time: '2026-05-01T08:05:00.000Z',
    status: 'running',
    perm_mode: 'dev',
    terminal_type: 'iterm2',
    window_id: '456',
    iterm_session_id: 'iterm-session-raw-1',
    ...overrides,
  };
}

function codexHistorySession(overrides = {}) {
  return {
    id: 'codex-thread-1',
    client: 'codex',
    workingDir: '/tmp/codex-project',
    startedAt: '2026-05-01T08:00:00.000Z',
    updatedAt: '2026-05-01T08:06:00.000Z',
    status: 'stopped',
    title: 'Codex 桌面会话',
    latestModelOutput: '已经读取 Codex 的会话记录。',
    ...overrides,
  };
}

test('shows running sessions and unread terminal sessions, but hides read terminal sessions', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const notifications = buildPetNotifications(
    [
      session({ runtime_id: 'running-1', status: 'running', updated_at: '2026-05-01T08:03:00.000Z' }),
      session({ runtime_id: 'done-1', status: 'stopped', updated_at: '2026-05-01T08:02:00.000Z' }),
      session({ runtime_id: 'done-2', status: 'error', updated_at: '2026-05-01T08:01:00.000Z' }),
    ],
    new Set(['pet:codex:done-2:error']),
  );

  assert.deepEqual(
    notifications.map((item) => item.runtimeId),
    ['running-1', 'done-1'],
  );
  assert.equal(notifications[0].markReadOnOpen, true);
  assert.equal(notifications[1].markReadOnOpen, true);
});

test('includes legacy interactive sessions launched from the desktop app', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const notifications = buildPetNotifications(
    [
      interactiveSession({
        id: 'legacy-running-1',
        client: 'claude',
        workingDir: '/tmp/legacy-project',
        startedAt: new Date('2026-05-01T08:04:00.000Z'),
        status: 'running',
      }),
    ],
    new Set(),
  );

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].runtimeId, 'legacy-running-1');
  assert.equal(notifications[0].title, 'legacy-project');
  assert.equal(notifications[0].message, '正在思考');
  assert.equal(notifications[0].statusLabel, '运行中');
});

test('includes raw interactive sessions returned directly from Tauri IPC', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const notifications = buildPetNotifications(
    [
      tauriInteractiveSession({
        id: 'raw-running-1',
        working_dir: '/tmp/raw-project',
        start_time: '2026-05-01T08:05:00.000Z',
        status: 'running',
      }),
    ],
    new Set(),
  );

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].runtimeId, 'raw-running-1');
  assert.equal(notifications[0].title, 'raw-project');
  assert.equal(notifications[0].updatedAt, '2026-05-01T08:05:00.000Z');
});

test('uses the session title and latest model output preview when available', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const notifications = buildPetNotifications(
    [
      session({
        title: '修复桌面猫跨桌面显示',
        latestModelOutput: '已经定位到 macOS Spaces 的窗口行为，需要把桌面宠物作为跨 Space 浮窗处理。',
      }),
    ],
    new Set(),
  );

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].title, '修复桌面猫跨桌面显示');
  assert.equal(notifications[0].message, '已经定位到 macOS Spaces 的窗口行为，需要把桌面宠物作为跨 Space 浮窗处理。');
});

test('falls back to thinking text when no model output is available', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const notifications = buildPetNotifications(
    [
      session({
        title: '等待模型输出',
        latestModelOutput: '   ',
      }),
    ],
    new Set(),
  );

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].title, '等待模型输出');
  assert.equal(notifications[0].message, '正在思考');
});

test('extracts title and latest assistant turn from native session events', async () => {
  const { buildPetDisplayFromEvents } = await importPetNotifications();
  const display = buildPetDisplayFromEvents([
    {
      runtime_id: 'runtime-1',
      seq: 1,
      occurred_at: '2026-05-01T08:00:00.000Z',
      payload: { type: 'user_prompt', text: '帮我完善桌面猫气泡', image_count: 0 },
    },
    {
      runtime_id: 'runtime-1',
      seq: 2,
      occurred_at: '2026-05-01T08:00:01.000Z',
      payload: { type: 'assistant_chunk', text: '我会先看现有通知逻辑，' },
    },
    {
      runtime_id: 'runtime-1',
      seq: 3,
      occurred_at: '2026-05-01T08:00:02.000Z',
      payload: { type: 'assistant_chunk', text: '再把文案改成最新输出。' },
    },
    {
      runtime_id: 'runtime-1',
      seq: 4,
      occurred_at: '2026-05-01T08:00:03.000Z',
      payload: {
        type: 'tool_use_started',
        tool_use_id: 'tool-1',
        category: { category: 'search', raw_name: 'rg' },
        raw_name: 'rg',
        input_summary: '查找通知逻辑',
        needs_response: false,
      },
    },
  ]);

  assert.equal(display.title, '帮我完善桌面猫气泡');
  assert.equal(display.latestModelOutput, '我会先看现有通知逻辑，再把文案改成最新输出。');
});

test('extracts latest visible assistant output from Codex history messages', async () => {
  const { buildPetDisplayFromConversationMessages } = await importPetNotifications();
  const display = buildPetDisplayFromConversationMessages([
    {
      msgType: 'user',
      content: [{ type: 'text', text: '我也要看到 codex 的' }],
    },
    {
      msgType: 'assistant',
      content: [{ type: 'thinking', thinking: '内部推理不该出现在气泡里' }],
    },
    {
      msgType: 'assistant',
      content: [
        { type: 'tool_use', name: 'rg', input: { query: 'codex history' } },
      ],
    },
    {
      msgType: 'assistant',
      content: [
        { type: 'text', text: '我会把 Codex 历史会话接到桌面猫通知里。' },
      ],
    },
  ]);

  assert.equal(display.title, '我也要看到 codex 的');
  assert.equal(display.latestModelOutput, '我会把 Codex 历史会话接到桌面猫通知里。');
});

test('includes external Codex history sessions with their latest output', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const notifications = buildPetNotifications(
    [
      codexHistorySession(),
      session({
        runtime_id: 'older-native',
        updated_at: '2026-05-01T08:05:00.000Z',
      }),
    ],
    new Set(),
  );

  assert.equal(notifications[0].runtimeId, 'codex-thread-1');
  assert.equal(notifications[0].provider, 'codex');
  assert.equal(notifications[0].title, 'Codex 桌面会话');
  assert.equal(notifications[0].message, '已经读取 Codex 的会话记录。');
  assert.equal(notifications[0].updatedAt, '2026-05-01T08:06:00.000Z');
  assert.equal(notifications[0].markReadOnOpen, true);
});

test('hides opened running notifications while allowing later status updates to surface', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const runningReadId = 'pet:claude:raw-running-1:running';

  const runningNotifications = buildPetNotifications(
    [
      tauriInteractiveSession({
        id: 'raw-running-1',
        status: 'running',
      }),
    ],
    new Set([runningReadId]),
  );

  assert.equal(runningNotifications.length, 0);

  const stoppedNotifications = buildPetNotifications(
    [
      tauriInteractiveSession({
        id: 'raw-running-1',
        status: 'stopped',
      }),
    ],
    new Set([runningReadId]),
  );

  assert.equal(stoppedNotifications.length, 1);
  assert.equal(stoppedNotifications[0].id, 'pet:claude:raw-running-1:stopped');
  assert.equal(stoppedNotifications[0].markReadOnOpen, true);
});

test('sorts newest updates first and limits the stack to three bubbles', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const sessions = Array.from({ length: 7 }, (_, index) =>
    session({
      runtime_id: `runtime-${index}`,
      provider_session_id: `provider-${index}`,
      updated_at: `2026-05-01T08:0${index}:00.000Z`,
    }),
  );

  const notifications = buildPetNotifications(sessions, new Set());

  assert.equal(notifications.length, 3);
  assert.deepEqual(
    notifications.map((item) => item.runtimeId),
    ['runtime-6', 'runtime-5', 'runtime-4'],
  );
});

test('dismissed attention notifications stay hidden until their status changes', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const dismissedAttentionId = 'pet:codex:waiting-1:waiting_for_approval';

  const dismissed = buildPetNotifications(
    [
      session({
        runtime_id: 'waiting-1',
        status: 'waiting_for_approval',
      }),
    ],
    new Set([dismissedAttentionId]),
  );

  assert.equal(dismissed.length, 0);

  const runningAgain = buildPetNotifications(
    [
      session({
        runtime_id: 'waiting-1',
        status: 'running',
      }),
    ],
    new Set([dismissedAttentionId]),
  );

  assert.equal(runningAgain.length, 1);
  assert.equal(runningAgain[0].id, 'pet:codex:waiting-1:running');
});

test('opens attention notifications as read so clicked bubbles disappear immediately', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const notifications = buildPetNotifications(
    [
      session({
        runtime_id: 'waiting-open-1',
        status: 'waiting_for_approval',
      }),
    ],
    new Set(),
  );

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].tone, 'attention');
  assert.equal(notifications[0].markReadOnOpen, true);
});

test('uses concise Chinese status labels for different session states', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const notifications = buildPetNotifications(
    [
      session({ runtime_id: 'waiting-1', status: 'waiting_for_approval' }),
      session({ runtime_id: 'failed-1', status: 'error', last_error: 'network closed' }),
      session({ runtime_id: 'interrupted-1', status: 'interrupted' }),
    ],
    new Set(),
  );

  assert.deepEqual(
    notifications.map((item) => item.statusLabel),
    ['需要处理', '失败', '已中断'],
  );
  assert.equal(notifications[1].message, '正在思考');
});
