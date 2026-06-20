import type {
  ConversationContentBlock,
  ConversationMessageData,
} from '@/features/conversations/types';
import type { SessionEventRecord, SessionPromptImage } from '@/lib/tauri-ipc';

export const COMPACTING_SUMMARY_TOKEN = '__ccem_context_compacting__';
export const COMPACT_FAILED_SUMMARY_TOKEN = '__ccem_context_compact_failed__';

export interface LocalUserPrompt {
  id: string;
  text: string;
  images?: SessionPromptImage[];
  timestamp?: number;
  afterEventSeq?: number;
}

interface PendingAssistantTurn {
  id: string;
  timestamp?: number;
  contentBlocks: ConversationContentBlock[];
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
}

function parseOccurredAt(occurredAt: string): number | undefined {
  const parsed = Date.parse(occurredAt);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cloneContent(content: ConversationMessageData['content']): ConversationMessageData['content'] {
  if (Array.isArray(content)) {
    return content.map((block) => ({ ...block }));
  }

  if (content && typeof content === 'object') {
    return { ...(content as ConversationContentBlock) };
  }

  return content;
}

function cloneMessages(messages: ConversationMessageData[]): ConversationMessageData[] {
  return messages.map((message) => ({
    ...message,
    content: cloneContent(message.content),
  }));
}

function createUserMessage(prompt: LocalUserPrompt): ConversationMessageData {
  const imageBlocks = createPromptImageBlocks(prompt.images);
  if (imageBlocks.length > 0) {
    const displayText = removeRenderedImageSummary(prompt.text, imageBlocks.length);
    const content: ConversationContentBlock[] = [];
    if (displayText) {
      content.push({ type: 'text', text: displayText });
    }
    content.push(...imageBlocks);

    return {
      msgType: 'user',
      uuid: prompt.id,
      content,
      timestamp: prompt.timestamp,
      segmentIndex: 0,
      isCompactBoundary: false,
    };
  }

  return {
    msgType: 'user',
    uuid: prompt.id,
    content: prompt.text,
    timestamp: prompt.timestamp,
    segmentIndex: 0,
    isCompactBoundary: false,
  };
}

function createPromptImageBlocks(images?: SessionPromptImage[] | null): ConversationContentBlock[] {
  if (!images?.length) {
    return [];
  }

  return images
    .map((image, index) => {
      const hasInlineData = typeof image.base64Data === 'string' && image.base64Data.length > 0;
      const hasStoredData = typeof image.storagePath === 'string' && image.storagePath.length > 0;
      if (
        typeof image.mediaType !== 'string'
        || !image.mediaType.startsWith('image/')
        || (!hasInlineData && !hasStoredData)
      ) {
        return null;
      }

      const block: ConversationContentBlock = {
        type: 'image',
        mediaType: image.mediaType,
        placeholder: image.placeholder || `[Image #${index + 1}]`,
      };
      if (hasInlineData) {
        block.base64Data = image.base64Data;
      }
      if (hasStoredData) {
        block.storagePath = image.storagePath;
      }
      if (image.sha256) {
        block.sha256 = image.sha256;
      }
      if (image.byteSize) {
        block.byteSize = image.byteSize;
      }
      return block;
    })
    .filter((block): block is ConversationContentBlock => block != null);
}

function removeRenderedImageSummary(text: string, imageCount: number): string {
  if (imageCount <= 0) {
    return text.trim();
  }

  return text
    .split('\n')
    .filter((line) => !/^Images attached:\s*\d+\s*$/.test(line.trim()))
    .join('\n')
    .trim();
}

function promptTextKey(text: string | null | undefined): string {
  return (text ?? '').trim();
}

function messageContentText(content: ConversationMessageData['content']): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  const blockText = (block: ConversationContentBlock): string => {
    if (typeof block.text === 'string') {
      return block.text;
    }
    if (block.type === 'image' && typeof block.placeholder === 'string') {
      return block.placeholder;
    }
    if (typeof block.thinking === 'string') {
      return block.thinking;
    }
    if (typeof block.content === 'string') {
      return block.content;
    }
    return '';
  };

  if (Array.isArray(content)) {
    return content.map(blockText).filter(Boolean).join('\n').trim();
  }

  if (content && typeof content === 'object') {
    return blockText(content as ConversationContentBlock).trim();
  }

  return '';
}

