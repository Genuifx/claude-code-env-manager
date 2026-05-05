import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importWorkspaceTerminalLaunch() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'workspaceTerminalLaunch.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-terminal-launch-test-'));
  const outputPath = path.join(tempDir, 'workspaceTerminalLaunch.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('launches a terminal session from a blank composer prompt', async () => {
  const { launchWorkspaceTerminalSession } = await importWorkspaceTerminalLaunch();
  const calls = [];
  const refreshDelays = [];

  const result = await launchWorkspaceTerminalSession({
    prompt: '   ',
    provider: 'claude',
    currentEnv: 'DeepSeek',
    workingDir: '/Users/wzt/Documents/baymax',
    pickWorkingDir: async () => {
      throw new Error('directory picker should not be needed');
    },
    launchTerminal: async (...args) => {
      calls.push(args);
    },
    onWorkingDirResolved: (dir) => {
      calls.push(['resolved', dir]);
    },
    scheduleRefresh: (delayMs) => {
      refreshDelays.push(delayMs);
    },
  });

  assert.deepEqual(result, {
    launched: true,
    workingDir: '/Users/wzt/Documents/baymax',
  });
  assert.deepEqual(calls[0], [
    '/Users/wzt/Documents/baymax',
    undefined,
    'claude',
    'DeepSeek',
    undefined,
  ]);
  assert.deepEqual(calls[1], ['resolved', '/Users/wzt/Documents/baymax']);
  assert.deepEqual(refreshDelays, [350]);
});

test('asks for a directory before launching when the composer has no working dir', async () => {
  const { launchWorkspaceTerminalSession } = await importWorkspaceTerminalLaunch();
  const calls = [];

  const result = await launchWorkspaceTerminalSession({
    prompt: 'hello',
    provider: 'codex',
    currentEnv: null,
    workingDir: null,
    pickWorkingDir: async () => '/tmp/project',
    launchTerminal: async (...args) => {
      calls.push(args);
    },
  });

  assert.deepEqual(result, {
    launched: true,
    workingDir: '/tmp/project',
  });
  assert.deepEqual(calls, [[
    '/tmp/project',
    undefined,
    'codex',
    undefined,
    'hello',
  ]]);
});

test('cancels terminal launch when no working dir is selected', async () => {
  const { launchWorkspaceTerminalSession } = await importWorkspaceTerminalLaunch();
  let launched = false;

  const result = await launchWorkspaceTerminalSession({
    prompt: '',
    provider: 'claude',
    workingDir: null,
    pickWorkingDir: async () => null,
    launchTerminal: async () => {
      launched = true;
    },
  });

  assert.deepEqual(result, {
    launched: false,
    workingDir: null,
  });
  assert.equal(launched, false);
});
