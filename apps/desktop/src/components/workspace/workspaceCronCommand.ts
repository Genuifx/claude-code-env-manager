export const WORKSPACE_CRON_COMMAND = '/ccem-cron';

export interface WorkspaceCronTaskDraft {
  name: string;
  cronExpression: string;
  prompt: string;
  workingDir: string;
  executionProfile?: 'conservative' | 'standard' | 'autonomous';
}

const MORNING_NOON_EVENING_CRON = '0 8,12,18 * * *';

export function isWorkspaceCronCommand(value: string): boolean {
  return /^\/ccem-cron(?:\s|$)/i.test(value.trimStart());
}

function cronExpressionForRequest(request: string): string {
  if (/早中晚|早、中、晚|早午晚|morning.*noon.*evening/i.test(request)) {
    return MORNING_NOON_EVENING_CRON;
  }
  if (/工作日|weekday/i.test(request)) {
    return '0 9 * * 1-5';
  }
  if (/每小时|hourly/i.test(request)) {
    return '0 * * * *';
  }
  if (/每天|每日|daily|every day/i.test(request)) {
    return '0 9 * * *';
  }
  return '0 9 * * *';
}

function isGithubPullRequest(request: string): boolean {
  return /(github|git\s*hub)/i.test(request)
    && /(拉取|pull|同步|更新)/i.test(request)
    && /(最新|latest|代码|code|仓库|repo)/i.test(request);
}

function taskNameForRequest(request: string): string {
  if (isGithubPullRequest(request)) {
    return '拉取最新 GitHub 代码';
  }

  return request
    .replace(/^(每天|每日|工作日|每小时)/, '')
    .replace(/^(早中晚|早、中、晚|早午晚)/, '')
    .replace(/[。.!！?？]+$/g, '')
    .trim()
    .slice(0, 28) || 'Workspace 定时任务';
}

function taskPromptForRequest(request: string): string {
  if (isGithubPullRequest(request)) {
    return [
      `请在当前工作区按这个定时请求执行：${request}`,
      '执行前先检查当前分支和未提交改动；如存在会被覆盖的本地改动或合并冲突风险，请停止并报告，不要强制覆盖。',
    ].join('\n\n');
  }

  return `请在当前工作区执行这个定时任务：${request}`;
}

export function parseWorkspaceCronCommand(
  value: string,
  workingDir?: string | null,
): WorkspaceCronTaskDraft | null {
  const trimmed = value.trim();
  const normalizedWorkingDir = workingDir?.trim();
  if (!normalizedWorkingDir) {
    return null;
  }

  const commandPattern = new RegExp(`^${WORKSPACE_CRON_COMMAND}(?:\\s+([\\s\\S]+))?$`, 'i');
  const match = trimmed.match(commandPattern);
  if (!match) {
    return null;
  }

  const request = match[1]?.trim();
  if (!request) {
    return null;
  }

  return {
    name: taskNameForRequest(request),
    cronExpression: cronExpressionForRequest(request),
    prompt: taskPromptForRequest(request),
    workingDir: normalizedWorkingDir,
    executionProfile: isGithubPullRequest(request) ? 'standard' : 'conservative',
  };
}
