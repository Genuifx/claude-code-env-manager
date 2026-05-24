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
  const hook = buildClaudePlanModePreToolUseHook(() => true);

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
});

test('allows Claude internal plan-file writes while in plan mode', async () => {
  const { buildClaudePlanModePreToolUseHook } = await importClaudePlanGuardModule();
  const hook = buildClaudePlanModePreToolUseHook(() => true);

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
});

test('allows delegated Agent tools while Claude runtime is still in plan mode', async () => {
  const { buildClaudePlanModePreToolUseHook } = await importClaudePlanGuardModule();
  const hook = buildClaudePlanModePreToolUseHook(() => true);

  const result = await hook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Agent',
    tool_input: {
      subagent_type: 'Explore',
      description: 'Explore project files',
    },
    tool_use_id: 'tool-agent',
  });

  assert.equal(result.continue, true);
  assert.equal(result.hookSpecificOutput, undefined);
});

test('allows legacy delegated Task tools while Claude runtime is still in plan mode', async () => {
  const { buildClaudePlanModePreToolUseHook } = await importClaudePlanGuardModule();
  const hook = buildClaudePlanModePreToolUseHook(() => true);

  const result = await hook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Task',
    tool_input: {
      subagent_type: 'Explore',
      description: 'Explore project files',
    },
    tool_use_id: 'tool-task',
  });

  assert.equal(result.continue, true);
  assert.equal(result.hookSpecificOutput, undefined);
});

test('lets shell tools reach the normal permission flow while in plan mode', async () => {
  const { buildClaudePlanModePreToolUseHook } = await importClaudePlanGuardModule();
  const hook = buildClaudePlanModePreToolUseHook(() => true);

  const result = await hook({
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: {
      command: 'rg "PlanMode" packages/native-runtime-helper/src',
    },
    tool_use_id: 'tool-bash',
  });

  assert.equal(result.continue, true);
  assert.equal(result.hookSpecificOutput, undefined);
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
