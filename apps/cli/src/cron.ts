import crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ensureCcemDir, getCcemConfigDir } from '@ccem/core';

export type CronExecutionProfile = 'conservative' | 'standard' | 'autonomous';

export interface CronTask {
  id: string;
  name: string;
  cronExpression: string;
  prompt: string;
  workingDir: string;
  envName: string | null;
  executionProfile: CronExecutionProfile;
  maxBudgetUsd: number | null;
  allowedTools: string[];
  disallowedTools: string[];
  enabled: boolean;
  timeoutSecs: number;
  templateId: string | null;
  triggerType: 'schedule';
  parentTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CronCreateInput {
  name: string;
  cronExpression: string;
  prompt: string;
  workingDir?: string | null;
  envName?: string | null;
  executionProfile?: string | null;
  maxBudgetUsd?: number | null;
  allowedTools?: string[] | null;
  disallowedTools?: string[] | null;
  enabled?: boolean | null;
  timeoutSecs?: number | null;
  templateId?: string | null;
}

interface CronTasksFile {
  tasks: CronTask[];
}

export const CRON_TASKS_FILE_NAME = 'cron-tasks.json';

const EXECUTION_PROFILES = new Set<CronExecutionProfile>([
  'conservative',
  'standard',
  'autonomous',
]);

export function getCronTasksPath(baseDir = getCcemConfigDir()): string {
  return path.join(baseDir, CRON_TASKS_FILE_NAME);
}

export function readCronTasks(tasksPath = getCronTasksPath()): CronTask[] {
  if (!fs.existsSync(tasksPath)) {
    return [];
  }

  const content = fs.readFileSync(tasksPath, 'utf-8').trim();
  if (!content) {
    return [];
  }

  const parsed = JSON.parse(content) as CronTasksFile | CronTask[];
  const tasks = Array.isArray(parsed) ? parsed : parsed.tasks;
  if (!Array.isArray(tasks)) {
    throw new Error('Invalid cron task store: expected object with tasks array');
  }

  return tasks;
}

export function writeCronTasks(tasks: CronTask[], tasksPath = getCronTasksPath()): void {
  if (tasksPath === getCronTasksPath()) {
    ensureCcemDir();
  } else {
    fs.mkdirSync(path.dirname(tasksPath), { recursive: true });
  }

  const payload: CronTasksFile = { tasks };
  const content = `${JSON.stringify(payload, null, 2)}\n`;
  const tempPath = `${tasksPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, content, { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tempPath, tasksPath);
}

export function validateCronExpression(cronExpression: string): void {
  const fields = cronExpression.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error('Invalid cron expression: must have exactly 5 fields (minute hour day month weekday)');
  }
}

export function normalizeExecutionProfile(value?: string | null): CronExecutionProfile {
  if (!value) {
    return 'conservative';
  }

  if (EXECUTION_PROFILES.has(value as CronExecutionProfile)) {
    return value as CronExecutionProfile;
  }

  return 'conservative';
}

export function parseStringList(value?: string | string[] | null): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
      throw new Error('Expected a JSON array of strings');
    }
    return parsed.map((item) => item.trim()).filter(Boolean);
  }

  return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
}

export function createCronTask(input: CronCreateInput, tasksPath = getCronTasksPath()): CronTask {
  const name = input.name?.trim();
  if (!name) {
    throw new Error('Task name is required');
  }

  const cronExpression = input.cronExpression?.trim();
  if (!cronExpression) {
    throw new Error('cronExpression is required');
  }
  validateCronExpression(cronExpression);

  const prompt = input.prompt?.trim();
  if (!prompt) {
    throw new Error('Task prompt is required');
  }

  const timeoutSecs = input.timeoutSecs ?? 300;
  if (!Number.isInteger(timeoutSecs) || timeoutSecs <= 0) {
    throw new Error('timeoutSecs must be a positive integer');
  }

  const maxBudgetUsd = input.maxBudgetUsd ?? null;
  if (maxBudgetUsd !== null && (!Number.isFinite(maxBudgetUsd) || maxBudgetUsd < 0)) {
    throw new Error('maxBudgetUsd must be a non-negative number');
  }

  const now = new Date().toISOString();
  const task: CronTask = {
    id: `cron-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    name,
    cronExpression,
    prompt,
    workingDir: input.workingDir?.trim() || process.cwd(),
    envName: input.envName?.trim() || null,
    executionProfile: normalizeExecutionProfile(input.executionProfile),
    maxBudgetUsd,
    allowedTools: input.allowedTools ?? [],
    disallowedTools: input.disallowedTools ?? [],
    enabled: input.enabled ?? true,
    timeoutSecs,
    templateId: input.templateId?.trim() || null,
    triggerType: 'schedule',
    parentTaskId: null,
    createdAt: now,
    updatedAt: now,
  };

  const tasks = readCronTasks(tasksPath);
  tasks.push(task);
  writeCronTasks(tasks, tasksPath);

  return task;
}

export function deleteCronTask(selector: string, tasksPath = getCronTasksPath()): CronTask {
  const normalizedSelector = selector.trim();
  if (!normalizedSelector) {
    throw new Error('Task id or name is required');
  }

  const tasks = readCronTasks(tasksPath);
  const matches = tasks.filter((task) => task.id === normalizedSelector || task.name === normalizedSelector);
  if (matches.length === 0) {
    throw new Error(`Cron task not found: ${normalizedSelector}`);
  }
  if (matches.length > 1) {
    throw new Error(`Cron task selector is ambiguous: ${normalizedSelector}`);
  }

  const [deleted] = matches;
  writeCronTasks(tasks.filter((task) => task.id !== deleted.id), tasksPath);
  return deleted;
}

export function resolveJsonInput(raw: string): string {
  if (raw === '-') {
    return fs.readFileSync(0, 'utf-8');
  }

  if (raw.startsWith('@')) {
    return fs.readFileSync(path.resolve(raw.slice(1)), 'utf-8');
  }

  return raw;
}

export function parseCronCreateJson(raw: string): CronCreateInput {
  const parsed = JSON.parse(resolveJsonInput(raw)) as Record<string, unknown>;
  return {
    name: String(parsed.name ?? ''),
    cronExpression: String(parsed.cronExpression ?? parsed.schedule ?? ''),
    prompt: String(parsed.prompt ?? ''),
    workingDir: typeof parsed.workingDir === 'string' ? parsed.workingDir : null,
    envName: typeof parsed.envName === 'string' ? parsed.envName : null,
    executionProfile: typeof parsed.executionProfile === 'string' ? parsed.executionProfile : null,
    maxBudgetUsd: typeof parsed.maxBudgetUsd === 'number' ? parsed.maxBudgetUsd : null,
    allowedTools: Array.isArray(parsed.allowedTools)
      ? parsed.allowedTools.map(String)
      : null,
    disallowedTools: Array.isArray(parsed.disallowedTools)
      ? parsed.disallowedTools.map(String)
      : null,
    enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : null,
    timeoutSecs: typeof parsed.timeoutSecs === 'number' ? parsed.timeoutSecs : null,
    templateId: typeof parsed.templateId === 'string' ? parsed.templateId : null,
  };
}

export function formatCronTaskTableRows(tasks: CronTask[]): string[][] {
  return tasks.map((task) => [
    task.name,
    task.cronExpression,
    task.enabled ? 'yes' : 'no',
    task.workingDir.replace(os.homedir(), '~'),
    task.envName ?? '-',
    String(task.timeoutSecs),
  ]);
}
