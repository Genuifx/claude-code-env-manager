export type TodoSnapshotStatusV1 = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface TodoSnapshotItemV1 {
  id: string;
  text: string;
  status: TodoSnapshotStatusV1;
  active_text?: string;
}

export interface TodoSnapshotV1 {
  version: 1;
  provider: 'claude' | 'codex';
  source: 'TodoWrite' | 'TaskCreate' | 'TaskUpdate' | 'TaskList' | 'todo_list';
  revision: number;
  items: TodoSnapshotItemV1[];
}

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function readText(record: Record<string, unknown> | null) {
  return readString(record, ['subject', 'content', 'text', 'description']);
}

function readActiveText(record: Record<string, unknown> | null) {
  return readString(record, ['activeForm', 'active_text']);
}

function readId(record: Record<string, unknown> | null) {
  return readString(record, ['id', 'taskId', 'task_id']);
}

function normalizeStatus(value: unknown, fallback: TodoSnapshotStatusV1 = 'pending') {
  if (value === 'pending' || value === 'in_progress' || value === 'completed' || value === 'failed') {
    return value;
  }
  return fallback;
}

function parseResultObject(value: unknown): Record<string, unknown> | null {
  const direct = readObject(value);
  if (direct) {
    if (direct.type === 'tool_result' && direct.content !== undefined) {
      return parseResultObject(direct.content);
    }
    return direct;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      return readObject(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const record = readObject(entry);
      const parsed = record?.type === 'text'
        ? parseResultObject(record.text)
        : parseResultObject(entry);
      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
}

function cloneItem(item: TodoSnapshotItemV1): TodoSnapshotItemV1 {
  return { ...item };
}

function itemFromRecord(
  value: unknown,
  fallbackId: string,
): TodoSnapshotItemV1 | null {
  const record = readObject(value);
  const text = readText(record);
  if (!record || !text) {
    return null;
  }

  const activeText = readActiveText(record);
  return {
    id: readId(record) ?? fallbackId,
    text,
    status: typeof record.completed === 'boolean'
      ? record.completed ? 'completed' : 'pending'
      : normalizeStatus(record.status),
    ...(activeText ? { active_text: activeText } : {}),
  };
}

export function snapshotFromCodexTodoList(
  item: unknown,
  revision = 1,
): TodoSnapshotV1 | undefined {
  const record = readObject(item);
  if (record?.type !== 'todo_list' || !Array.isArray(record.items)) {
    return undefined;
  }

  const listId = readId(record) ?? 'todo-list';
  const items = record.items
    .map((value, index) => itemFromRecord(value, `${listId}:${index}`))
    .filter((value): value is TodoSnapshotItemV1 => Boolean(value));

  return {
    version: 1,
    provider: 'codex',
    source: 'todo_list',
    revision,
    items,
  };
}

export class TodoSnapshotTracker {
  private revision = 0;
  private claudeItems = new Map<string, TodoSnapshotItemV1>();

  fromClaudeToolStarted(rawName: string, input: unknown): TodoSnapshotV1 | undefined {
    if (rawName !== 'TodoWrite') {
      return undefined;
    }

    const record = readObject(input);
    if (!Array.isArray(record?.todos)) {
      return undefined;
    }

    this.claudeItems = new Map(
      record.todos
        .map((value, index) => itemFromRecord(value, `todo-${index}`))
        .filter((value): value is TodoSnapshotItemV1 => Boolean(value))
        .map((item) => [item.id, item]),
    );
    return this.emitClaudeSnapshot('TodoWrite');
  }

  fromClaudeToolCompleted(
    rawName: string,
    input: unknown,
    result: unknown,
  ): TodoSnapshotV1 | undefined {
    const inputRecord = readObject(input);
    const resultRecord = parseResultObject(result);

    if (rawName === 'TaskCreate') {
      const task = readObject(resultRecord?.task);
      const id = readId(task) ?? readId(inputRecord);
      const text = readText(inputRecord) ?? readText(task);
      if (!id || !text) {
        return undefined;
      }

      const activeText = readActiveText(inputRecord) ?? readActiveText(task);
      this.claudeItems.set(id, {
        id,
        text,
        status: normalizeStatus(inputRecord?.status),
        ...(activeText ? { active_text: activeText } : {}),
      });
      return this.emitClaudeSnapshot('TaskCreate');
    }

    if (rawName === 'TaskUpdate') {
      if (!inputRecord || resultRecord?.success === false) {
        return undefined;
      }

      const id = readId(inputRecord) ?? readId(resultRecord);
      if (!id) {
        return undefined;
      }

      if (inputRecord.status === 'deleted') {
        this.claudeItems.delete(id);
        return this.emitClaudeSnapshot('TaskUpdate');
      }

      const current = this.claudeItems.get(id);
      const text = readText(inputRecord) ?? current?.text ?? `Task ${id}`;
      const activeText = readActiveText(inputRecord) ?? current?.active_text;
      this.claudeItems.set(id, {
        id,
        text,
        status: normalizeStatus(inputRecord.status, current?.status),
        ...(activeText ? { active_text: activeText } : {}),
      });
      return this.emitClaudeSnapshot('TaskUpdate');
    }

    if (rawName === 'TaskList') {
      if (!Array.isArray(resultRecord?.tasks)) {
        return undefined;
      }

      this.claudeItems = new Map(
        resultRecord.tasks
          .map((value, index) => itemFromRecord(value, `task-${index}`))
          .filter((value): value is TodoSnapshotItemV1 => Boolean(value))
          .map((item) => [item.id, item]),
      );
      return this.emitClaudeSnapshot('TaskList');
    }

    return undefined;
  }

  fromCodexTodoList(item: unknown): TodoSnapshotV1 | undefined {
    const snapshot = snapshotFromCodexTodoList(item, this.revision + 1);
    if (!snapshot) {
      return undefined;
    }
    this.revision = snapshot.revision;
    return snapshot;
  }

  private emitClaudeSnapshot(
    source: Extract<TodoSnapshotV1['source'], 'TodoWrite' | 'TaskCreate' | 'TaskUpdate' | 'TaskList'>,
  ): TodoSnapshotV1 {
    this.revision += 1;
    return {
      version: 1,
      provider: 'claude',
      source,
      revision: this.revision,
      items: Array.from(this.claudeItems.values(), cloneItem),
    };
  }
}
