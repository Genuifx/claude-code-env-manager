import {
  ArrowUp,
  Bot,
  ClipboardList,
  Globe,
  Layers3,
  LoaderCircle,
  MessageSquareQuote,
  MonitorUp,
  Shield,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  ShieldOff,
  Search,
  Square,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Claude, Codex, OpenCode } from '@lobehub/icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import type {
  InteractiveToolPrompt,
  NativeSessionSummary,
  SessionEventRecord,
} from '@/lib/tauri-ipc';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { useAppStore } from '@/store';
import type { InstalledSkill } from '@/store';
import type { PermissionModeName } from '@ccem/core/browser';
import type {
  ConversationContentBlock,
  ConversationMessageData,
} from '@/features/conversations/types';
import {
  buildComposerPromptPreview,
  buildComposerPromptText,
  type ComposerAttachment,
  type ComposerSubmitPayload,
} from './composerAttachments';
import { WorkspaceTranscriptList } from './WorkspaceTranscriptList';
import { WorkspaceSessionComposer } from './WorkspaceSessionComposer';

const MODE_DISPLAY_NAMES: Record<PermissionModeName, string> = {
  yolo: 'YOLO',
  dev: 'Developer',
  readonly: 'Read Only',
  safe: 'Safe',
  ci: 'CI / CD',
  audit: 'Audit',
};

function getModeIcon(mode: PermissionModeName): typeof Shield {
  const iconMap: Record<PermissionModeName, typeof Shield> = {
    yolo: ShieldOff,
    dev: ShieldCheck,
    readonly: ShieldBan,
    safe: ShieldAlert,
    ci: ShieldCheck,
    audit: Search,
  };
  return iconMap[mode] || Shield;
}

function LiveProviderIcon({ provider, size = 16 }: { provider: string; size?: number }) {
  if (provider === 'codex') return <Codex.Color size={size} />;
  if (provider === 'opencode') return <OpenCode size={size} />;
  return <Claude.Color size={size} />;
}

function providerDisplayName(provider: string) {
  if (provider === 'codex') return 'Codex';
  if (provider === 'opencode') return 'OpenCode';
  return 'Claude';
}

function isRiskyPermissionMode(mode: PermissionModeName) {
  return mode === 'yolo';
}

function ProcessingActionIcon({ stopping = false }: { stopping?: boolean }) {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center">
      <LoaderCircle className="h-4 w-4 animate-spin opacity-80" />
      <Square
        className={cn(
          'absolute h-2.5 w-2.5',
          stopping ? 'opacity-0' : 'fill-current stroke-[2.5]'
        )}
      />
    </span>
  );
}

interface PendingPermissionRequest {
  requestId: string;
  toolName: string;
  inputSummary?: string;
}

interface PendingInteractivePrompt {
  toolUseId: string;
  rawName: string;
  prompt: InteractiveToolPrompt;
}

interface PendingTerminalPrompt {
  promptKind: string;
  promptText: string;
}

interface NativeSessionAttentionState {
  permissions: PendingPermissionRequest[];
  prompts: PendingInteractivePrompt[];
  terminalPrompt: PendingTerminalPrompt | null;
}

interface LocalUserPrompt {
  id: string;
  text: string;
  timestamp?: number;
}

interface PendingAssistantTurn {
  id: string;
  timestamp?: number;
  textParts: string[];
  thinkingParts: string[];
  toolBlocks: ConversationContentBlock[];
}

interface WorkspaceNativeSessionViewProps {
  session: NativeSessionSummary;
  initialPrompt?: string | null;
  seedMessages?: ConversationMessageData[];
  installedSkills?: InstalledSkill[];
  isVisible?: boolean;
  onSessionUpdate: (session: NativeSessionSummary) => void;
  onStartNew: () => void;
}

const ACTIVE_POLL_INTERVAL_MS = 140;
const IDLE_POLL_INTERVAL_MS = 700;
const TERMINAL_POLL_INTERVAL_MS = 1100;

