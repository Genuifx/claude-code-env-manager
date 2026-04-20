import { useMemo } from 'react';
import { mergeToolResults } from '@/features/conversations/messageState';
import type {
  ConversationContentBlock,
  ConversationMessageData,
} from '@/features/conversations/types';
import { cn } from '@/lib/utils';
import {
  extractWorkspaceProcessData,
  WorkspaceMessageBubble,
  WorkspacePendingResponse,
  WorkspaceToolDigest,
  type WorkspaceThinkingEntry,
} from './WorkspaceMessageBubble';

export type WorkspaceTranscriptItem =
  | {
    type: 'message';
    key: string;
    role: 'user' | 'assistant';
    message: ConversationMessageData;
  }
  | {
    type: 'tool-digest';
    key: string;
    role: 'assistant';
    blocks: ConversationContentBlock[];
    thinkingEntries: WorkspaceThinkingEntry[];
  }
  | {
    type: 'pending-response';
    key: string;
    role: 'assistant';
  };

export function getWorkspaceMessageRole(
  message: ConversationMessageData,
): 'user' | 'assistant' {
  return message.msgType === 'user' || message.msgType === 'human'
    ? 'user'
    : 'assistant';
}

export function getWorkspaceTranscriptSpacing(
  prevRole: WorkspaceTranscriptItem['role'] | null,
  role: WorkspaceTranscriptItem['role'],
  kind: WorkspaceTranscriptItem['type'],
): string {
  if (prevRole == null) {
    return 'mt-0';
  }

  if (prevRole === role) {
    return kind === 'tool-digest' ? 'mt-3' : 'mt-4';
  }

  return kind === 'tool-digest' ? 'mt-7' : 'mt-8';
}

export function buildWorkspaceTranscriptItems(
  messages: ConversationMessageData[],
): WorkspaceTranscriptItem[] {
  const items: WorkspaceTranscriptItem[] = [];
  let digestIndex = 0;
  const pendingAssistantMessages: WorkspaceTranscriptItem[] = [];
  let pendingToolBlocks: ConversationContentBlock[] = [];
  let pendingThinkingEntries: WorkspaceThinkingEntry[] = [];
  let pendingProcessKey: string | null = null;

  const collapseThinkingEntries = (entries: WorkspaceThinkingEntry[]): WorkspaceThinkingEntry[] => {
    if (entries.length <= 1) {
      return entries;
    }

    const mergedContent = entries
      .map((entry) => entry.content.trim())
      .filter(Boolean)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!mergedContent) {
      return [];
    }

    return [{
      key: `${entries[0]?.key ?? 'thinking'}-merged`,
      content: mergedContent,
      segmentCount: entries.reduce((sum, entry) => sum + (entry.segmentCount ?? 1), 0),
    }];
  };

  const flushAssistantRun = () => {
    const collapsedThinkingEntries = collapseThinkingEntries(pendingThinkingEntries);

    if (pendingToolBlocks.length > 0 || collapsedThinkingEntries.length > 0) {
      items.push({
        type: 'tool-digest',
        role: 'assistant',
        key: `tool-digest-${pendingProcessKey || `assistant-run-${digestIndex}`}-${digestIndex}`,
        blocks: pendingToolBlocks,
        thinkingEntries: collapsedThinkingEntries,
      });
      digestIndex += 1;
    }

    if (pendingAssistantMessages.length > 0) {
      items.push(...pendingAssistantMessages);
    }

    pendingAssistantMessages.length = 0;
    pendingToolBlocks = [];
    pendingThinkingEntries = [];
    pendingProcessKey = null;
  };

  messages.forEach((message, index) => {
    const role = getWorkspaceMessageRole(message);
    const messageKey = message.uuid || `${message.segmentIndex}-${index}`;

    if (role === 'user') {
      flushAssistantRun();
      items.push({
        type: 'message',
        role,
        key: messageKey,
        message,
      });
      return;
    }

    const { visibleMessage, toolBlocks, thinkingEntries } = extractWorkspaceProcessData(message, messageKey);
    if ((toolBlocks.length > 0 || thinkingEntries.length > 0) && pendingProcessKey == null) {
      pendingProcessKey = messageKey;
    }
    if (toolBlocks.length > 0) {
      pendingToolBlocks = pendingToolBlocks.concat(toolBlocks);
    }
    if (thinkingEntries.length > 0) {
      pendingThinkingEntries = pendingThinkingEntries.concat(thinkingEntries);
    }
    if (!visibleMessage) {
      return;
    }

    pendingAssistantMessages.push({
      type: 'message',
      role,
      key: visibleMessage.uuid || messageKey,
      message: visibleMessage,
    });
  });

  flushAssistantRun();

  return items;
}

interface WorkspaceTranscriptListProps {
  messages: ConversationMessageData[];
  isAwaitingResponse?: boolean;
}

export function WorkspaceTranscriptList({
  messages,
  isAwaitingResponse = false,
}: WorkspaceTranscriptListProps) {
  const mergedMessages = useMemo(() => mergeToolResults(messages), [messages]);
  const transcriptItems = useMemo(
    () => buildWorkspaceTranscriptItems(mergedMessages),
    [mergedMessages],
  );
  const activeDigestKey = useMemo(() => {
    if (!isAwaitingResponse) {
      return null;
    }

    let lastUserIndex = -1;
    for (let index = transcriptItems.length - 1; index >= 0; index -= 1) {
      const item = transcriptItems[index];
      if (item.type === 'message' && item.role === 'user') {
        lastUserIndex = index;
        break;
      }
    }

    if (lastUserIndex === -1) {
      return null;
    }

    for (let index = lastUserIndex + 1; index < transcriptItems.length; index += 1) {
      const item = transcriptItems[index];
      if (item.type === 'tool-digest') {
        return item.key;
      }
    }

    return null;
  }, [isAwaitingResponse, transcriptItems]);
  const displayItems = useMemo(() => {
    if (!isAwaitingResponse) {
      return transcriptItems;
    }

    const lastRole = transcriptItems[transcriptItems.length - 1]?.role;
    if (lastRole === 'assistant') {
      return transcriptItems;
    }

    return [
      ...transcriptItems,
      {
        type: 'pending-response',
        key: 'workspace-pending-response',
        role: 'assistant',
      } as const,
    ];
  }, [isAwaitingResponse, transcriptItems]);

  return (
    <div>
      {displayItems.map((item, index) => {
        const prevRole = index > 0 ? displayItems[index - 1].role : null;

        if (item.type === 'tool-digest') {
          return (
            <div
              key={item.key}
              className={cn(
                'max-w-[760px] workspace-tool-digest-virtualized',
                getWorkspaceTranscriptSpacing(prevRole, item.role, item.type),
              )}
            >
              <WorkspaceToolDigest
                blocks={item.blocks}
                thinkingEntries={item.thinkingEntries}
                autoExpanded={item.key === activeDigestKey}
              />
            </div>
          );
        }

        if (item.type === 'pending-response') {
          return (
            <div
              key={item.key}
              className={cn(
                'max-w-[760px]',
                getWorkspaceTranscriptSpacing(prevRole, item.role, item.type),
              )}
            >
              <WorkspacePendingResponse />
            </div>
          );
        }

        return (
          <WorkspaceMessageBubble
            key={item.key}
            message={item.message}
            prevRole={prevRole}
          />
        );
      })}
    </div>
  );
}
