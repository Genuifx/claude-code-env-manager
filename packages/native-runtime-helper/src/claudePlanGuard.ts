import os from 'node:os';
import path from 'node:path';

const PLAN_MODE_BLOCKED_TOOLS = new Set([
  'Agent',
  'Bash',
  'KillShell',
  'Task',
  'Write',
  'Edit',
  'MultiEdit',
  'NotebookEdit',
]);

export type ClaudePlanModePreToolUseInput = {
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_use_id?: string;
};

export type ClaudePlanModeBlockedTool = {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  reason: string;
};

type ClaudePlanModeHookOutput = {
  continue: true;
  hookSpecificOutput?: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'deny';
    permissionDecisionReason: string;
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function extractPathLikeValue(input: Record<string, unknown>) {
  for (const key of ['file_path', 'path', 'target_file', 'notebook_path']) {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function isClaudeInternalPlanFile(toolName: string, input: Record<string, unknown>) {
  if (!['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(toolName)) {
    return false;
  }

  const pathLikeValue = extractPathLikeValue(input);
  if (!pathLikeValue) {
    return false;
  }

  const resolvedTarget = path.resolve(pathLikeValue);
  const planDir = path.resolve(os.homedir(), '.claude', 'plans');
  return resolvedTarget === planDir || resolvedTarget.startsWith(`${planDir}${path.sep}`);
}

export function shouldBlockClaudeToolInPlanMode(toolName: string, input: Record<string, unknown>) {
  if (!PLAN_MODE_BLOCKED_TOOLS.has(toolName)) {
    return false;
  }

  return !isClaudeInternalPlanFile(toolName, input);
}

export function buildClaudePlanModePreToolUseHook(
  isPlanMode: () => boolean,
  onBlockedTool?: (blockedTool: ClaudePlanModeBlockedTool) => void,
) {
  return async function claudePlanModePreToolUseHook(
    input: ClaudePlanModePreToolUseInput,
  ): Promise<ClaudePlanModeHookOutput> {
    if (!isPlanMode() || input.hook_event_name !== 'PreToolUse') {
      return { continue: true };
    }

    const toolName = input.tool_name ?? '';
    const toolInput = asRecord(input.tool_input);
    if (!shouldBlockClaudeToolInPlanMode(toolName, toolInput)) {
      return { continue: true };
    }

    const reason = `Plan mode is active. Confirm the plan before running ${toolName}.`;
    onBlockedTool?.({
      toolName,
      toolUseId: input.tool_use_id ?? '',
      input: toolInput,
      reason,
    });

    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    };
  };
}

export function buildClaudePlanModeHooks(
  isPlanMode: () => boolean,
  onBlockedTool?: (blockedTool: ClaudePlanModeBlockedTool) => void,
) {
  return {
    PreToolUse: [{
      hooks: [buildClaudePlanModePreToolUseHook(isPlanMode, onBlockedTool)],
    }],
  };
}