function promptMatchesMessage(promptText: string, messageText: string): boolean {
  const prompt = promptTextKey(promptText);
  const message = promptTextKey(messageText);
  if (!prompt || !message) {
    return false;
  }
  if (prompt === message) {
    return true;
  }

  return prompt.length >= 8 && message.includes(prompt);
}

export function filterConfirmedLocalUserPrompts(
  prompts: LocalUserPrompt[],
  events: SessionEventRecord[],
): LocalUserPrompt[] {
  if (prompts.length === 0 || events.length === 0) {
    return prompts;
  }

  const confirmedCounts = new Map<string, number>();
  for (const event of events) {
    if (event.payload.type !== 'user_prompt') {
      continue;
    }
    const key = promptTextKey(event.payload.text);
    if (!key) {
      continue;
    }
    confirmedCounts.set(key, (confirmedCounts.get(key) ?? 0) + 1);
  }

  if (confirmedCounts.size === 0) {
    return prompts;
  }

  return prompts.filter((prompt) => {
    const key = promptTextKey(prompt.text);
    const count = confirmedCounts.get(key) ?? 0;
    if (count <= 0) {
      return true;
    }
    if (count === 1) {
      confirmedCounts.delete(key);
    } else {
      confirmedCounts.set(key, count - 1);
    }
    return false;
  });
}

export function splitLocalUserPromptsForReplay(
  prompts: LocalUserPrompt[],
): {
  initialPrompt: LocalUserPrompt | undefined;
  remainingPrompts: LocalUserPrompt[];
} {
  const [firstPrompt, ...restPrompts] = prompts;
  if (firstPrompt?.id === 'initial-user') {
    return {
      initialPrompt: firstPrompt,
      remainingPrompts: restPrompts,
    };
  }

  return {
    initialPrompt: undefined,
    remainingPrompts: prompts,
  };
}

export function trimSeedMessagesBeforeFirstUserPrompt(
  seedMessages: ConversationMessageData[],
  events: SessionEventRecord[],
): ConversationMessageData[] {
  if (seedMessages.length === 0 || events.length === 0) {
    return seedMessages;
  }

  const firstPersistedPrompt = events.find((event) =>
    event.payload.type === 'user_prompt'
    && promptTextKey(event.payload.text),
  );
  if (!firstPersistedPrompt || firstPersistedPrompt.payload.type !== 'user_prompt') {
    return seedMessages;
  }

  const promptText = firstPersistedPrompt.payload.text;
  const boundaryIndex = seedMessages.findIndex((message) =>
    (message.msgType === 'user' || message.msgType === 'human')
    && promptMatchesMessage(promptText, messageContentText(message.content)),
  );

  return boundaryIndex >= 0 ? seedMessages.slice(0, boundaryIndex) : seedMessages;
}

function createAssistantTextMessage(
  id: string,
  text: string,
  occurredAt?: number,
  metadata: Partial<Pick<
    ConversationMessageData,
    | 'inputTokens'
    | 'outputTokens'
    | 'cacheCreationTokens'
    | 'cacheReadTokens'
  >> = {},
): ConversationMessageData {
  return {
    msgType: 'assistant',
    uuid: id,
    content: text,
    timestamp: occurredAt,
    segmentIndex: 0,
    isCompactBoundary: false,
    ...metadata,
  };
}

