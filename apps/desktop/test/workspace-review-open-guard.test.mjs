import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function readDrawer() {
  return fs.readFile(
    path.join(desktopDir, 'src', 'components', 'workspace', 'WorkspaceReviewDrawer.tsx'),
    'utf8',
  );
}

test('WorkspaceReviewDrawer routes open-file through the workspace-guarded IPC command', async () => {
  const component = await readDrawer();

  // MUST NOT import the unguarded shell plugin open() — that bypasses the Rust
  // workspace guard and lets session review open arbitrary paths.
  assert.doesNotMatch(
    component,
    /from ['"]@tauri-apps\/plugin-shell['"]/,
    'drawer must not import @tauri-apps/plugin-shell; route through open_file_in_workspace instead',
  );
  assert.doesNotMatch(
    component,
    /\bopen\(\s*resolveWorkspacePath/,
    'drawer must not call shell open() with a client-resolved path',
  );

  // MUST invoke the guarded Rust command. The command canonicalizes the
  // session project_dir and rejects any path that escapes it.
  assert.match(
    component,
    /invoke<boolean>\(\s*['"]open_file_in_workspace['"]\s*,\s*\{\s*workingDir:\s*session\.project_dir,\s*filePath:\s*path,?\s*\}\s*\)/,
    'openInEditor must invoke open_file_in_workspace with workingDir + filePath',
  );

  // The client MUST NOT pre-resolve absolute paths itself; resolution belongs
  // to the Rust guard so symlinks and ../ escapes are caught post-canonicalize.
  assert.doesNotMatch(
    component,
    /function resolveWorkspacePath/,
    'client-side resolveWorkspacePath must be removed — Rust owns path resolution',
  );
});

test('WorkspaceReviewDrawer surfaces a workspace-boundary rejection toast', async () => {
  const component = await readDrawer();

  // When the Rust guard rejects (message contains "escapes working dir"), the
  // UI must not silently swallow the error. Assert a dedicated user-facing
  // message is shown, not the raw IPC string.
  assert.match(
    component,
    /message\.includes\(['"]escapes working dir['"]\)[\s\S]*?toast\.error\(['"]路径超出工作区范围，已拒绝打开['"]\)/,
    'workspace-guard rejection must surface a workspace-boundary toast',
  );
});
