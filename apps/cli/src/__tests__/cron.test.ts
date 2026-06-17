import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  createCronTask,
  deleteCronTask,
  parseCronCreateJson,
  readCronTasks,
  writeCronTasks,
} from '../cron.js';

describe('cron task store', () => {
  let tempDir: string;
  let tasksPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccem-cron-test-'));
    tasksPath = path.join(tempDir, 'cron-tasks.json');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates a task through the structured store contract', () => {
    const task = createCronTask({
      name: 'Daily Review',
      cronExpression: '0 9 * * *',
      prompt: 'Review recent commits',
      workingDir: '/repo',
      envName: 'glm-official',
      executionProfile: 'standard',
      allowedTools: ['Bash', 'Read'],
      timeoutSecs: 600,
    }, tasksPath);

    expect(task.id).toMatch(/^cron-\d+-[0-9a-f]{4}$/);
    expect(task.enabled).toBe(true);
    expect(task.triggerType).toBe('schedule');
    expect(readCronTasks(tasksPath)).toEqual([task]);

    const raw = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
    expect(raw).toEqual({ tasks: [task] });
  });

  it('normalizes legacy raw-array stores back to the object wrapper on write', () => {
    fs.writeFileSync(tasksPath, JSON.stringify([
      {
        id: 'cron-old',
        name: 'Old',
        cronExpression: '0 8 * * *',
        prompt: 'Old task',
        workingDir: '/repo',
        envName: null,
        executionProfile: 'standard',
        maxBudgetUsd: null,
        allowedTools: [],
        disallowedTools: [],
        enabled: true,
        timeoutSecs: 300,
        templateId: null,
        triggerType: 'schedule',
        parentTaskId: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]));

    const tasks = readCronTasks(tasksPath);
    writeCronTasks(tasks, tasksPath);

    expect(JSON.parse(fs.readFileSync(tasksPath, 'utf-8'))).toEqual({ tasks });
  });

  it('rejects invalid cron expressions before writing', () => {
    expect(() => createCronTask({
      name: 'Bad',
      cronExpression: '0 9 * *',
      prompt: 'Bad task',
      workingDir: '/repo',
    }, tasksPath)).toThrow(/exactly 5 fields/);
    expect(fs.existsSync(tasksPath)).toBe(false);
  });

  it('deletes by exact id or name and rejects ambiguous names', () => {
    const first = createCronTask({
      name: 'Duplicate',
      cronExpression: '0 9 * * *',
      prompt: 'First',
      workingDir: '/repo',
    }, tasksPath);
    createCronTask({
      name: 'Duplicate',
      cronExpression: '0 10 * * *',
      prompt: 'Second',
      workingDir: '/repo',
    }, tasksPath);

    expect(() => deleteCronTask('Duplicate', tasksPath)).toThrow(/ambiguous/);
    expect(deleteCronTask(first.id, tasksPath)).toEqual(first);
    expect(readCronTasks(tasksPath)).toHaveLength(1);
  });

  it('parses create input from JSON aliases', () => {
    expect(parseCronCreateJson(JSON.stringify({
      name: 'From JSON',
      schedule: '0 7 * * *',
      prompt: 'Run task',
      timeoutSecs: 120,
    }))).toMatchObject({
      name: 'From JSON',
      cronExpression: '0 7 * * *',
      prompt: 'Run task',
      timeoutSecs: 120,
    });
  });
});