function createSummaryMessage(
  id: string,
  summary: string,
  occurredAt?: number,
): ConversationMessageData {
  return {
    msgType: 'summary',
    uuid: id,
    content: null,
    summary,
    timestamp: occurredAt,
    segmentIndex: 0,
    isCompactBoundary: false,
  };
}

function createCompactBoundaryMessage(
  id: string,
  occurredAt?: number,
): ConversationMessageData {
  return {
    msgType: 'compact_boundary',
    uuid: id,
    content: 'Conversation compacted',
    timestamp: occurredAt,
    segmentIndex: 0,
    isCompactBoundary: true,
  };
}

function createToolResultMessage(
  id: string,
  toolUseId: string,
  resultContent: string,
  success: boolean,
  occurredAt?: number,
): ConversationMessageData {
  return {
    msgType: 'user',
    uuid: id,
    content: [{
      type: 'tool_result',
      tool_use_id: toolUseId,
      content: resultContent,
      is_error: !success,
    }],
    timestamp: occurredAt,
    segmentIndex: 0,
    isCompactBoundary: false,
  };
}

export function buildBaseMessages(
  seedMessages: ConversationMessageData[],
  firstPrompt: LocalUserPrompt | undefined,
): ConversationMessageData[] {
  const base = cloneMessages(seedMessages);
  if (firstPrompt) {
    base.push(createUserMessage(firstPrompt));
  }
  return base;
}

function createAssistantTurnMessage(
  pendingTurn: PendingAssistantTurn,
): ConversationMessageData | null {
  const contentBlocks = pendingTurn.contentBlocks.filter((block) => {
    if (block.type === 'text') {
      return Boolean(block.text?.trim());
    }
    if (block.type === 'thinking') {
      return Boolean((block.thinking || block.text || '').trim());
    }
    return true;
  });

  if (contentBlocks.length === 0) {
    return null;
  }

  if (contentBlocks.length === 1 && contentBlocks[0]?.type === 'text') {
    return createAssistantTextMessage(
      pendingTurn.id,
      contentBlocks[0].text || '',
      pendingTurn.timestamp,
      {
        inputTokens: pendingTurn.inputTokens,
        outputTokens: pendingTurn.outputTokens,
        cacheCreationTokens: pendingTurn.cacheCreationTokens,
        cacheReadTokens: pendingTurn.cacheReadTokens,
      },
    );
  }

  return {
    msgType: 'assistant',
    uuid: pendingTurn.id,
    content: contentBlocks,
    timestamp: pendingTurn.timestamp,
    segmentIndex: 0,
    isCompactBoundary: false,
    inputTokens: pendingTurn.inputTokens,
    outputTokens: pendingTurn.outputTokens,
    cacheCreationTokens: pendingTurn.cacheCreationTokens,
    cacheReadTokens: pendingTurn.cacheReadTokens,
  };
}

export function dedupeEvents(events: SessionEventRecord[]) {
  const seen = new Set<string>();
  const deduped: SessionEventRecord[] = [];

  for (const event of events) {
    const key = `${event.runtime_id}:${event.seq}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(event);
  }

  return deduped;
}

export function appendSessionEvents(
  previous: SessionEventRecord[],
  incoming: SessionEventRecord[],
  reset = false,
) {
  if (!incoming.length) {
    return reset ? [] : previous;
  }

  if (reset || previous.length === 0) {
    return dedupeEvents(incoming);
  }

  const lastPrevious = previous[previous.length - 1];
  let lastSeq = lastPrevious?.seq ?? 0;
  const isMonotonicAppend = Boolean(lastPrevious) && incoming.every((event) => {
    if (event.runtime_id !== lastPrevious!.runtime_id || event.seq <= lastSeq) {
      return false;
    }
    lastSeq = event.seq;
    return true;
  });

  if (isMonotonicAppend) {
    return [...previous, ...incoming];
  }

  const seen = new Set(previous.map((event) => `${event.runtime_id}:${event.seq}`));
  const nextEvents: SessionEventRecord[] = [];
  for (const event of incoming) {
    const key = `${event.runtime_id}:${event.seq}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    nextEvents.push(event);
  }

  if (!nextEvents.length) {
    return previous;
  }

  return [...previous, ...nextEvents];
}