function isTerminalStatus(status: string) {
  return status === 'stopped' || status === 'error' || status === 'handoff';
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

function buildBaseMessages(
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
  const text = pendingTurn.textParts.join('');
  const mergedThinking = pendingTurn.thinkingParts
    .join('')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const contentBlocks: ConversationContentBlock[] = [];
  if (mergedThinking) {
    contentBlocks.push({
      type: 'thinking',
      thinking: mergedThinking,
    });
  }
  if (pendingTurn.toolBlocks.length > 0) {
    contentBlocks.push(...pendingTurn.toolBlocks);
  }
  if (text.trim()) {
    contentBlocks.push({
      type: 'text',
      text,
    });
  }

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

function dedupeEvents(events: SessionEventRecord[]) {
  return events.filter((event, index, all) =>
    index === all.findIndex((candidate) =>
      candidate.runtime_id === event.runtime_id && candidate.seq === event.seq,
    ),
  );
}

function extractAttentionState(events: SessionEventRecord[]): NativeSessionAttentionState {
  const permissions = new Map<string, PendingPermissionRequest>();
  const prompts = new Map<string, PendingInteractivePrompt>();
  let terminalPrompt: PendingTerminalPrompt | null = null;

  for (const event of events) {
    switch (event.payload.type) {
      case 'permission_required':
        permissions.set(event.payload.request_id, {
          requestId: event.payload.request_id,
          toolName: event.payload.tool_name,
          inputSummary: event.payload.input_summary ?? undefined,
        });
        break;
      case 'permission_responded':
        permissions.delete(event.payload.request_id);
        break;
      case 'tool_use_started':
        if (event.payload.needs_response && event.payload.prompt) {
          prompts.set(event.payload.tool_use_id, {
            toolUseId: event.payload.tool_use_id,
            rawName: event.payload.raw_name,
            prompt: event.payload.prompt,
          });
        }
        break;
      case 'tool_use_completed':
        prompts.delete(event.payload.tool_use_id);
        break;
      case 'terminal_prompt_required':
        terminalPrompt = {
          promptKind: event.payload.prompt_kind,
          promptText: event.payload.prompt_text,
        };
        break;
      case 'terminal_prompt_resolved':
        terminalPrompt = null;
        break;
      case 'session_completed':
        permissions.clear();
        prompts.clear();
        terminalPrompt = null;
        break;
      default:
        break;
    }
  }

  return {
    permissions: Array.from(permissions.values()),
    prompts: Array.from(prompts.values()),
    terminalPrompt,
  };
}

function promptPanelTitle(prompt: InteractiveToolPrompt, t: (key: string) => string) {
  switch (prompt.prompt_type) {
    case 'ask_user_question':
      return t('workspace.nativeInputNeeded');
    case 'plan_exit':
      return t('workspace.nativePlanReviewNeeded');
    case 'plan_entry':
      return t('workspace.nativePlanModeActive');
    default:
      return t('workspace.nativeInputNeeded');
  }
}

function promptPanelBody(prompt: InteractiveToolPrompt): string[] {
  switch (prompt.prompt_type) {
    case 'ask_user_question': {
      const firstQuestion = prompt.questions[0];
      if (!firstQuestion) {
        return [];
      }
      return [
        firstQuestion.header?.trim(),
        firstQuestion.question.trim(),
      ].filter((value): value is string => Boolean(value));
    }
    case 'plan_exit':
      return prompt.plan_summary?.trim() ? [prompt.plan_summary.trim()] : [];
    case 'plan_entry':
      return [];
    default:
      return [];
  }
}

function promptQuickReplies(prompt: InteractiveToolPrompt): string[] {
  switch (prompt.prompt_type) {
    case 'ask_user_question': {
      const firstQuestion = prompt.questions[0];
      if (!firstQuestion) {
        return [];
      }
      return firstQuestion.options
        .map((option) => option.preview?.trim() || option.label.trim())
        .filter(Boolean);
    }
    case 'plan_exit':
      return (prompt.allowed_prompts ?? [])
        .map((value) => value.trim())
        .filter(Boolean);
    default:
      return [];
  }
}

function buildMessagesFromEvents(
  baseMessages: ConversationMessageData[],
  remainingPrompts: LocalUserPrompt[],
  events: SessionEventRecord[],
): ConversationMessageData[] {
  const next = [...baseMessages];
  let pendingTurn: PendingAssistantTurn | null = null;
  const hiddenInteractiveToolUseIds = new Set<string>();
  let promptQueue = [...remainingPrompts];

  const attachToolResultToBlocks = (
    blocks: ConversationContentBlock[],
    toolUseId: string,
    resultSummary: string,
    success: boolean,
  ) => {
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
      };
      attached = true;
      break;
    }
    return attached;
  };

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
      if (!attachToolResultToBlocks(blocks, toolUseId, resultSummary, success)) {
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
        textParts: [],
        thinkingParts: [],
        toolBlocks: [],
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

  for (const event of events) {
    const occurredAt = parseOccurredAt(event.occurred_at);

    switch (event.payload.type) {
      case 'system_message': {
        ensurePendingTurn(event, occurredAt).thinkingParts.push(event.payload.message);
        break;
      }
      case 'assistant_chunk': {
        ensurePendingTurn(event, occurredAt).textParts.push(event.payload.text);
        break;
      }
      case 'tool_use_started': {
        if (event.payload.needs_response) {
          hiddenInteractiveToolUseIds.add(event.payload.tool_use_id);
          break;
        }
        ensurePendingTurn(event, occurredAt).toolBlocks.push({
          type: 'tool_use',
          id: event.payload.tool_use_id,
          name: event.payload.raw_name,
          input: event.payload.input_summary
            ? { summary: event.payload.input_summary }
            : {},
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
            currentPendingTurn.toolBlocks,
            event.payload.tool_use_id,
            event.payload.result_summary,
            event.payload.success,
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
      case 'lifecycle': {
        if (event.payload.stage === 'turn_started' || event.payload.stage === 'turn_completed') {
          flushPendingTurn();
        }
        // After a turn completes, insert the next queued user prompt
        if (event.payload.stage === 'turn_completed' && promptQueue.length > 0) {
          next.push(createUserMessage(promptQueue[0]!));
          promptQueue = promptQueue.slice(1);
        }
        break;
      }
      case 'session_completed': {
        flushPendingTurn();
        break;
      }
      default:
        break;
    }
  }

  flushPendingTurn();

  // Append any remaining user prompts that haven't been matched to a turn yet
  // (e.g. user just sent a message and the turn hasn't completed)
  for (const prompt of promptQueue) {
    next.push(createUserMessage(prompt));
  }

  return next;
}

function WorkspaceAttentionPanel({
  attentionState,
  respondingRequestId,
  onPermission,
  onUseQuickReply,
}: {
  attentionState: NativeSessionAttentionState;
  respondingRequestId: string | null;
  onPermission: (requestId: string, approved: boolean) => void;
  onUseQuickReply: (value: string) => void;
}) {
  const { t } = useLocale();
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  if (
    attentionState.permissions.length === 0
    && attentionState.prompts.length === 0
    && !attentionState.terminalPrompt
  ) {
    return null;
  }

  return (
    <div className="space-y-3">
      {attentionState.permissions.map((request) => (
        <div
          key={request.requestId}
          className="flex items-center gap-3 rounded-2xl bg-amber-500/12 px-4 py-3.5"
        >
          <div className="rounded-lg bg-amber-500/15 p-2">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-600 dark:text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-snug text-foreground">
              {t('workspace.nativeApprovalNeeded')}
            </p>
            <p className="mt-1 truncate font-mono text-[13px] text-amber-700/90 dark:text-amber-400/90">
              {request.toolName}
            </p>
            {request.inputSummary ? (
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground/80">
                {request.inputSummary}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-border/60 px-4 text-[13px] font-medium hover:bg-background/80"
              disabled={respondingRequestId === request.requestId}
              onClick={() => onPermission(request.requestId, false)}
            >
              {t('sessions.headlessDeny')}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-lg bg-amber-600 px-4 text-[13px] font-medium text-white shadow-sm hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
              disabled={respondingRequestId === request.requestId}
              onClick={() => onPermission(request.requestId, true)}
            >
              {t('sessions.headlessApprove')}
            </Button>
          </div>
        </div>
      ))}

      {attentionState.prompts.map((entry) => {
        const bodyLines = promptPanelBody(entry.prompt);
        const quickReplies = promptQuickReplies(entry.prompt);
        const firstQuestion = entry.prompt.prompt_type === 'ask_user_question'
          ? entry.prompt.questions[0] ?? null
          : null;

        if (firstQuestion) {
          return (
            <div
              key={entry.toolUseId}
              className="rounded-2xl bg-muted/30 px-5 py-5"
            >
              <h3 className="text-[17px] font-semibold leading-snug text-foreground">
                {firstQuestion.question}
              </h3>

              {firstQuestion.options.some((option) => option.preview) ? (
                <div className="mt-4 rounded-lg bg-muted/40 px-4 py-3 font-mono text-[13px] text-muted-foreground">
                  {firstQuestion.options[0]?.preview?.split('\n').slice(0, 3).join('\n')}
                </div>
              ) : null}

              <div className="mt-5 space-y-2">
                {firstQuestion.options.map((option, index) => {
                  const isSelected = selectedOptions[entry.toolUseId] === option.label;
                  return (
                    <button
                      key={`${entry.toolUseId}-${option.label}`}
                      type="button"
                      className={cn(
                        'group relative w-full rounded-xl px-4 py-3.5 text-left transition-all',
                        isSelected
                          ? 'bg-muted/60'
                          : 'bg-muted/20 hover:bg-muted/40',
                      )}
                      onClick={() => {
                        setSelectedOptions((prev) => ({
                          ...prev,
                          [entry.toolUseId]: option.label,
                        }));
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-[15px] font-medium text-muted-foreground/60">
                          {index + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="text-[15px] leading-relaxed text-foreground">
                            {option.label}
                          </p>
                          {option.description ? (
                            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground/75">
                              {option.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 px-4 text-[13px]"
                  onClick={() => onUseQuickReply('')}
                >
                  {t('common.skip')}
                </Button>
                <Button
                  type="button"
                  className="h-9 rounded-lg bg-foreground px-5 text-[13px] font-medium text-background hover:bg-foreground/90"
                  disabled={!selectedOptions[entry.toolUseId]}
                  onClick={() => {
                    const selected = selectedOptions[entry.toolUseId];
                    if (selected) {
                      onUseQuickReply(selected);
                      setSelectedOptions((prev) => {
                        const next = { ...prev };
                        delete next[entry.toolUseId];
                        return next;
                      });
                    }
                  }}
                >
                  {t('common.submit')}
                </Button>
              </div>
            </div>
          );
        }

        const Icon = entry.prompt.prompt_type === 'plan_exit'
          ? ClipboardList
          : MessageSquareQuote;

        return (
          <div
            key={entry.toolUseId}
            className="rounded-2xl bg-surface-raised/60 px-4 py-3.5 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2.5">
              <div className="rounded-md bg-muted/60 p-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-[14px] font-semibold text-foreground">
                {promptPanelTitle(entry.prompt, t)}
              </p>
              <span className="ml-auto rounded-md bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground/80">
                {entry.rawName}
              </span>
            </div>
            {bodyLines.length > 0 ? (
              <div className="mt-3 space-y-1.5 text-[14px] leading-relaxed text-foreground/90">
                {bodyLines.map((line, index) => (
                  <p key={`${entry.toolUseId}-line-${index}`}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="mt-2.5 text-[13px] text-muted-foreground/75">
                {t('workspace.nativeReplyHint')}
              </p>
            )}
            {quickReplies.length > 0 ? (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {quickReplies.map((reply) => (
                  <Button
                    key={`${entry.toolUseId}-${reply}`}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg border-border/60 px-3.5 text-[13px] hover:bg-muted/50"
                    onClick={() => onUseQuickReply(reply)}
                  >
                    {reply}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      {attentionState.terminalPrompt ? (
        <div className="rounded-2xl bg-surface-raised/60 px-4 py-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="rounded-md bg-muted/60 p-1.5">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-[14px] font-semibold text-foreground">
              {t('workspace.nativeTerminalPrompt')}
            </p>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">
            {attentionState.terminalPrompt.promptText}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceNativeSessionView({
  session,
  initialPrompt,
  seedMessages = [],
  installedSkills = [],
  isVisible = true,
  onSessionUpdate,
  onStartNew,
}: WorkspaceNativeSessionViewProps) {
  const { t } = useLocale();
  const permissionMode = useAppStore((state) => state.permissionMode);
  const {
    getNativeSessionEvents,
    sendNativeSessionInput,
    respondNativeSessionPermission,
    stopNativeSession,
    handoffNativeSessionToTerminal,
    listNativeSessions,
    searchWorkspaceFiles,
  } = useTauriCommands();
  const [composerText, setComposerText] = useState('');
  const [composerPlanModeEnabled, setComposerPlanModeEnabled] = useState(session.perm_mode === 'plan');
  const [events, setEvents] = useState<SessionEventRecord[]>([]);
  const [localUserPrompts, setLocalUserPrompts] = useState<LocalUserPrompt[]>(() => {
    if (!initialPrompt) {
      return [];
    }

    return [{
      id: 'initial-user',
      text: initialPrompt,
    }];
  });
  const [isSending, setIsSending] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isHandingOff, setIsHandingOff] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);
  const [queuedMessages, setQueuedMessages] = useState<Array<{
    id: string;
    text: string;
    planMode: boolean;
    attachments: ComposerAttachment[];
  }>>([]);
  const lastSeenSeqRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tickInFlightRef = useRef(false);

  useEffect(() => {
    const initialPrompts = initialPrompt
      ? [{ id: 'initial-user', text: initialPrompt }]
      : [];

    lastSeenSeqRef.current = null;
    setEvents([]);
    setComposerText('');
    setComposerPlanModeEnabled(session.perm_mode === 'plan');
    setQueuedMessages([]);
    setLocalUserPrompts(initialPrompts);
  }, [initialPrompt, seedMessages, session.perm_mode, session.runtime_id]);

  const messages = useMemo(
    () => buildMessagesFromEvents(
      buildBaseMessages(seedMessages, localUserPrompts[0]),
      localUserPrompts.slice(1),
      events,
    ),
    [events, localUserPrompts, seedMessages],
  );

  const refreshSummary = useCallback(async () => {
    const sessions = await listNativeSessions();
    const next = sessions.find(
      (candidate) => candidate.runtime_id === session.runtime_id,
    );
    if (next) {
      onSessionUpdate(next);
    }
  }, [listNativeSessions, onSessionUpdate, session.runtime_id]);

  const pollEvents = useCallback(async () => {
    const batch = await getNativeSessionEvents(session.runtime_id, lastSeenSeqRef.current);
    if (!batch.events.length) {
      return;
    }

    lastSeenSeqRef.current = batch.events[batch.events.length - 1]?.seq ?? lastSeenSeqRef.current;
    setEvents((previous) =>
      dedupeEvents(batch.gap_detected ? batch.events : [...previous, ...batch.events]),
    );
  }, [getNativeSessionEvents, session.runtime_id]);

  const attentionState = useMemo(
    () => extractAttentionState(events),
    [events],
  );
  const pollIntervalMs = isSending
    || session.status === 'initializing'
    || session.status === 'processing'
    ? ACTIVE_POLL_INTERVAL_MS
    : isTerminalStatus(session.status)
      ? TERMINAL_POLL_INTERVAL_MS
      : IDLE_POLL_INTERVAL_MS;

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const scheduleNextTick = () => {
      if (cancelled) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        void tick();
      }, pollIntervalMs);
    };

    const tick = async () => {
      if (cancelled) {
        return;
      }

      if (tickInFlightRef.current) {
        scheduleNextTick();
        return;
      }

      tickInFlightRef.current = true;
      try {
        await pollEvents();
        await refreshSummary();
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to poll native session:', error);
        }
      } finally {
        tickInFlightRef.current = false;
        scheduleNextTick();
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isVisible, pollEvents, pollIntervalMs, refreshSummary]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({ top: container.scrollHeight });
  }, [isVisible, messages]);

  const isProcessingTurn = session.status === 'initializing' || session.status === 'processing';
  const isAwaitingResponse = isSending || isProcessingTurn;
  const hasBlockingAttention = attentionState.permissions.length > 0
    || attentionState.prompts.length > 0
    || Boolean(attentionState.terminalPrompt);
  const hasAttentionPanel = hasBlockingAttention;
  const canSend = !isSending
    && !isTerminalStatus(session.status)
    && composerText.trim().length > 0;

  const buildDispatchText = useCallback((text: string, planModeEnabled: boolean) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return '';
    }

    if (!planModeEnabled) {
      return trimmedText;
    }

    if (session.provider === 'codex') {
      return trimmedText.startsWith('/plan')
        ? trimmedText
        : `/plan ${trimmedText}`;
    }

    if (session.perm_mode === 'plan') {
      return trimmedText;
    }

    return [
      'Stay in planning mode for this reply.',
      'Outline the plan only and wait for confirmation before executing changes.',
      '',
      trimmedText,
    ].join('\n');
  }, [session.perm_mode, session.provider]);

  const buildQueuedBatchText = useCallback((items: Array<{ text: string; planMode: boolean; attachments: ComposerAttachment[] }>) => {
    if (items.length === 1) {
      return buildDispatchText(
        buildComposerPromptText(items[0]!.text, items[0]!.attachments),
        items[0]!.planMode,
      );
    }

    const [firstItem, ...restItems] = items;
    const firstText = buildDispatchText(
      buildComposerPromptText(firstItem!.text, firstItem!.attachments),
      firstItem!.planMode,
    );
    const remainingText = restItems
      .map((item, index) => `${index + 2}. ${buildDispatchText(
        buildComposerPromptText(item.text, item.attachments),
        item.planMode,
      )}`)
      .join('\n\n');

    return [
      firstText,
      '',
      '另外还有这些后续消息，请按顺序继续处理：',
      remainingText,
    ].join('\n');
  }, [buildDispatchText]);

  const sendPromptBatch = useCallback(async (
    prompts: Array<{ id: string; text: string; planMode: boolean; attachments: ComposerAttachment[] }>,
  ) => {
    const payload = buildQueuedBatchText(prompts.map((prompt) => ({
      text: prompt.text,
      planMode: prompt.planMode,
      attachments: prompt.attachments,
    })));
    if (!payload) {
      return;
    }

    const previewText = prompts.length === 1
      ? buildComposerPromptPreview(prompts[0]!.text, prompts[0]!.attachments)
      : [
          buildComposerPromptPreview(prompts[0]!.text, prompts[0]!.attachments),
          '',
          '另外还有这些后续消息，请按顺序继续处理：',
          ...prompts.slice(1).map((prompt, index) =>
            `${index + 2}. ${buildComposerPromptPreview(prompt.text, prompt.attachments)}`,
          ),
        ].join('\n');

    const promptEntry: LocalUserPrompt = {
      id: prompts.length === 1
        ? prompts[0]!.id
        : `queue-batch-${Date.now()}`,
      text: previewText,
      timestamp: Date.now(),
    };

    setIsSending(true);
    setLocalUserPrompts((previous) => [...previous, promptEntry]);

    try {
      await sendNativeSessionInput(session.runtime_id, payload);
      await pollEvents();
      await refreshSummary();
    } catch (error) {
      console.error('Failed to send native session input:', error);
      setLocalUserPrompts((previous) =>
        previous.filter((prompt) => prompt.id !== promptEntry.id),
      );
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [buildQueuedBatchText, pollEvents, refreshSummary, sendNativeSessionInput, session.runtime_id]);

  const handleSend = useCallback(async (payload?: ComposerSubmitPayload) => {
    const text = payload?.text ?? composerText.trim();
    const attachments = payload?.attachments ?? [];
    if (!text && attachments.length === 0) {
      return false;
    }

    const nextPrompt = {
      id: `user-${Date.now()}`,
      text,
      planMode: composerPlanModeEnabled,
      attachments,
    };
    setComposerText('');
    setComposerPlanModeEnabled(session.perm_mode === 'plan');

    if (isProcessingTurn || hasBlockingAttention) {
      setQueuedMessages((previous) => [...previous, nextPrompt]);
      return true;
    }

    try {
      await sendPromptBatch([nextPrompt]);
      return true;
    } catch (error) {
      toast.error(t('workspace.nativeSendFailed'));
      return false;
    }
  }, [
    composerPlanModeEnabled,
    composerText,
    hasBlockingAttention,
    isProcessingTurn,
    sendPromptBatch,
    session.perm_mode,
    t,
  ]);

  const flushQueuedMessages = useCallback(async () => {
    if (queuedMessages.length === 0 || isSending || isProcessingTurn || hasBlockingAttention) {
      return;
    }

    const pendingBatch = queuedMessages;
    setQueuedMessages([]);

    try {
      await sendPromptBatch(pendingBatch);
    } catch (error) {
      setQueuedMessages((previous) => [...pendingBatch, ...previous]);
      toast.error(t('workspace.nativeSendFailed'));
    }
  }, [
    hasBlockingAttention,
    isProcessingTurn,
    isSending,
    queuedMessages,
    sendPromptBatch,
    t,
  ]);

  const handlePermission = useCallback(async (requestId: string, approved: boolean) => {
    setRespondingRequestId(requestId);
    try {
      await respondNativeSessionPermission(session.runtime_id, requestId, approved);
      await pollEvents();
      await refreshSummary();
    } catch (error) {
      console.error('Failed to respond to native permission:', error);
      toast.error(t('workspace.nativePermissionFailed'));
    } finally {
      setRespondingRequestId(null);
    }
  }, [pollEvents, refreshSummary, respondNativeSessionPermission, session.runtime_id, t]);

  const handleUseQuickReply = useCallback((value: string) => {
    const next = value.trim();
    if (!next) {
      return;
    }
    setComposerText(next);
  }, []);

  const handleStop = useCallback(async () => {
    setIsStopping(true);
    try {
      await stopNativeSession(session.runtime_id);
      await refreshSummary();
    } catch (error) {
      console.error('Failed to stop native session:', error);
      toast.error(t('workspace.nativeStopFailed'));
    } finally {
      setIsStopping(false);
    }
  }, [refreshSummary, session.runtime_id, stopNativeSession, t]);

  const handleHandoff = useCallback(async () => {
    setIsHandingOff(true);
    try {
      await handoffNativeSessionToTerminal(session.runtime_id);
      await refreshSummary();
      toast.success(t('workspace.nativeHandoffDone'));
    } catch (error) {
      console.error('Failed to handoff native session:', error);
      toast.error(t('workspace.nativeHandoffFailed'));
    } finally {
      setIsHandingOff(false);
    }
  }, [handoffNativeSessionToTerminal, refreshSummary, session.runtime_id, t]);

  useEffect(() => {
    if (
      queuedMessages.length === 0
      || isSending
      || isProcessingTurn
      || hasBlockingAttention
      || isTerminalStatus(session.status)
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void flushQueuedMessages();
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    flushQueuedMessages,
    hasBlockingAttention,
    isProcessingTurn,
    isSending,
    queuedMessages.length,
    session.status,
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={containerRef} className="flex-1 overflow-y-auto bg-background/30">
        <div className="mx-auto max-w-[960px] px-8 py-8">
          {messages.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-2xl border border-border/40 bg-surface/70 p-4">
                <Layers3 className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t('workspace.nativeEmptyTitle')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/75">
                  {t('workspace.nativeEmptyHint')}
                </p>
              </div>
            </div>
          ) : (
            <WorkspaceTranscriptList
              messages={messages}
              isAwaitingResponse={isAwaitingResponse}
            />
          )}
        </div>
      </div>

      <WorkspaceSessionComposer
        value={composerText}
        onValueChange={setComposerText}
        onSubmit={handleSend}
        placeholder={t('workspace.composePlaceholder')}
        disabled={isTerminalStatus(session.status)}
        canSubmit={canSend}
        isSubmitting={false}
        submitLabel={t('workspace.composeSend')}
        loadingLabel={t('common.loading')}
        primaryActionLabel={t('workspace.composeSend')}
        primaryActionIcon={<ArrowUp className="h-4 w-4" />}
        provider={session.provider}
        installedSkills={installedSkills}
        workingDir={session.project_dir}
        searchWorkspaceFiles={searchWorkspaceFiles}
        planModeEnabled={composerPlanModeEnabled}
        onPlanModeEnabledChange={setComposerPlanModeEnabled}
        planModeHint={session.provider === 'claude' && session.perm_mode === 'plan'
          ? t('workspace.composerPlanModeHintClaudeLocked')
          : undefined}
        queuedMessages={queuedMessages}
        onFlushQueuedMessages={() => void flushQueuedMessages()}
        onRemoveQueuedMessage={(id) => {
          setQueuedMessages((previous) => previous.filter((message) => message.id !== id));
        }}
        queueCanFlush={!isSending && !isProcessingTurn && !hasBlockingAttention}
        aboveComposer={hasAttentionPanel ? (
          <WorkspaceAttentionPanel
            attentionState={attentionState}
            respondingRequestId={respondingRequestId}
            onPermission={(requestId, approved) => {
              void handlePermission(requestId, approved);
            }}
            onUseQuickReply={handleUseQuickReply}
          />
        ) : null}
        controls={(() => {
          const ModeIcon = getModeIcon(permissionMode);
          return (
            <>
              <div className="flex items-center gap-1.5 pr-1 text-[12px] font-medium text-muted-foreground">
                <LiveProviderIcon provider={session.provider} size={15} />
                <span>{providerDisplayName(session.provider)}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                <span>{session.env_name}</span>
              </div>

              <div
                className={cn(
                  'flex items-center gap-1.5 text-[12px] text-muted-foreground',
                  isRiskyPermissionMode(permissionMode) && 'text-destructive',
                )}
              >
                <ModeIcon className="h-3.5 w-3.5" />
                <span>{MODE_DISPLAY_NAMES[permissionMode]}</span>
              </div>
            </>
          );
        })()}
        secondaryActions={(
          <>
            {!isTerminalStatus(session.status) ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-full"
                      disabled={!isProcessingTurn || isStopping}
                      onClick={() => void handleStop()}
                    >
                      <ProcessingActionIcon stopping={isStopping} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('workspace.nativeStop')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            {!isTerminalStatus(session.status) ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 rounded-full"
                      disabled={!session.can_handoff_to_terminal || isHandingOff}
                      onClick={() => void handleHandoff()}
                    >
                      {isHandingOff ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <MonitorUp className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('workspace.nativeOpenTerminal')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            {isTerminalStatus(session.status) ? (
              <Button type="button" variant="outline" size="sm" onClick={onStartNew}>
                {t('workspace.newSession')}
              </Button>
            ) : null}
          </>
        )}
      />
    </div>
  );
}
