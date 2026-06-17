import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importSessionLaunchAction() {
  const sourcePath = path.join(
    desktopDir,
    'src',
    'components',
    'sessions',
    'sessionLaunchAction.ts',
  );
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'ccem-session-launch-action-test-'),
  );
  const outputPath = path.join(tempDir, 'sessionLaunchAction.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('calls onLaunch when no working dir is selected', async () => {
  const { launchSingleSession } = await importSessionLaunchAction();
  const calls = [];

  const result = await launchSingleSession({
    selectedWorkingDir: null,
    onLaunch: async () => { calls.push('onLaunch'); },
    onLaunchWithDir: async () => { calls.push('onLaunchWithDir'); },
  });

  assert.deepEqual(result, { launched: true, workingDir: null });
  assert.deepEqual(calls, ['onLaunch']);
});

test('calls onLaunchWithDir when a working dir is selected', async () => {
  const { launchSingleSession } = await importSessionLaunchAction();
  const calls = [];

  const result = await launchSingleSession({
    selectedWorkingDir: '/tmp/project',
    onLaunch: async () => { calls.push('onLaunch'); },
    onLaunchWithDir: async (dir) => { calls.push(['onLaunchWithDir', dir]); },
  });

  assert.deepEqual(result, { launched: true, workingDir: '/tmp/project' });
  assert.deepEqual(calls, [['onLaunchWithDir', '/tmp/project']]);
});

test('rejects when onLaunch rejects, without calling onLaunchWithDir', async () => {
  const { launchSingleSession } = await importSessionLaunchAction();
  let onLaunchWithDirCalled = false;

  await assert.rejects(
    launchSingleSession({
      selectedWorkingDir: null,
      onLaunch: async () => { throw new Error('boom'); },
      onLaunchWithDir: async () => { onLaunchWithDirCalled = true; },
    }),
    { message: 'boom' },
  );
  assert.equal(onLaunchWithDirCalled, false);
});

test('rejects when onLaunchWithDir rejects', async () => {
  const { launchSingleSession } = await importSessionLaunchAction();

  await assert.rejects(
    launchSingleSession({
      selectedWorkingDir: '/tmp/project',
      onLaunch: async () => {},
      onLaunchWithDir: async () => { throw new Error('dir-boom'); },
    }),
    { message: 'dir-boom' },
  );
});