export function sessionEventsNeedSummaryRefresh(events: SessionEventRecord[]) {
  return events.some((event) => {
    switch (event.payload.type) {
      case 'session_completed':
      case 'stderr_line':
      case 'permission_required':
      case 'permission_responded':
      case 'terminal_prompt_required':
      case 'terminal_prompt_resolved':
        return true;
      case 'tool_use_completed':
        return event.payload.success === false;
      case 'lifecycle':
        return [
          'compacting',
          'compact_completed',
          'compact_failed',
          'error',
          'ready',
          'runtime_resume',
          'turn_completed',
          'turn_interrupted',
        ].includes(event.payload.stage);
      default:
        return false;
    }
  });
}

const ACTIVE_TURN_LIFECYCLE_STAGES = new Set([
  'compacting',
  'initializing',
  'processing',
  'turn_started',
]);

const CLOSED_TURN_LIFECYCLE_STAGES = new Set([
  'error',
  'handoff',
  'idle',
  'interrupted',
  'ready',
  'stopped',
  'turn_completed',
  'turn_interrupted',
]);

const STALE_PROCESSING_EVENT_MS = 10 * 60 * 1000;

function latestEventTime(events: SessionEventRecord[]): number | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const occurredAt = parseOccurredAt(events[index]!.occurred_at);
    if (occurredAt != null) {
      return occurredAt;
    }
  }
  return null;
}

function inferProcessingFromLifecycleEvents(events: SessionEventRecord[]): boolean | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const payload = events[index]!.payload;
    if (payload.type !== 'lifecycle') {
      continue;
    }

    if (CLOSED_TURN_LIFECYCLE_STAGES.has(payload.stage)) {
      return false;
    }
    if (ACTIVE_TURN_LIFECYCLE_STAGES.has(payload.stage)) {
      return true;
    }
  }

  return null;
}

export function shouldTreatNativeSessionAsProcessing(
  status: string,
  events: SessionEventRecord[],
  nowMs = Date.now(),
) {
  if (status === 'initializing') {
    return true;
  }
  if (status !== 'processing') {
    return false;
  }

  const inferred = inferProcessingFromLifecycleEvents(events);
  if (inferred === false) {
    return false;
  }

  if (inferred === true) {
    const latestTime = latestEventTime(events);
    if (latestTime != null && nowMs - latestTime > STALE_PROCESSING_EVENT_MS) {
      return false;
    }
    return true;
  }

  return true;
}

function stableUnknownEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;

  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function shallowEqualContentBlock(
  block: ConversationContentBlock,
  next: ConversationContentBlock,
): boolean {
  if (block.type !== next.type) return false;

  switch (block.type) {
    case 'text':
      return block.text === next.text;
    case 'thinking':
      return (block.thinking || block.text) === (next.thinking || next.text)
        && block._startedAt === next._startedAt
        && block._completedAt === next._completedAt;
    case 'tool_use':
      return block.id === next.id
        && block.name === next.name
        && stableUnknownEqual(block.input, next.input)
        && block._startedAt === next._startedAt
        && block._completedAt === next._completedAt
        && stableUnknownEqual(block._result, next._result)
        && block._resultError === next._resultError;
    case 'tool_result':
      return block.tool_use_id === next.tool_use_id
        && stableUnknownEqual(block.content, next.content)
        && block.is_error === next.is_error;
    default:
      return stableUnknownEqual(block, next);
  }
}

function shallowEqualContent(
  a: ConversationMessageData['content'],
  b: ConversationMessageData['content'],
): boolean {
  if (a === b) return true;
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  if (a == null || b == null) return a === b;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((block, index) => shallowEqualContentBlock(block, b[index]!));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    return shallowEqualContentBlock(
      a as ConversationContentBlock,
      b as ConversationContentBlock,
    );
  }

  return false;
}

