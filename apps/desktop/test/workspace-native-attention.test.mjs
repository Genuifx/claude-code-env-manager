import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importWorkspaceNativeAttention() {
  const sourcePath = path.join(desktopDir, 'src', 'components', 'workspace', 'workspaceNativeAttention.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-workspace-native-attention-test-'));
  const outputPath = path.join(tempDir, 'workspaceNativeAttention.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

function event(seq, payload) {
  return {
    runtime_id: 'runtime-1',
    seq,
    occurred_at: `2026-05-05T00:00:${String(seq).padStart(2, '0')}.000Z`,
    payload,
  };
}

test('plan review card prefers the detailed ExitPlanMode plan over a synthetic blocked-tool prompt', async () => {
  const { extractAttentionState } = await importWorkspaceNativeAttention();

  const attention = extractAttentionState([
    event(1, {
      type: 'tool_use_started',
      tool_use_id: 'synthetic-plan-exit',
      raw_name: 'ExitPlanMode',
      input_summary: 'Claude is ready to run Agent. Confirm before leaving Plan mode and executing changes.',
      needs_response: true,
      prompt: {
        prompt_type: 'plan_exit',
        allowed_prompts: ['继续执行'],
        plan_summary: 'Claude is ready to run Agent. Confirm before leaving Plan mode and executing changes.',
      },
      category: { category: 'user_input', kind: 'plan_exit', raw_name: 'ExitPlanMode' },
    }),
    event(2, {
      type: 'tool_use_started',
      tool_use_id: 'real-plan-exit',
      raw_name: 'ExitPlanMode',
      input_summary: '# Plan: Add copy button',
      needs_response: true,
      prompt: {
        prompt_type: 'plan_exit',
        allowed_prompts: [],
        plan_summary: '# Plan: Add copy button\n\n## Steps\n1. Edit App.tsx',
      },
      category: { category: 'user_input', kind: 'plan_exit', raw_name: 'ExitPlanMode' },
    }),
    event(3, {
      type: 'tool_use_completed',
      tool_use_id: 'real-plan-exit',
      raw_name: 'ExitPlanMode',
      result_summary: 'Plan mode is active. Confirm the plan before leaving Plan mode.',
      success: false,
    }),
  ]);

  assert.equal(attention.prompts.length, 1);
  assert.equal(attention.prompts[0].toolUseId, 'real-plan-exit');
  assert.match(attention.prompts[0].prompt.plan_summary, /# Plan: Add copy button/);
});

test('user continuation clears persisted plan review prompts', async () => {
  const { extractAttentionState } = await importWorkspaceNativeAttention();

  const attention = extractAttentionState([
    event(1, {
      type: 'tool_use_started',
      tool_use_id: 'real-plan-exit',
      raw_name: 'ExitPlanMode',
      input_summary: '# Plan: Add copy button',
      needs_response: true,
      prompt: {
        prompt_type: 'plan_exit',
        allowed_prompts: [],
        plan_summary: '# Plan: Add copy button',
      },
      category: { category: 'user_input', kind: 'plan_exit', raw_name: 'ExitPlanMode' },
    }),
    event(2, {
      type: 'tool_use_completed',
      tool_use_id: 'real-plan-exit',
      raw_name: 'ExitPlanMode',
      result_summary: 'Plan mode is active. Confirm the plan before leaving Plan mode.',
      success: false,
    }),
    event(3, { type: 'user_prompt', text: '继续执行', image_count: 0 }),
  ]);

  assert.equal(attention.prompts.length, 0);
});
