import type {
  ConversationContentBlock,
  ConversationMessageData,
} from '@/features/conversations/types';
import type { SessionEventRecord } from '@/lib/tauri-ipc';

export interface LocalUserPrompt {
  id: string;
  text: string;
  timestamp?: number;
}

interface PendingAssistantTurn {
  id: string;
  timestamp?: number;
  contentBlocks: ConversationContentBlock[];
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
  return {
    msgType: 'user',
    uuid: prompt.id,
    content: prompt.text,
    timestamp: prompt.timestamp,
    segmentIndex: 0,
    isCompactBoundary: false,
  };
}

function createAssistantTextMessage(
  id: string,
  text: string,
  occurredAt?: number,
): ConversationMessageData {
  return {
    msgType: 'assistant',
    uuid: id,
    content: text,
    timestamp: occurredAt,
    segmentIndex: 0,
    isCompactBoundary: false,
  };
}

function createToolResultMessage(
  id: string,
  toolUseId: string,
  resultSummary: string,
  success: boolean,
  occurredAt?: number,
): ConversationMessageData {
  return {
    msgType: 'user',
    uuid: id,
    content: [{
      type: 'tool_result',
      tool_use_id: toolUseId,
      content: resultSummary,
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
    );
  }

  return {
    msgType: 'assistant',
    uuid: pendingTurn.id,
    content: contentBlocks,
    timestamp: pendingTurn.timestamp,
    segmentIndex: 0,
    isCompactBoundary: false,
  };
}

export function dedupeEvents(events: SessionEventRecord[]) {
  return events.filter((event, index, all) =>
    index === all.findIndex((candidate) =>
      candidate.runtime_id === event.runtime_id && candidate.seq === event.seq,
    ),
  );
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
  resultSummary: string,
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
      _result: resultSummary,
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

  const attachToolResultToExistingMessages = (
    toolUseId: string,
    resultSummary: string,
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
      if (!attachToolResultToBlocks(blocks, toolUseId, resultSummary, success, occurredAt)) {
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
      return;
    }

    const assistantMessage = createAssistantTurnMessage(pendingTurn);
    if (assistantMessage) {
      next.push(assistantMessage);
    }
    pendingTurn = null;
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

  for (const event of events) {
    const occurredAt = parseOccurredAt(event.occurred_at);

    switch (event.payload.type) {
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
        let attachedToPendingTurn = false;
        const currentPendingTurn = pendingTurn as PendingAssistantTurn | null;
        if (currentPendingTurn) {
          attachedToPendingTurn = attachToolResultToBlocks(
            currentPendingTurn.contentBlocks,
            event.payload.tool_use_id,
            event.payload.result_summary,
            event.payload.success,
            occurredAt,
          );
        }
        if (
          attachedToPendingTurn
          || attachToolResultToExistingMessages(
            event.payload.tool_use_id,
            event.payload.result_summary,
            event.payload.success,
            occurredAt,
          )
        ) {
          break;
        }
        const resultBlock = {
          type: 'tool_result',
          tool_use_id: event.payload.tool_use_id,
          content: event.payload.result_summary,
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
              event.payload.result_summary,
              event.payload.success,
              occurredAt,
            ),
          );
        }
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
        if (event.payload.stage === 'turn_started' || event.payload.stage === 'turn_completed') {
          flushPendingTurn();
        }
        if (event.payload.stage === 'turn_completed' && promptQueue.length > 0) {
          next.push(createUserMessage(promptQueue[0]!));
          promptQueue = promptQueue.slice(1);
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
    next.push(createUserMessage(prompt));
  }

  return next;
}