function shallowEqualMessages(
  previous: ConversationMessageData,
  next: ConversationMessageData,
): boolean {
  return previous.uuid === next.uuid
    && previous.msgType === next.msgType
    && previous.timestamp === next.timestamp
    && previous.segmentIndex === next.segmentIndex
    && previous.isCompactBoundary === next.isCompactBoundary
    && previous.planContent === next.planContent
    && previous.summary === next.summary
    && previous.model === next.model
    && previous.inputTokens === next.inputTokens
    && previous.outputTokens === next.outputTokens
    && previous.cacheCreationTokens === next.cacheCreationTokens
    && previous.cacheReadTokens === next.cacheReadTokens
    && shallowEqualContent(previous.content, next.content);
}

export function stabilizeMessageRefs(
  messages: ConversationMessageData[],
  previousMessages: ConversationMessageData[] | undefined,
): ConversationMessageData[] {
  if (!previousMessages?.length) {
    return messages;
  }

  const previousByUuid = new Map<string, ConversationMessageData>();
  for (const message of previousMessages) {
    if (message.uuid) {
      previousByUuid.set(message.uuid, message);
    }
  }

  let reusedAny = false;
  const stabilized = messages.map((message) => {
    if (!message.uuid) {
      return message;
    }
    const previous = previousByUuid.get(message.uuid);
    if (!previous || previous === message || !shallowEqualMessages(previous, message)) {
      return message;
    }
    reusedAny = true;
    return previous;
  });

  return reusedAny ? stabilized : messages;
}

function appendTextBlock(blocks: ConversationContentBlock[], text: string) {
  if (!text) {
    return;
  }

  const last = blocks[blocks.length - 1];
  if (last?.type === 'text') {
    blocks[blocks.length - 1] = {
      ...last,
      text: `${last.text || ''}${text}`,
    };
    return;
  }

  blocks.push({
    type: 'text',
    text,
  });
}

function appendThinkingBlock(
  blocks: ConversationContentBlock[],
  text: string,
  occurredAt?: number,
) {
  if (!text) {
    return;
  }

  const last = blocks[blocks.length - 1];
  if (last?.type === 'thinking') {
    blocks[blocks.length - 1] = {
      ...last,
      thinking: `${last.thinking || last.text || ''}${text}`,
      ...(occurredAt != null ? { _completedAt: occurredAt } : {}),
    };
    return;
  }

  blocks.push({
    type: 'thinking',
    thinking: text,
    ...(occurredAt != null ? { _startedAt: occurredAt, _completedAt: occurredAt } : {}),
  });
}

function attachToolResultToBlocks(
  blocks: ConversationContentBlock[],
  toolUseId: string,
  resultContent: string,
  success: boolean,
  occurredAt?: number,
) {
  let attached = false;
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index];
    if (block?.type !== 'tool_use' || block.id !== toolUseId) {
      continue;
    }
    blocks[index] = {
      ...block,
      _result: resultContent,
      _resultError: !success,
      ...(occurredAt != null ? { _completedAt: occurredAt } : {}),
    };
    attached = true;
    break;
  }
  return attached;
}

