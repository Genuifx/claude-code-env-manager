import { useMemo, useRef } from 'react';
import { mergeToolResults } from '@/features/conversations/messageState';
import type {
  ConversationMessageData,
} from '@/features/conversations/types';
import { cn } from '@/lib/utils';
import { ccemMotion, clearMotionProps, gsap, shouldReduceMotion, useGSAP } from '@/lib/gsapMotion';
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

  // Tighter spacing within the same role — conversational flow
  if (prevRole === role) {
    return kind === 'tool-digest' ? 'mt-2' : 'mt-3';
  }

  // Generous breathing room between different roles — turn boundaries
  // Tool digests get slightly tighter spacing than full messages
  return kind === 'tool-digest' ? 'mt-5' : 'mt-6';
}

const processedMessageSegmentsCache = new WeakMap<
  ConversationMessageData,
  {
    messageKey: string;
    content: ConversationMessageData['content'];
    isCompactBoundary: ConversationMessageData['isCompactBoundary'];
    planContent: ConversationMessageData['planContent'];
    msgType: ConversationMessageData['msgType'];
    segments: MessageSegment[];
  }
>();

const fallbackMessageKeys = new WeakMap<ConversationMessageData, string>();
let nextFallbackMessageKey = 0;

function getStableMessageKey(message: ConversationMessageData): string {
  if (message.uuid) {
    return `message-${message.uuid}`;
  }

  const cached = fallbackMessageKeys.get(message);
  if (cached) {
    return cached;
  }

  nextFallbackMessageKey += 1;
  const key = `message-${message.segmentIndex}-${message.timestamp ?? 'untimed'}-${nextFallbackMessageKey}`;
  fallbackMessageKeys.set(message, key);
  return key;
}

function getProcessedMessageSegments(
  message: ConversationMessageData,
  messageKey: string,
): MessageSegment[] {
  const cached = processedMessageSegmentsCache.get(message);
  if (
    cached
    && cached.messageKey === messageKey
    && cached.content === message.content
    && cached.isCompactBoundary === message.isCompactBoundary
    && cached.planContent === message.planContent
    && cached.msgType === message.msgType
  ) {
    return cached.segments;
  }

  const segments = processMessageBlocks(message, messageKey);
  processedMessageSegmentsCache.set(message, {
    messageKey,
    content: message.content,
    isCompactBoundary: message.isCompactBoundary,
    planContent: message.planContent,
    msgType: message.msgType,
    segments,
  });
  return segments;
}

export function buildWorkspaceTranscriptItems(
  messages: ConversationMessageData[],
): WorkspaceTranscriptItem[] {
  const items: WorkspaceTranscriptItem[] = [];
  const pendingSegments: Array<MessageSegment & { key: string }> = [];
  const seenItemKeys = new Map<string, number>();

  const uniqueItemKey = (baseKey: string) => {
    const seenCount = seenItemKeys.get(baseKey) ?? 0;
    seenItemKeys.set(baseKey, seenCount + 1);
    return seenCount === 0 ? baseKey : `${baseKey}-${seenCount}`;
  };

  const pushToolDigest = (entries: ToolDigestEntry[], segmentKey: string) => {
    if (entries.length > 0) {
      items.push({
        type: 'tool-digest',
        role: 'assistant',
        key: uniqueItemKey(`${segmentKey}-digest`),
        entries,
      });
    }
  };

  const pushMessage = (message: ConversationMessageData, segmentKey: string) => {
    items.push({
      type: 'message',
      role: 'assistant',
      key: uniqueItemKey(`${segmentKey}-message`),
      message,
    });
  };

  const flushSegments = () => {
    // Merge consecutive tool-group segments across messages
    const merged: Array<MessageSegment & { key: string }> = [];
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
          key: seg.key,
          type: seg.type,
          message: seg.message,
          entries: [...seg.entries],
        });
      }
    }

    for (const seg of merged) {
      if (seg.type === 'text' && seg.message) {
        pushMessage(seg.message, seg.key);
      } else {
        pushToolDigest(seg.entries, seg.key);
      }
    }

    pendingSegments.length = 0;
  };

  messages.forEach((message) => {
    const role = getWorkspaceMessageRole(message);
    const messageKey = getStableMessageKey(message);

    if (role === 'user') {
      flushSegments();
      items.push({
        type: 'message',
        role,
        key: uniqueItemKey(`${messageKey}-message`),
        message,
      });
      return;
    }

    const segments = getProcessedMessageSegments(message, messageKey);
    pendingSegments.push(...segments.map((segment, segmentIndex) => ({
      ...segment,
      key: `${messageKey}-segment-${segmentIndex}`,
    })));
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
  const listRef = useRef<HTMLDivElement | null>(null);
  const seenItemKeysRef = useRef<Set<string>>(new Set());
  const hasHydratedMotionRef = useRef(false);
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

    let activeKey: string | null = null;
    for (let index = lastUserIndex + 1; index < transcriptItems.length; index += 1) {
      const item = transcriptItems[index];
      if (item.type === 'tool-digest') {
        activeKey = item.key;
      }
    }

    return activeKey;
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
  const displayItemKey = useMemo(
    () => displayItems.map((item) => item.key).join('|'),
    [displayItems],
  );

  useGSAP(() => {
    const list = listRef.current;
    const currentKeys = displayItems.map((item) => item.key);
    if (!list) {
      seenItemKeysRef.current = new Set(currentKeys);
      hasHydratedMotionRef.current = true;
      return;
    }

    const previousKeys = seenItemKeysRef.current;
    const newKeys = currentKeys.filter((key) => !previousKeys.has(key));
    seenItemKeysRef.current = new Set(currentKeys);

    if (!hasHydratedMotionRef.current) {
      hasHydratedMotionRef.current = true;
      return;
    }

    if (newKeys.length === 0) {
      return;
    }

    const targets = gsap.utils.toArray<HTMLElement>('[data-transcript-item-key]', list)
      .filter((element) => {
        const key = element.dataset.transcriptItemKey;
        return key ? newKeys.includes(key) : false;
      });

    if (targets.length === 0) {
      return;
    }

    if (shouldReduceMotion()) {
      clearMotionProps(targets);
      return;
    }

    gsap.fromTo(
      targets,
      { autoAlpha: 0, y: 12, scale: 0.992 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: ccemMotion.duration.base,
        ease: ccemMotion.ease.standard,
        stagger: 0.025,
        clearProps: 'opacity,visibility,transform',
      },
    );
  }, { dependencies: [displayItemKey], scope: listRef });

  return (
    <div ref={listRef}>
      {displayItems.map((item, index) => {
        const prevRole = index > 0 ? displayItems[index - 1].role : null;

        if (item.type === 'tool-digest') {
          return (
            <div
              key={item.key}
              data-transcript-item-key={item.key}
              className={cn(
                'max-w-[760px] workspace-tool-digest-virtualized',
                getWorkspaceTranscriptSpacing(prevRole, item.role, item.type),
              )}
            >
              <WorkspaceToolDigest
                entries={item.entries}
                autoExpanded={item.key === activeDigestKey}
                isActive={item.key === activeDigestKey}
              />
            </div>
          );
        }

        if (item.type === 'pending-response') {
          return (
            <div
              key={item.key}
              data-transcript-item-key={item.key}
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
          <div key={item.key} data-transcript-item-key={item.key}>
            <WorkspaceMessageBubble
              message={item.message}
              prevRole={prevRole}
            />
          </div>
        );
      })}
    </div>
  );
}
