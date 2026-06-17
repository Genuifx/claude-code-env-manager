import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importSessionTerminalActions() {
  const sourcePath = path.join(
    desktopDir,
    'src',
    'components',
    'sessions',
    'sessionTerminalActions.ts',
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
    path.join(os.tmpdir(), 'ccem-session-terminal-actions-test-'),
  );
  const outputPath = path.join(tempDir, 'sessionTerminalActions.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

test('external iTerm2 session with windowId enables focus, not open-in-terminal', async () => {
  const { getSessionTerminalActions } = await importSessionTerminalActions();

  const result = getSessionTerminalActions({
    session: {
      status: 'running',
      terminalType: 'iterm2',
      windowId: 'win-42',
      tmuxTarget: undefined,
    },
  });

  assert.equal(result.isRunning, true);
  assert.equal(result.canFocusExistingTerminal, true);
  assert.equal(result.canOpenInTerminal, false);
});

test('embedded/tmux session enables open-in-terminal, not focus', async () => {
  const { getSessionTerminalActions } = await importSessionTerminalActions();

  const result = getSessionTerminalActions({
    session: {
      status: 'running',
      terminalType: 'embedded',
      windowId: undefined,
      tmuxTarget: 'ccem-abc:main',
    },
  });

  assert.equal(result.isRunning, true);
  assert.equal(result.canFocusExistingTerminal, false);
  assert.equal(result.canOpenInTerminal, true);
});

test('unified-only interactive with tmuxTarget enables open-in-terminal', async () => {
  const { getSessionTerminalActions } = await importSessionTerminalActions();

  const result = getSessionTerminalActions({
    session: {
      status: 'running',
      terminalType: undefined,
      windowId: undefined,
      tmuxTarget: undefined,
    },
    unifiedSession: {
      runtimeKind: 'interactive',
      status: 'ready',
      tmuxTarget: 'ccem-xyz:main',
    },
  });

  assert.equal(result.isRunning, true);
  assert.equal(result.canFocusExistingTerminal, false);
  assert.equal(result.canOpenInTerminal, true);
});

test('stopped session disables both actions', async () => {
  const { getSessionTerminalActions } = await importSessionTerminalActions();

  const result = getSessionTerminalActions({
    session: {
      status: 'stopped',
      terminalType: 'iterm2',
      windowId: 'win-1',
      tmuxTarget: undefined,
    },
  });

  assert.equal(result.isRunning, false);
  assert.equal(result.canFocusExistingTerminal, false);
  assert.equal(result.canOpenInTerminal, false);
});

test('headless session disables both actions', async () => {
  const { getSessionTerminalActions } = await importSessionTerminalActions();

  const result = getSessionTerminalActions({
    session: {
      status: 'running',
      terminalType: undefined,
      windowId: undefined,
      tmuxTarget: undefined,
    },
    unifiedSession: {
      runtimeKind: 'headless',
      status: 'ready',
      tmuxTarget: undefined,
    },
  });

  assert.equal(result.isRunning, true);
  assert.equal(result.canFocusExistingTerminal, false);
  assert.equal(result.canOpenInTerminal, false);
});

test('external terminal with both windowId and tmuxTarget enables both', async () => {
  const { getSessionTerminalActions } = await importSessionTerminalActions();

  const result = getSessionTerminalActions({
    session: {
      status: 'running',
      terminalType: 'iterm2',
      windowId: 'win-99',
      tmuxTarget: 'ccem-both:main',
    },
  });

  assert.equal(result.canFocusExistingTerminal, true);
  assert.equal(result.canOpenInTerminal, true);
});
