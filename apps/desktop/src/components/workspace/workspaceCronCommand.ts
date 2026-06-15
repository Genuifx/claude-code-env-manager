export const WORKSPACE_CRON_COMMAND = '/ccem-cron';

export interface WorkspaceCronAgentPrompt {
  prompt: string;
  displayPrompt: string;
}

export function isWorkspaceCronCommand(value: string): boolean {
  return /^\/ccem-cron(?:\s|$)/i.test(value.trimStart());
}

export function getWorkspaceCronRequest(value: string): string | null {
  const trimmed = value.trim();
  const commandPattern = new RegExp(`^${WORKSPACE_CRON_COMMAND}(?:\\s+([\\s\\S]+))?$`, 'i');
  const match = trimmed.match(commandPattern);
  const request = match?.[1]?.trim();
  return request || null;
}

export function buildWorkspaceCronAgentPrompt(
  value: string,
  workingDir?: string | null,
): WorkspaceCronAgentPrompt | null {
  const normalizedWorkingDir = workingDir?.trim();
  if (!normalizedWorkingDir) {
    return null;
  }

  const request = getWorkspaceCronRequest(value);
  if (!request) {
    return null;
  }

  return {
    displayPrompt: `${WORKSPACE_CRON_COMMAND} ${request}`,
    prompt: [
      `用户在 CCEM workspace 中输入了：${WORKSPACE_CRON_COMMAND} ${request}`,
      '',
      '请你作为当前 workspace 的 Claude Code/Codex agent 设置这个 CCEM 定时任务，而不是只给建议或计划。',
      '',
      '执行要求：',
      `- 任务工作目录固定使用：${normalizedWorkingDir}`,
      '- 理解用户的自然语言时间表达，生成标准 5 字段 cron 表达式：分 时 日 月 周。',
      '- 生成简短任务名和可直接执行的任务 prompt。',
      '- 创建前读取现有 `~/.ccem/cron-tasks.json`，保留已有任务；文件不存在时创建 `{ "tasks": [] }`。',
      '- `~/.ccem/cron-tasks.json` 的真实格式必须是对象：`{ "tasks": [...] }`，不要写成裸数组。',
      '- 新任务字段需包含：id、name、cronExpression、prompt、workingDir、envName、executionProfile、maxBudgetUsd、allowedTools、disallowedTools、enabled、timeoutSecs、templateId、triggerType、parentTaskId、createdAt、updatedAt。',
      '- 默认 enabled=true、timeoutSecs=300、triggerType="schedule"；executionProfile 根据任务风险选择 conservative、standard 或 autonomous。',
      '- 用 JSON parser 修改文件，不要用 echo/cat 手拼 JSON；写入后重新读取文件验证新任务存在。',
      '- 最后向用户报告创建出的 name、cronExpression、workingDir 和 prompt。',
      '- 如果时间表达、权限、目录或现有任务冲突不确定，先请用户确认；不要强制覆盖任何现有任务。',
      '',
      '用户原始定时需求：',
      request,
    ].join('\n'),
  };
}