export function buildMessagesFromEvents(
  baseMessages: ConversationMessageData[],
  remainingPrompts: LocalUserPrompt[],
  events: SessionEventRecord[],
  terminalError?: string | null,
): ConversationMessageData[] {
  const next = [...baseMessages];
  let pendingTurn: PendingAssistantTurn | null = null;
  const hiddenInteractiveToolUseIds = new Set<string>();
  const emittedErrorTexts = new Set<string>();
  let promptQueue = [...remainingPrompts];

  const flushPrompt = (prompt: LocalUserPrompt) => {
    flushPendingTurn();
    next.push(createUserMessage(prompt));
  };

  const flushAnchoredPromptsBeforeEvent = (event: SessionEventRecord) => {
    if (promptQueue.length === 0) {
      return;
    }

    const remaining: LocalUserPrompt[] = [];
    for (const prompt of promptQueue) {
      if (prompt.afterEventSeq != null && event.seq > prompt.afterEventSeq) {
        flushPrompt(prompt);
      } else {
        remaining.push(prompt);
      }
    }
    promptQueue = remaining;
  };

  const flushFirstUnanchoredPrompt = () => {
    const index = promptQueue.findIndex((prompt) => prompt.afterEventSeq == null);
    if (index === -1) {
      return false;
    }
    flushPrompt(promptQueue[index]!);
    promptQueue = [
      ...promptQueue.slice(0, index),
      ...promptQueue.slice(index + 1),
    ];
    return true;
  };

  const attachToolResultToExistingMessages = (
    toolUseId: string,
    resultContent: string,
    success: boolean,
    occurredAt?: number,
  ) => {
    for (let index = next.length - 1; index >= 0; index -= 1) {
      const message = next[index];
      if (message.msgType !== 'assistant' && message.msgType !== 'ai') {
        continue;
      }
      if (!Array.isArray(message.content)) {
        continue;
      }
      const blocks = [...message.content];
      if (!attachToolResultToBlocks(blocks, toolUseId, resultContent, success, occurredAt)) {
        continue;
      }
      next[index] = {
        ...message,
        content: blocks,
        timestamp: occurredAt ?? message.timestamp,
      };
      return true;
    }
    return false;
  };

  const applyTokenUsageToMessage = (
    message: ConversationMessageData,
    payload: Extract<SessionEventRecord['payload'], { type: 'token_usage' }>,
  ): ConversationMessageData => {
    return {
      ...message,
      inputTokens: payload.input_tokens,
      outputTokens: payload.output_tokens,
      cacheReadTokens: payload.cache_read_tokens,
      cacheCreationTokens: payload.cache_creation_tokens,
    };
  };

  const applyTokenUsageToLatestAssistant = (
    payload: Extract<SessionEventRecord['payload'], { type: 'token_usage' }>,
  ) => {
    if (pendingTurn) {
      pendingTurn.inputTokens = payload.input_tokens;
      pendingTurn.outputTokens = payload.output_tokens;
      pendingTurn.cacheReadTokens = payload.cache_read_tokens;
      pendingTurn.cacheCreationTokens = payload.cache_creation_tokens;
      return;
    }

    for (let index = next.length - 1; index >= 0; index -= 1) {
      const message = next[index];
      if (message.msgType !== 'assistant' && message.msgType !== 'ai') {
        continue;
      }
      next[index] = applyTokenUsageToMessage(message, payload);
      return;
    }
  };

  const ensurePendingTurn = (event: SessionEventRecord, occurredAt?: number) => {
    if (!pendingTurn) {
      pendingTurn = {
        id: `assistant-turn-${event.seq}`,
        timestamp: occurredAt,
        contentBlocks: [],
      };
      return pendingTurn;
    }

    if (occurredAt != null) {
      pendingTurn.timestamp = occurredAt;
    }
    return pendingTurn;
  };

  const flushPendingTurn = () => {
    if (!pendingTurn) {
      return false;
    }

    const assistantMessage = createAssistantTurnMessage(pendingTurn);
    if (assistantMessage) {
      next.push(assistantMessage);
    }
    pendingTurn = null;
    return Boolean(assistantMessage);
  };

  const appendVisibleTurnDetail = (event: SessionEventRecord, occurredAt?: number) => {
    if (event.payload.type !== 'lifecycle') {
      return;
    }
    const detail = event.payload.detail?.trim();
    if (!detail) {
      return;
    }
    appendErrorMessage(`turn-detail-${event.seq}`, detail, occurredAt);
  };

  const appendErrorMessage = (id: string, text?: string | null, occurredAt?: number) => {
    const trimmedText = text?.trim();
    if (!trimmedText || emittedErrorTexts.has(trimmedText)) {
      return;
    }
    emittedErrorTexts.add(trimmedText);
    flushPendingTurn();
    next.push(createAssistantTextMessage(id, trimmedText, occurredAt));
  };

  const removeTrailingCompactingSummary = () => {
    const last = next[next.length - 1];
    if (last?.msgType === 'summary' && last.summary === COMPACTING_SUMMARY_TOKEN) {
      next.pop();
    }
  };

  const appendCompactingSummary = (event: SessionEventRecord, occurredAt?: number) => {
    const last = next[next.length - 1];
    if (last?.msgType === 'summary' && last.summary === COMPACTING_SUMMARY_TOKEN) {
      return;
    }
    next.push(createSummaryMessage(`compact-status-${event.seq}`, COMPACTING_SUMMARY_TOKEN, occurredAt));
  };

  const appendCompactBoundary = (event: SessionEventRecord, occurredAt?: number) => {
    removeTrailingCompactingSummary();
    const last = next[next.length - 1];
    if (last?.isCompactBoundary) {
      return;
    }
    next.push(createCompactBoundaryMessage(`compact-boundary-${event.seq}`, occurredAt));
  };

  const consumeMatchingPrompt = (text: string) => {
    const key = promptTextKey(text);
    if (!key || promptQueue.length === 0) {
      return;
    }
    const index = promptQueue.findIndex((prompt) => promptTextKey(prompt.text) === key);
    if (index === -1) {
      return;
    }
    promptQueue = [
      ...promptQueue.slice(0, index),
      ...promptQueue.slice(index + 1),
    ];
  };

  for (const event of events) {
    flushAnchoredPromptsBeforeEvent(event);
    const occurredAt = parseOccurredAt(event.occurred_at);

    switch (event.payload.type) {
      case 'user_prompt': {
        const images = event.payload.images?.filter(Boolean) ?? [];
        const text = event.payload.text?.trim()
          || (event.payload.image_count > 0 && images.length === 0
            ? `Images attached: ${event.payload.image_count}`
            : '');
        if (!text && images.length === 0) {
          break;
        }
        flushPendingTurn();
        next.push(createUserMessage({
          id: `user-prompt-${event.seq}`,
          text,
          images,
          timestamp: occurredAt,
        }));
        if (text) {
          consumeMatchingPrompt(text);
        }
        break;
      }
      case 'system_message': {
        appendThinkingBlock(
          ensurePendingTurn(event, occurredAt).contentBlocks,
          event.payload.message,
          occurredAt,
        );
        break;
      }
      case 'assistant_chunk': {
        appendTextBlock(ensurePendingTurn(event, occurredAt).contentBlocks, event.payload.text);
        break;
      }
      case 'tool_use_started': {
        if (event.payload.needs_response) {
          hiddenInteractiveToolUseIds.add(event.payload.tool_use_id);
          break;
        }
        ensurePendingTurn(event, occurredAt).contentBlocks.push({
          type: 'tool_use',
          id: event.payload.tool_use_id,
          name: event.payload.raw_name,
          input: event.payload.input_summary
            ? { summary: event.payload.input_summary }
            : {},
          ...(occurredAt != null ? { _startedAt: occurredAt } : {}),
        });
        break;
      }
      case 'tool_use_completed': {
        if (hiddenInteractiveToolUseIds.has(event.payload.tool_use_id)) {
          hiddenInteractiveToolUseIds.delete(event.payload.tool_use_id);
          break;
        }
        const resultContent = event.payload.result_content?.trim()
          ? event.payload.result_content
          : event.payload.result_summary;
        let attachedToPendingTurn = false;
        const currentPendingTurn = pendingTurn as PendingAssistantTurn | null;
        if (currentPendingTurn) {
          attachedToPendingTurn = attachToolResultToBlocks(
            currentPendingTurn.contentBlocks,
            event.payload.tool_use_id,
            resultContent,
            event.payload.success,
            occurredAt,
          );
        }
        if (
          attachedToPendingTurn
          || attachToolResultToExistingMessages(
            event.payload.tool_use_id,
            resultContent,
            event.payload.success,
            occurredAt,
          )
        ) {
          break;
        }
        if (!event.payload.success) {
          const fallbackName = event.payload.raw_name?.trim() || 'Tool';
          appendErrorMessage(
            `tool-result-error-${event.seq}`,
            event.payload.result_summary || `${fallbackName} failed.`,
            occurredAt,
          );
          break;
        }
        const resultBlock = {
          type: 'tool_result',
          tool_use_id: event.payload.tool_use_id,
          content: resultContent,
          is_error: !event.payload.success,
        };
        const last = next[next.length - 1];
        if (
          last
          && (last.msgType === 'user' || last.msgType === 'human')
          && Array.isArray(last.content)
          && last.content.every((block) => block.type === 'tool_result')
        ) {
          next[next.length - 1] = {
            ...last,
            content: [...last.content, resultBlock],
            timestamp: occurredAt ?? last.timestamp,
          };
        } else {
          next.push(
            createToolResultMessage(
              `tool-result-${event.seq}`,
              event.payload.tool_use_id,
              resultContent,
              event.payload.success,
              occurredAt,
            ),
          );
        }
        break;
      }
      case 'token_usage': {
        applyTokenUsageToLatestAssistant(event.payload);
        break;
      }
      case 'stderr_line': {
        appendErrorMessage(`runtime-error-${event.seq}`, event.payload.line, occurredAt);
        break;
      }
      case 'lifecycle': {
        if (event.payload.stage === 'error') {
          appendErrorMessage(`runtime-error-${event.seq}`, event.payload.detail, occurredAt);
          break;
        }
        if (event.payload.stage === 'compacting') {
          flushPendingTurn();
          appendCompactingSummary(event, occurredAt);
          break;
        }
        if (event.payload.stage === 'compact_completed') {
          flushPendingTurn();
          appendCompactBoundary(event, occurredAt);
          break;
        }
        if (event.payload.stage === 'compact_failed') {
          flushPendingTurn();
          removeTrailingCompactingSummary();
          const compactFailureDetail = event.payload.detail?.trim();
          next.push(createSummaryMessage(
            `compact-failed-${event.seq}`,
            compactFailureDetail && compactFailureDetail !== 'Claude failed to compact the context.'
              ? compactFailureDetail
              : COMPACT_FAILED_SUMMARY_TOKEN,
            occurredAt,
          ));
          break;
        }
        if (
          event.payload.stage === 'turn_started'
          || event.payload.stage === 'turn_completed'
          || event.payload.stage === 'turn_interrupted'
        ) {
          const flushedTurn = flushPendingTurn();
          if (
            !flushedTurn
            && (
              event.payload.stage === 'turn_completed'
              || event.payload.stage === 'turn_interrupted'
            )
          ) {
            appendVisibleTurnDetail(event, occurredAt);
          }
        }
        if (
          (event.payload.stage === 'turn_completed' || event.payload.stage === 'turn_interrupted')
          && promptQueue.length > 0
        ) {
          flushFirstUnanchoredPrompt();
        }
        break;
      }
      case 'session_completed': {
        flushPendingTurn();
        if (!event.payload.reason.includes('Stopped from desktop workspace')) {
          appendErrorMessage(`runtime-completed-${event.seq}`, event.payload.reason, occurredAt);
        }
        break;
      }
      default:
        break;
    }
  }

  flushPendingTurn();
  appendErrorMessage('runtime-error-terminal', terminalError);

  for (const prompt of promptQueue) {
    flushPrompt(prompt);
  }

  return next;
}
