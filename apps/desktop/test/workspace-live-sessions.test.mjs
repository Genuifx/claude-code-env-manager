import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importWorkspaceLiveSessions() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'workspaceLiveSessions.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-live-sessions-test-'));
  const outputPath = path.join(tempDir, 'workspaceLiveSessions.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

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
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-sidebar-live-test-'));
  const outputPath = path.join(tempDir, 'workspaceSidebarSessions.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

function nativeSession(overrides = {}) {
  return {
    runtime_id: 'native-1',
    provider: 'claude',
    transport: 'native_sdk',
    provider_session_id: null,
    project_dir: '/Users/wzt/G/Github/claude-code-env-manager',
    env_name: 'DeepSeek',
    perm_mode: 'dev',
    runtime_perm_mode: null,
    effort: 'max',
    status: 'processing',
    created_at: '2026-05-05T10:00:00.000Z',
    updated_at: '2026-05-05T10:00:01.000Z',
    is_active: true,
    last_event_seq: 1,
    can_handoff_to_terminal: true,
    last_error: null,
    ...overrides,
  };
}

test('keeps cold-start live selection visible before React commits state', async () => {
  const {
    updateWorkspaceLiveSessionsSnapshot,
    upsertWorkspaceLiveSessionEntry,
  } = await importWorkspaceLiveSessions();
  const { toLiveHistorySessionItem } = await importWorkspaceSidebarSessions();

  const liveSessionsRef = { current: {} };
  let scheduledState = null;
  const selectedKey = 'claude:native-1';

  const nextSessions = updateWorkspaceLiveSessionsSnapshot(
    liveSessionsRef,
    (next) => {
      scheduledState = next;
    },
    (previous) => upsertWorkspaceLiveSessionEntry(previous, nativeSession(), {
      initialPrompt: 'hello from composer',
      seedMessages: [],
    }),
  );

  assert.equal(liveSessionsRef.current, nextSessions);
  assert.equal(scheduledState, nextSessions);
  assert.equal(liveSessionsRef.current['native-1'].initialPrompt, 'hello from composer');

  const stillExistsInColdStartSnapshot = Object.values(liveSessionsRef.current)
    .some((entry) => {
      const liveItem = toLiveHistorySessionItem(entry);
      return liveItem ? `${liveItem.source}:${liveItem.id}` === selectedKey : false;
    });
  assert.equal(stillExistsInColdStartSnapshot, true);
});
