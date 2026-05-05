import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(__dirname, '..');

async function importClaudePlanGuardModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-claude-plan-guard-test-'));
  const outfile = path.join(tempDir, 'claudePlanGuard.mjs');

  await build({
    entryPoints: [path.join(packageDir, 'src', 'claudePlanGuard.ts')],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

test('denies mutating workspace tools while Claude runtime is still in plan mode', async () => {
  const { buildClaudePlanModePreToolUseHook } = await importClaudePlanGuardModule();
  const blockedTools = [];
  const hook = buildClaudePlanModePreToolUseHook(
    () => true,
    (blocked) => blockedTools.push(blocked),
  );

  const result = await hook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: {
      file_path: '/tmp/ccem-plan-demo.txt',
    },
    tool_use_id: 'tool-write',
  });

  assert.equal(result.hookSpecificOutput?.permissionDecision, 'deny');
  assert.match(
    result.hookSpecificOutput?.permissionDecisionReason,
    /Plan mode/,
  );
  assert.deepEqual(blockedTools.map((entry) => entry.toolName), ['Write']);
});

test('allows Claude internal plan-file writes while in plan mode', async () => {
  const { buildClaudePlanModePreToolUseHook } = await importClaudePlanGuardModule();
  const blockedTools = [];
  const hook = buildClaudePlanModePreToolUseHook(
    () => true,
    (blocked) => blockedTools.push(blocked),
  );

  const result = await hook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: {
      file_path: path.join(os.homedir(), '.claude/plans/example.md'),
    },
    tool_use_id: 'tool-plan-file',
  });

  assert.equal(result.continue, true);
  assert.equal(result.hookSpecificOutput, undefined);
  assert.deepEqual(blockedTools, []);
});

test('denies delegated Agent tools while Claude runtime is still in plan mode', async () => {
  const { buildClaudePlanModePreToolUseHook } = await importClaudePlanGuardModule();
  const blockedTools = [];
  const hook = buildClaudePlanModePreToolUseHook(
    () => true,
    (blocked) => blockedTools.push(blocked),
  );

  const result = await hook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Agent',
    tool_input: {
      subagent_type: 'Explore',
      description: 'Explore project files',
    },
    tool_use_id: 'tool-agent',
  });

  assert.equal(result.hookSpecificOutput?.permissionDecision, 'deny');
  assert.match(
    result.hookSpecificOutput?.permissionDecisionReason,
    /Agent/,
  );
  assert.deepEqual(blockedTools.map((entry) => entry.toolName), ['Agent']);
});

test('does not gate mutating tools after Claude runtime exits plan mode', async () => {
  const { buildClaudePlanModePreToolUseHook } = await importClaudePlanGuardModule();
  const hook = buildClaudePlanModePreToolUseHook(() => false);

  const result = await hook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: {
      file_path: '/tmp/ccem-plan-demo.txt',
    },
    tool_use_id: 'tool-write',
  });

  assert.equal(result.continue, true);
  assert.equal(result.hookSpecificOutput, undefined);
});
