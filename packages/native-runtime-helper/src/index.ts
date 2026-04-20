import { query, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { Codex } from '@openai/codex-sdk';
import { createInterface } from 'node:readline';
import process from 'node:process';

type NativeProvider = 'claude' | 'codex';

type InitCommand = {
  type: 'init';
  provider: NativeProvider;
  env_name: string;
  perm_mode: string;
  working_dir: string;
  env_vars?: Record<string, string>;
  initial_prompt?: string | null;
  provider_session_id?: string | null;
  claude_path?: string | null;
  codex_path?: string | null;
  codex_base_url?: string | null;
  codex_api_key?: string | null;
};

type PromptCommand = {
  type: 'prompt';
  text: string;
};

type PermissionResponseCommand = {
  type: 'permission_response';
  request_id: string;
  approved: boolean;
};

type StopCommand = {
  type: 'stop';
};

type InputCommand = InitCommand | PromptCommand | PermissionResponseCommand | StopCommand;

type HelperOutput =
  | {
      type: 'event';
      payload: Record<string, unknown>;
    }
  | {
      type: 'session_meta';
      provider_session_id: string;
    }
  | {
      type: 'status';
      status: string;
      detail?: string;
    };

type PermissionResolver = {
  resolve: (approved: boolean) => void;
};

let initCommand: InitCommand | null = null;
let stopped = false;
let activeTurn = false;
let currentProviderSessionId: string | null = null;
let currentAbortController: AbortController | null = null;
let currentClaudeQuery: ReturnType<typeof query> | null = null;
let claudeInputQueue: AsyncMessageQueue<SDKUserMessage> | null = null;
let claudeConsumeLoop: Promise<void> | null = null;
let claudeLastSessionState: 'idle' | 'running' | 'requires_action' | null = null;
let claudeSawPartialText = false;
let claudeSawPartialThinking = false;
let claudeTurnCompletionEmitted = false;
let codexClient: Codex | null = null;
let codexThread: any = null;
const promptQueue: string[] = [];
const pendingPermissions = new Map<string, PermissionResolver>();
const startedToolNames = new Map<string, string>();
const completedToolUseIds = new Set<string>();

class AsyncMessageQueue<T> implements AsyncIterable<T> {
  private items: T[] = [];
  private resolvers: Array<(result: IteratorResult<T>) => void> = [];
  private closed = false;

  push(item: T) {
    if (this.closed) {
      throw new Error('Message queue is closed');
    }

    const resolver = this.resolvers.shift();
    if (resolver) {
      resolver({ value: item, done: false });
      return;
    }

    this.items.push(item);
  }

  close() {
    this.closed = true;
    while (this.resolvers.length > 0) {
      this.resolvers.shift()?.({ value: undefined as T, done: true });
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    while (true) {
      if (this.items.length > 0) {
        yield this.items.shift() as T;
        continue;
      }

      if (this.closed) {
        return;
      }

      const next = await new Promise<IteratorResult<T>>((resolve) => {
        this.resolvers.push(resolve);
      });

      if (next.done) {
        return;
      }

      yield next.value;
    }
  }
}

function emit(output: HelperOutput) {
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

function emitStatus(status: string, detail?: string) {
  emit({ type: 'status', status, detail });
}

function emitEvent(payload: Record<string, unknown>) {
  emit({ type: 'event', payload });
}

function emitSessionMeta(providerSessionId: string) {
  if (!providerSessionId) {
    return;
  }
  currentProviderSessionId = providerSessionId;
  emit({ type: 'session_meta', provider_session_id: providerSessionId });
}

function toolCategory(rawName: string, category?: 'execution' | 'file_op' | 'search' | 'task_mgmt' | 'unknown') {
  const normalized = category ?? 'unknown';
  return {
    category: normalized,
    raw_name: rawName,
  };
}

function userInputToolCategory(rawName: string, kind: 'question' | 'plan_entry' | 'plan_exit') {
  return {
    category: 'user_input' as const,
    kind,
    raw_name: rawName,
  };
}

function summarizeUnknown(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value == null) {
    return '';
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function compactJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function truncateSummary(value: string, maxLength = 160): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return '';
  }
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

function getClaudeContentBlocks(message: unknown): Array<Record<string, unknown>> {
  const content = (message as { content?: Array<Record<string, unknown>> } | undefined)?.content;
  if (!Array.isArray(content)) {
    return [];
  }
  return content;
}

function extractClaudeAssistantContent(message: unknown): { text: string; thinking: string[] } {
  const content = getClaudeContentBlocks(message);

  const text: string[] = [];
  const thinking: string[] = [];

  content.forEach((block) => {
    if (block?.type === 'text' && typeof block.text === 'string') {
      text.push(block.text);
      return;
    }

    if (block?.type === 'thinking' && typeof block.thinking === 'string') {
      thinking.push(block.thinking);
    }
  });

  return {
    text: text.join(''),
    thinking,
  };
}

function extractClaudeAssistantText(message: unknown): string {
  return extractClaudeAssistantContent(message).text;
}

function extractClaudeAssistantThinking(message: unknown): string[] {
  return extractClaudeAssistantContent(message).thinking;
}

function uniqueNonEmptyTextEntries(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    next.push(trimmed);
  });

  return next;
}

function resetClaudeTurnTracking() {
  claudeSawPartialText = false;
  claudeSawPartialThinking = false;
  claudeTurnCompletionEmitted = false;
}

function categorizeClaudeTool(name: string) {
  if (name.includes('AskUser') || name.includes('Question')) {
    return userInputToolCategory(name, 'question');
  }

  if (name.includes('PlanMode') && name.includes('Enter')) {
    return userInputToolCategory(name, 'plan_entry');
  }

  if (name.includes('PlanMode') && name.includes('Exit')) {
    return userInputToolCategory(name, 'plan_exit');
  }

  switch (name) {
    case 'Bash':
    case 'BashOutput':
    case 'KillShell':
      return toolCategory(name, 'execution');
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return toolCategory(name, 'file_op');
    case 'Glob':
    case 'Grep':
    case 'LSP':
    case 'WebFetch':
    case 'WebSearch':
    case 'ToolSearch':
      return toolCategory(name, 'search');
    default:
      if (name.includes('Task') || name.includes('Todo')) {
        return toolCategory(name, 'task_mgmt');
      }
      return toolCategory(name, 'unknown');
  }
}

function summarizeQuestionInput(input: Record<string, unknown>) {
  const questions = Array.isArray(input.questions) ? input.questions : [];
  const firstQuestion = questions[0];
  if (!firstQuestion || typeof firstQuestion !== 'object') {
    return null;
  }

  const questionText = typeof firstQuestion.question === 'string'
    ? firstQuestion.question.trim()
    : '';
  if (!questionText) {
    return null;
  }

  return truncateSummary(`需要用户回答 ${questions.length} 个问题：${questionText}`);
}

function extractStringField(
  input: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function summarizeClaudeToolInput(
  toolName: string,
  input: Record<string, unknown>,
  options?: {
    title?: string;
    description?: string;
    blockedPath?: string;
    decisionReason?: string;
  },
) {
  const questionSummary = summarizeQuestionInput(input);
  if (questionSummary) {
    return questionSummary;
  }

  if (toolName.includes('PlanMode') && toolName.includes('Exit')) {
    const planSummary = extractStringField(input, ['plan']);
    if (planSummary) {
      return truncateSummary(planSummary);
    }
  }

  if (toolName === 'Bash') {
    const command = extractStringField(input, ['command']);
    if (command) {
      return truncateSummary(command);
    }
  }

  const pathLikeValue = extractStringField(input, [
    'file_path',
    'path',
    'target_file',
    'pattern',
    'query',
  ]);
  if (pathLikeValue) {
    return truncateSummary(pathLikeValue);
  }

  const displayReason = [
    options?.title,
    options?.description,
    options?.blockedPath,
    options?.decisionReason,
  ].find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  if (displayReason) {
    return truncateSummary(displayReason);
  }

  return truncateSummary(compactJson(input));
}

function parseClaudeInteractiveToolPrompt(name: string, input: Record<string, unknown>) {
  if (name.includes('AskUser') || name.includes('Question')) {
    const questions = Array.isArray(input.questions)
      ? input.questions
        .map((value) => {
          if (!value || typeof value !== 'object' || typeof value.question !== 'string') {
            return null;
          }

          const options = Array.isArray(value.options)
            ? value.options
              .map((option) => {
                if (!option || typeof option !== 'object' || typeof option.label !== 'string') {
                  return null;
                }

                const label = option.label.trim();
                if (!label) {
                  return null;
                }

                return {
                  label,
                  description: typeof option.description === 'string' && option.description.trim()
                    ? option.description.trim()
                    : undefined,
                  preview: typeof option.preview === 'string' && option.preview.trim()
                    ? option.preview.trim()
                    : undefined,
                };
              })
              .filter((option): option is {
                label: string;
                description?: string;
                preview?: string;
              } => Boolean(option))
            : [];

          return {
            question: value.question.trim(),
            header: typeof value.header === 'string' && value.header.trim()
              ? value.header.trim()
              : undefined,
            multiSelect: value.multiSelect === true,
            options,
          };
        })
        .filter((question): question is {
          question: string;
          header?: string;
          multiSelect: boolean;
          options: Array<{ label: string; description?: string; preview?: string }>;
        } => Boolean(question))
      : [];

    return {
      prompt_type: 'ask_user_question' as const,
      questions,
    };
  }

  if (name.includes('PlanMode') && name.includes('Enter')) {
    return {
      prompt_type: 'plan_entry' as const,
    };
  }

  if (name.includes('PlanMode') && name.includes('Exit')) {
    const allowedPrompts = Array.isArray(input.allowedPrompts)
      ? input.allowedPrompts
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
      : [];
    const planSummary = extractStringField(input, ['plan']);

    return {
      prompt_type: 'plan_exit' as const,
      allowed_prompts: allowedPrompts,
      plan_summary: planSummary || undefined,
    };
  }

  return undefined;
}

function emitClaudeToolUseStarted(payload: {
  toolUseId: string;
  rawName: string;
  inputSummary: string;
  needsResponse: boolean;
  prompt?: Record<string, unknown>;
}) {
  if (!payload.toolUseId || startedToolNames.has(payload.toolUseId)) {
    return;
  }

  startedToolNames.set(payload.toolUseId, payload.rawName);
  emitEvent({
    type: 'tool_use_started',
    tool_use_id: payload.toolUseId,
    category: categorizeClaudeTool(payload.rawName),
    raw_name: payload.rawName,
    input_summary: payload.inputSummary,
    needs_response: payload.needsResponse,
    ...(payload.prompt ? { prompt: payload.prompt } : {}),
  });
}

function emitClaudeToolUseCompleted(toolUseId: string, resultSummary: string, success: boolean) {
  if (!toolUseId || completedToolUseIds.has(toolUseId)) {
    return;
  }

  completedToolUseIds.add(toolUseId);
  const rawName = startedToolNames.get(toolUseId) ?? 'tool';
  startedToolNames.delete(toolUseId);
  emitEvent({
    type: 'tool_use_completed',
    tool_use_id: toolUseId,
    raw_name: rawName,
    result_summary: resultSummary,
    success,
  });
}

function summarizeClaudeToolResult(block: Record<string, unknown>) {
  const content = block.content;
  if (typeof content === 'string' && content.trim()) {
    return truncateSummary(content);
  }

  if (Array.isArray(content)) {
    const text = content
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry.trim();
        }
        if (entry && typeof entry === 'object' && typeof entry.text === 'string') {
          return entry.text.trim();
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
    if (text) {
      return truncateSummary(text);
    }
  }

  if (
    content
    && typeof content === 'object'
    && typeof (content as { text?: string }).text === 'string'
    && (content as { text: string }).text.trim()
  ) {
    return truncateSummary((content as { text: string }).text);
  }

  return truncateSummary(compactJson(content ?? block));
}

function normalizeClaudePermissionMode(permMode: string) {
  switch (permMode) {
    case 'yolo':
      return {
        permissionMode: 'bypassPermissions' as const,
        allowDangerouslySkipPermissions: true,
      };
    case 'readonly':
    case 'safe':
    case 'audit':
    case 'ci':
      return {
        permissionMode: 'dontAsk' as const,
        allowDangerouslySkipPermissions: false,
      };
    default:
      return {
        permissionMode: 'default' as const,
        allowDangerouslySkipPermissions: false,
      };
  }
}

function normalizeCodexSandboxMode(permMode: string) {
  if (permMode === 'yolo') {
    return {
      sandboxMode: 'danger-full-access' as const,
      approvalPolicy: 'never' as const,
    };
  }
  if (permMode === 'readonly' || permMode === 'audit' || permMode === 'ci') {
    return {
      sandboxMode: 'read-only' as const,
      approvalPolicy: 'never' as const,
    };
  }
  return {
    sandboxMode: 'workspace-write' as const,
    approvalPolicy: 'on-request' as const,
  };
}

async function waitForPermission(
  toolName: string,
  input: Record<string, unknown>,
  options: {
    toolUseID: string;
    title?: string;
    description?: string;
    displayName?: string;
    blockedPath?: string;
    decisionReason?: string;
  },
) {
  const toolUseId = options.toolUseID;
  const requestId = `${toolUseId}:${Date.now()}`;
  const inputSummary = summarizeClaudeToolInput(toolName, input, options);

  emitClaudeToolUseStarted({
    toolUseId,
    rawName: toolName,
    inputSummary,
    needsResponse: false,
  });
  emitEvent({
    type: 'permission_required',
    request_id: requestId,
    tool_name: options.displayName || toolName,
    input_summary: inputSummary,
  });

  const approved = await new Promise<boolean>((resolve) => {
    pendingPermissions.set(requestId, { resolve });
  });

  emitEvent({
    type: 'permission_responded',
    request_id: requestId,
    approved,
    responder: 'desktop',
  });

  if (!approved) {
    emitClaudeToolUseCompleted(toolUseId, 'Permission denied in desktop workspace.', false);
  }

  return approved
    ? { behavior: 'allow' as const, toolUseID: toolUseId }
    : { behavior: 'deny' as const, message: 'Permission denied in desktop workspace.', toolUseID: toolUseId };
}

function handleClaudePartialEvent(rawEvent: Record<string, unknown>) {
  if (rawEvent.type === 'message_start') {
    resetClaudeTurnTracking();
    return;
  }

  if (rawEvent.type !== 'content_block_delta') {
    return;
  }

  const delta = rawEvent.delta as Record<string, unknown> | undefined;
  if (!delta || typeof delta.type !== 'string') {
    return;
  }

  if (delta.type === 'text_delta' && typeof delta.text === 'string' && delta.text) {
    claudeSawPartialText = true;
    emitEvent({
      type: 'assistant_chunk',
      text: delta.text,
    });
    return;
  }

  if (delta.type === 'thinking_delta' && typeof delta.thinking === 'string' && delta.thinking) {
    claudeSawPartialThinking = true;
    emitEvent({
      type: 'system_message',
      message: delta.thinking,
    });
  }
}

async function consumeClaudeMessages() {
  if (!initCommand) {
    throw new Error('Native runtime helper not initialized');
  }

  const permission = normalizeClaudePermissionMode(initCommand.perm_mode);
  const env = {
    ...process.env,
    ...initCommand.env_vars,
    CLAUDE_AGENT_SDK_CLIENT_APP: 'ccem-desktop',
  };

  claudeInputQueue = new AsyncMessageQueue<SDKUserMessage>();
  currentClaudeQuery = query({
    prompt: claudeInputQueue,
    options: {
      cwd: initCommand.working_dir,
      env,
      resume: currentProviderSessionId ?? undefined,
      pathToClaudeCodeExecutable: initCommand.claude_path ?? undefined,
      includePartialMessages: true,
      includeHookEvents: true,
      persistSession: true,
      canUseTool: async (toolName, input, options) => {
        return waitForPermission(toolName, input, options);
      },
      ...permission,
    },
  });

  for await (const message of currentClaudeQuery) {
    const sessionId = (message as { session_id?: string } | undefined)?.session_id;
    if (sessionId) {
      emitSessionMeta(sessionId);
    }

    if (message.type === 'stream_event') {
      const event = (message as { event?: Record<string, unknown> }).event;
      if (event) {
        handleClaudePartialEvent(event);
      }
      continue;
    }

    if (message.type === 'assistant') {
      const contentBlocks = getClaudeContentBlocks(message.message);
      const emittedThinking = new Set<string>();
      contentBlocks.forEach((block) => {
        if (block.type === 'thinking' && typeof block.thinking === 'string' && block.thinking) {
          const thinking = block.thinking.trim();
          if (!thinking || claudeSawPartialThinking || emittedThinking.has(thinking)) {
            return;
          }
          emittedThinking.add(thinking);
          emitEvent({
            type: 'system_message',
            message: thinking,
          });
          return;
        }

        if (block.type === 'text' && typeof block.text === 'string' && block.text && !claudeSawPartialText) {
          emitEvent({
            type: 'assistant_chunk',
            text: block.text,
          });
          return;
        }

        if (
          block.type === 'tool_use'
          && typeof block.id === 'string'
          && typeof block.name === 'string'
          && block.name
        ) {
          const input = block.input && typeof block.input === 'object'
            ? block.input as Record<string, unknown>
            : {};
          const prompt = parseClaudeInteractiveToolPrompt(block.name, input);
          const category = categorizeClaudeTool(block.name);
          const needsResponse = category.category === 'user_input'
            && (category.kind === 'question' || category.kind === 'plan_exit');
          emitClaudeToolUseStarted({
            toolUseId: block.id,
            rawName: block.name,
            inputSummary: summarizeClaudeToolInput(block.name, input),
            needsResponse,
            prompt,
          });
        }
      });
      continue;
    }

    if (message.type === 'user') {
      const contentBlocks = getClaudeContentBlocks(message.message);
      contentBlocks.forEach((block) => {
        if (block.type !== 'tool_result' || typeof block.tool_use_id !== 'string') {
          return;
        }
        emitClaudeToolUseCompleted(
          block.tool_use_id,
          summarizeClaudeToolResult(block),
          block.is_error !== true,
        );
      });
      continue;
    }

    if (message.type === 'tool_progress') {
      emitClaudeToolUseStarted({
        toolUseId: message.tool_use_id,
        rawName: message.tool_name,
        inputSummary: `Running ${message.tool_name}`,
        needsResponse: false,
      });
      continue;
    }

    if (message.type === 'tool_use_summary') {
      for (const toolUseId of message.preceding_tool_use_ids) {
        emitClaudeToolUseCompleted(toolUseId, message.summary, true);
      }
      continue;
    }

    if (message.type === 'system' && message.subtype === 'status') {
      const statusLabel = message.status || 'idle';
      emitEvent({
        type: 'lifecycle',
        stage: 'status',
        detail: `Claude status: ${statusLabel}`,
      });
      continue;
    }

    if (message.type === 'system' && message.subtype === 'session_state_changed') {
      if (message.state !== claudeLastSessionState) {
        if (message.state === 'running') {
          claudeTurnCompletionEmitted = false;
          emitEvent({
            type: 'lifecycle',
            stage: 'turn_started',
            detail: 'Claude is processing a turn.',
          });
          emitStatus('processing', 'Claude is processing a turn.');
        }

        if (message.state === 'idle' && !claudeTurnCompletionEmitted) {
          claudeTurnCompletionEmitted = true;
          emitEvent({
            type: 'lifecycle',
            stage: 'turn_completed',
            detail: 'Claude turn completed.',
          });
          emitStatus('ready', 'Ready for the next prompt.');
        }
      }

      claudeLastSessionState = message.state;
      continue;
    }

    if (message.type === 'result') {
      if (message.subtype === 'success') {
        if (!claudeTurnCompletionEmitted) {
          claudeTurnCompletionEmitted = true;
          emitEvent({
            type: 'lifecycle',
            stage: 'turn_completed',
            detail: message.result || 'Claude turn completed.',
          });
          emitStatus('ready', 'Ready for the next prompt.');
        }
      } else {
        emitEvent({
          type: 'session_completed',
          reason: message.errors?.join('\n') || message.subtype,
        });
      }
      continue;
    }

    if (message.type === 'auth_status' && message.error) {
      emitEvent({
        type: 'stderr_line',
        line: message.error,
      });
    }
  }
}

async function ensureClaudeSession() {
  if (!initCommand) {
    throw new Error('Native runtime helper not initialized');
  }

  if (initCommand.provider !== 'claude') {
    return;
  }

  if (!claudeConsumeLoop) {
    claudeConsumeLoop = consumeClaudeMessages().catch((error) => {
      if (stopped) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      emitEvent({
        type: 'stderr_line',
        line: message,
      });
      emitEvent({
        type: 'session_completed',
        reason: message,
      });
      emitStatus('error', message);
    });
  }
}

function enqueueClaudePrompt(text: string) {
  if (!claudeInputQueue) {
    throw new Error('Claude streaming input queue is not ready');
  }

  resetClaudeTurnTracking();
  claudeInputQueue.push({
    type: 'user',
    message: {
      role: 'user',
      content: text,
    },
    parent_tool_use_id: null,
  });
  emitStatus('processing', 'Claude is processing a turn.');
}

function codexCategoryForItem(item: Record<string, unknown>) {
  switch (item.type) {
    case 'command_execution':
      return toolCategory(String(item.command || 'command'), 'execution');
    case 'file_change':
      return toolCategory('file_change', 'file_op');
    case 'web_search':
      return toolCategory('web_search', 'search');
    case 'todo_list':
      return toolCategory('todo_list', 'task_mgmt');
    default:
      return toolCategory(String(item.type || 'item'), 'unknown');
  }
}

function summarizeCodexItem(item: Record<string, unknown>) {
  if (typeof item.text === 'string') {
    return item.text;
  }
  if (typeof item.command === 'string') {
    return item.command;
  }
  if (Array.isArray(item.changes)) {
    return `${item.changes.length} file changes`;
  }
  if (typeof item.query === 'string') {
    return item.query;
  }
  return summarizeUnknown(item);
}

async function ensureCodexThread() {
  if (!initCommand) {
    throw new Error('Native runtime helper not initialized');
  }

  if (!codexClient) {
    codexClient = new Codex({
      codexPathOverride: initCommand.codex_path ?? undefined,
      baseUrl: initCommand.codex_base_url ?? undefined,
      apiKey: initCommand.codex_api_key ?? undefined,
      env: {
        ...process.env,
        ...initCommand.env_vars,
      },
    });
  }

  if (!codexThread) {
    const sandbox = normalizeCodexSandboxMode(initCommand.perm_mode);
    const threadOptions = {
      workingDirectory: initCommand.working_dir,
      networkAccessEnabled: true,
      skipGitRepoCheck: true,
      ...sandbox,
    };
    codexThread = currentProviderSessionId
      ? codexClient.resumeThread(currentProviderSessionId, threadOptions)
      : codexClient.startThread(threadOptions);

    if (currentProviderSessionId) {
      emitSessionMeta(currentProviderSessionId);
    }
  }

  return codexThread;
}

async function runCodexTurn(text: string) {
  const thread = await ensureCodexThread();
  currentAbortController = new AbortController();
  const streamed = await thread.runStreamed(text, {
    signal: currentAbortController.signal,
  });

  const seenTextByItem = new Map<string, string>();
  const seenReasoningByItem = new Map<string, string>();

  for await (const event of streamed.events) {
    if (event.type === 'thread.started') {
      emitSessionMeta(event.thread_id);
      continue;
    }

    if (event.type === 'turn.started') {
      emitEvent({
        type: 'lifecycle',
        stage: 'turn_started',
        detail: 'Codex is thinking…',
      });
      continue;
    }

    if (event.type === 'turn.completed') {
      emitEvent({
        type: 'lifecycle',
        stage: 'turn_completed',
        detail: `Turn completed · output ${event.usage.output_tokens} tokens`,
      });
      continue;
    }

    if (event.type === 'turn.failed') {
      emitEvent({
        type: 'session_completed',
        reason: event.error.message,
      });
      continue;
    }

    if (event.type === 'error') {
      emitEvent({
        type: 'stderr_line',
        line: event.message,
      });
      continue;
    }

    const item = event.item as Record<string, unknown>;

    if (item.type === 'agent_message') {
      const nextText = typeof item.text === 'string' ? item.text : '';
      const previousText = seenTextByItem.get(String(item.id)) || '';
      if (nextText.startsWith(previousText)) {
        const delta = nextText.slice(previousText.length);
        if (delta) {
          emitEvent({
            type: 'assistant_chunk',
            text: delta,
          });
        }
      } else if (nextText) {
        emitEvent({
          type: 'assistant_chunk',
          text: nextText,
        });
      }
      seenTextByItem.set(String(item.id), nextText);
      continue;
    }

    if (item.type === 'reasoning') {
      const itemId = String(item.id || 'reasoning');
      const nextText = typeof item.text === 'string' ? item.text : '';
      const previousText = seenReasoningByItem.get(itemId) || '';

      if (nextText.startsWith(previousText)) {
        const delta = nextText.slice(previousText.length);
        if (delta) {
          emitEvent({
            type: 'system_message',
            message: delta,
          });
        }
      } else if (nextText) {
        emitEvent({
          type: 'system_message',
          message: nextText,
        });
      }

      seenReasoningByItem.set(itemId, nextText);
      continue;
    }

    if (event.type === 'item.started') {
      emitEvent({
        type: 'tool_use_started',
        tool_use_id: String(item.id || `${item.type}-${Date.now()}`),
        category: codexCategoryForItem(item),
        raw_name: String(item.type || 'item'),
        input_summary: summarizeCodexItem(item),
        needs_response: false,
      });
      continue;
    }

    if (event.type === 'item.completed') {
      emitEvent({
        type: 'tool_use_completed',
        tool_use_id: String(item.id || `${item.type}-${Date.now()}`),
        raw_name: String(item.type || 'item'),
        result_summary: summarizeCodexItem(item),
        success: item.status !== 'failed',
      });
      continue;
    }
  }
}

async function runQueuedTurns() {
  if (activeTurn || !initCommand || stopped || initCommand.provider === 'claude') {
    return;
  }

  const nextPrompt = promptQueue.shift();
  if (!nextPrompt) {
    return;
  }

  activeTurn = true;
  emitStatus('processing', initCommand.provider === 'codex' ? 'Codex is processing a turn.' : 'Claude is processing a turn.');
  try {
    if (initCommand.provider === 'codex') {
      await runCodexTurn(nextPrompt);
    } else {
      await runClaudeTurn(nextPrompt);
    }
    if (!stopped) {
      emitStatus('ready', 'Ready for the next prompt.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitEvent({
      type: 'stderr_line',
      line: message,
    });
    emitEvent({
      type: 'session_completed',
      reason: message,
    });
    emitStatus('error', message);
  } finally {
    activeTurn = false;
    currentAbortController = null;
    if (!stopped) {
      void runQueuedTurns();
    }
  }
}

async function handleCommand(command: InputCommand) {
  if (command.type === 'init') {
    initCommand = command;
    currentProviderSessionId = command.provider_session_id ?? null;
    if (currentProviderSessionId) {
      emitSessionMeta(currentProviderSessionId);
    }
    emitStatus('ready', 'Native runtime helper initialized.');
    if (command.initial_prompt?.trim()) {
      if (command.provider === 'claude') {
        await ensureClaudeSession();
        enqueueClaudePrompt(command.initial_prompt.trim());
      } else {
        promptQueue.push(command.initial_prompt.trim());
        await runQueuedTurns();
      }
    } else if (command.provider === 'claude') {
      await ensureClaudeSession();
    }
    return;
  }

  if (command.type === 'permission_response') {
    const pending = pendingPermissions.get(command.request_id);
    if (pending) {
      pendingPermissions.delete(command.request_id);
      pending.resolve(command.approved);
    }
    return;
  }

  if (command.type === 'prompt') {
    if (!command.text.trim()) {
      return;
    }
    if (initCommand?.provider === 'claude') {
      await ensureClaudeSession();
      enqueueClaudePrompt(command.text.trim());
    } else {
      promptQueue.push(command.text.trim());
      await runQueuedTurns();
    }
    return;
  }

  if (command.type === 'stop') {
    stopped = true;
    currentAbortController?.abort();
    claudeInputQueue?.close();
    currentClaudeQuery?.close();
    emitStatus('stopped', 'Native runtime helper stopped.');
    setTimeout(() => process.exit(0), 20);
  }
}

const rl = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  if (!line.trim()) {
    return;
  }

  let command: InputCommand;
  try {
    command = JSON.parse(line) as InputCommand;
  } catch (error) {
    emitEvent({
      type: 'stderr_line',
      line: `Failed to parse command: ${error instanceof Error ? error.message : String(error)}`,
    });
    return;
  }

  void handleCommand(command);
});

rl.on('close', () => {
  if (!stopped) {
    emitStatus('stopped', 'Native runtime helper stdin closed.');
  }
});
