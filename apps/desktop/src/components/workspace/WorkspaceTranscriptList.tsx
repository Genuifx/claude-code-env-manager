import { useMemo } from 'react';
import { mergeToolResults } from '@/features/conversations/messageState';
import type {
  ConversationMessageData,
} from '@/features/conversations/types';
import { cn } from '@/lib/utils';
import {
  processMessageBlocks,
  WorkspaceMessageBubble,
  WorkspacePendingResponse,
  WorkspaceToolDigest,
  type MessageSegment,
  type ToolDigestEntry,
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
    entries: ToolDigestEntry[];
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
  const pendingSegments: MessageSegment[] = [];

  const pushToolDigest = (entries: ToolDigestEntry[]) => {
    if (entries.length > 0) {
      items.push({
        type: 'tool-digest',
        role: 'assistant',
        key: `tool-digest-${digestIndex}`,
        entries,
      });
      digestIndex += 1;
    }
  };

  const pushMessage = (message: ConversationMessageData) => {
    items.push({
      type: 'message',
      role: 'assistant',
      key: message.uuid || `assistant-msg-${digestIndex}`,
      message,
    });
  };

  const flushSegments = () => {
    // Merge consecutive tool-group segments across messages
    const merged: MessageSegment[] = [];
    for (const seg of pendingSegments) {
      if (
        seg.type === 'tool-group'
        && merged.length > 0
        && merged[merged.length - 1].type === 'tool-group'
      ) {
        const prev = merged[merged.length - 1];
        prev.entries.push(...seg.entries);
      } else {
        merged.push({
          type: seg.type,
          message: seg.message,
          entries: [...seg.entries],
        });
      }
    }

    for (const seg of merged) {
      if (seg.type === 'text' && seg.message) {
        pushMessage(seg.message);
      } else {
        pushToolDigest(seg.entries);
      }
    }

    pendingSegments.length = 0;
  };

  messages.forEach((message, index) => {
    const role = getWorkspaceMessageRole(message);
    const messageKey = message.uuid || `${message.segmentIndex}-${index}`;

    if (role === 'user') {
      flushSegments();
      items.push({
        type: 'message',
        role,
        key: messageKey,
        message,
      });
      return;
    }

    const segments = processMessageBlocks(message, messageKey);
    pendingSegments.push(...segments);
  });

  flushSegments();

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
                entries={item.entries}
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
