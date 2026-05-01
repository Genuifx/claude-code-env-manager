import {
  ArrowUp,
  Bot,
  Check,
  ClipboardList,
  Layers3,
  LoaderCircle,
  MessageSquareQuote,
  ShieldAlert,
  Square,
  SquarePen,
  TerminalSquare,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import type {
  InteractivePromptAnnotation,
  InteractiveToolPrompt,
  NativeSessionSummary,
  SessionEventRecord,
  ToolQuestionPrompt,
} from '@/lib/tauri-ipc';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { useAppStore } from '@/store';
import type { InstalledSkill, LaunchClient } from '@/store';
import type { PermissionModeName } from '@ccem/core/browser';
import type {
  ConversationContentBlock,
  ConversationMessageData,
} from '@/features/conversations/types';
import {
  buildComposerPromptPreview,
  buildComposerPromptText,
  extractComposerImagePayloads,
  type ComposerAttachment,
  type ComposerSubmitPayload,
} from './composerAttachments';
import { WorkspaceTranscriptList } from './WorkspaceTranscriptList';
import { WorkspaceSessionComposer } from './WorkspaceSessionComposer';
import {
  ComposerControls,
  normalizePermissionModeName,
  providerDisplayName,
} from './ComposerControls';
import type { EffortLevel } from './ComposerControls';

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

interface InteractivePromptAnswer {
  selectedOptions: string[];
  customSelected: boolean;
  customText: string;
}

interface InteractivePromptState {
  currentQuestionIndex: number;
  answers: Record<number, InteractivePromptAnswer>;
}

type InteractivePromptReplyPayload =
  | {
      kind: 'text';
      text: string;
      attachments?: ComposerAttachment[];
    }
  | {
      kind: 'ask_user_question';
      toolUseId: string;
      text: string;
      answers: Record<string, string>;
      annotations?: Record<string, InteractivePromptAnnotation>;
    };

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
  codexInstalled?: boolean;
  opencodeInstalled?: boolean;
  onLaunchNewSession?: (client: LaunchClient) => void;
}

const ACTIVE_POLL_INTERVAL_MS = 140;
const IDLE_POLL_INTERVAL_MS = 700;
const TERMINAL_POLL_INTERVAL_MS = 1100;

function isTerminalStatus(status: string) {
  return status === 'stopped' || status === 'error' || status === 'handoff' || status === 'interrupted';
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

function questionDisplayLabel(question: {
  header?: string | null;
  question: string;
}) {
  return question.header?.trim() || question.question.trim();
}

function createEmptyPromptAnswer(): InteractivePromptAnswer {
  return {
    selectedOptions: [],
    customSelected: false,
    customText: '',
  };
}

function getPromptAnswerState(
  question: ToolQuestionPrompt,
  answer?: InteractivePromptAnswer | null,
) {
  const selectedLabels = new Set(answer?.selectedOptions ?? []);
  const selectedOptions = question.options.filter((option) => selectedLabels.has(option.label));
  const trimmedCustomText = answer?.customText.trim() ?? '';

  return {
    selectedOptions,
    selectedLabels: selectedOptions.map((option) => option.label),
    selectedPreviews: selectedOptions
      .map((option) => option.preview?.trim())
      .filter((value): value is string => Boolean(value)),
    customSelected: Boolean(answer?.customSelected),
    customText: answer?.customText ?? '',
    trimmedCustomText,
  };
}

function questionHasPromptAnswer(
  question: ToolQuestionPrompt,
  answer?: InteractivePromptAnswer | null,
) {
  const answerState = getPromptAnswerState(question, answer);
  if (answerState.customSelected && !answerState.trimmedCustomText) {
    return false;
  }

  return answerState.selectedLabels.length > 0 || answerState.customSelected;
}

function buildAskUserQuestionResponse(
  questions: ToolQuestionPrompt[],
  answers: Record<number, InteractivePromptAnswer>,
) {
  const collectedAnswers: Record<string, string> = {};
  const annotations: Record<string, InteractivePromptAnnotation> = {};
  const summaryLines: string[] = [];

  for (const [index, question] of questions.entries()) {
    const answer = answers[index];
    const answerState = getPromptAnswerState(question, answer);
    if (!questionHasPromptAnswer(question, answer)) {
      return null;
    }

    const answerParts = [...answerState.selectedLabels];
    if (answerState.customSelected && answerState.trimmedCustomText) {
      answerParts.push(answerState.trimmedCustomText);
    }
    const answerValue = answerParts.join(', ');
    collectedAnswers[question.question] = answerValue;
    summaryLines.push(
      questions.length === 1
        ? answerValue
        : `${index + 1}. ${questionDisplayLabel(question)}: ${answerValue}`,
    );

    const preview = answerState.selectedPreviews.join('\n\n').trim();
    const notes = answerState.customSelected ? answerState.trimmedCustomText : undefined;

    if (preview || notes) {
      annotations[question.question] = {
        ...(preview ? { preview } : {}),
        ...(notes ? { notes } : {}),
      };
    }
  }

  return {
    text: summaryLines.join('\n'),
    answers: collectedAnswers,
    annotations: Object.keys(annotations).length > 0 ? annotations : undefined,
  };
}

function buildMessagesFromEvents(
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
        // After a turn completes, insert the next queued user prompt
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

  // Append any remaining user prompts that haven't been matched to a turn yet
  // (e.g. user just sent a message and the turn hasn't completed)
  for (const prompt of promptQueue) {
    next.push(createUserMessage(prompt));
  }

  return next;
}

function WorkspaceAttentionPanel({
  provider,
  attentionState,
  respondingRequestId,
  isSubmittingPrompt,
  onPermission,
  onSubmitPromptReply,
}: {
  provider: string;
  attentionState: NativeSessionAttentionState;
  respondingRequestId: string | null;
  isSubmittingPrompt: boolean;
  onPermission: (requestId: string, approved: boolean) => void;
  onSubmitPromptReply: (payload: InteractivePromptReplyPayload) => Promise<boolean>;
}) {
  const { t } = useLocale();
  const [promptStates, setPromptStates] = useState<Record<string, InteractivePromptState>>({});

  useEffect(() => {
    const activePromptIds = new Set(attentionState.prompts.map((prompt) => prompt.toolUseId));
    setPromptStates((previous) => {
      const nextEntries = Object.entries(previous)
        .filter(([toolUseId]) => activePromptIds.has(toolUseId));

      if (
        nextEntries.length === Object.keys(previous).length
        && nextEntries.every(([toolUseId]) => toolUseId in previous)
      ) {
        return previous;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [attentionState.prompts]);

  const updatePromptState = useCallback((
    toolUseId: string,
    updater: (current: InteractivePromptState) => InteractivePromptState,
  ) => {
    setPromptStates((previous) => {
      const current = previous[toolUseId] ?? {
        currentQuestionIndex: 0,
        answers: {},
      };

      return {
        ...previous,
        [toolUseId]: updater(current),
      };
    });
  }, []);

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
        const questionPrompt = entry.prompt.prompt_type === 'ask_user_question'
          ? entry.prompt
          : null;

        if (questionPrompt?.questions.length) {
          const providerName = providerDisplayName(provider);
          const customOptionLabel = t('workspace.nativePromptAdjust')
            .replace('{provider}', providerName);
          const promptState = promptStates[entry.toolUseId] ?? {
            currentQuestionIndex: 0,
            answers: {},
          };
          const questionIndex = Math.min(
            promptState.currentQuestionIndex,
            questionPrompt.questions.length - 1,
          );
          const currentQuestion = questionPrompt.questions[questionIndex]!;
          const currentAnswer = promptState.answers[questionIndex];
          const currentAnswerState = getPromptAnswerState(currentQuestion, currentAnswer);
          const questionOptions = [
            ...currentQuestion.options.map((option) => ({
              ...option,
              optionKind: 'option' as const,
            })),
            {
              label: customOptionLabel,
              description: t('workspace.nativePromptAdjustHint'),
              preview: undefined,
              optionKind: 'custom' as const,
            },
          ];
          const selectedPreview = currentAnswerState.selectedPreviews.join('\n\n').trim();
          const selectedSummary = [
            ...currentAnswerState.selectedLabels,
            ...(currentAnswerState.customSelected && currentAnswerState.trimmedCustomText
              ? [currentAnswerState.trimmedCustomText]
              : []),
          ].join(', ');
          const selectedCount = currentAnswerState.selectedLabels.length
            + (currentAnswerState.customSelected && currentAnswerState.trimmedCustomText ? 1 : 0);
          const isLastQuestion = questionIndex === questionPrompt.questions.length - 1;
          const canAdvance = isLastQuestion
            ? questionPrompt.questions.every((question, index) =>
              questionHasPromptAnswer(question, promptState.answers[index]))
            : questionHasPromptAnswer(currentQuestion, currentAnswer);
          const progressLabel = t('workspace.nativePromptProgress')
            .replace('{current}', String(questionIndex + 1))
            .replace('{total}', String(questionPrompt.questions.length));

          return (
            <div
              key={entry.toolUseId}
              className="rounded-2xl bg-muted/30 px-5 py-5"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-muted-foreground/80">
                    {progressLabel}
                  </p>
                  {currentQuestion.header ? (
                    <p className="mt-1 text-[13px] font-medium text-muted-foreground/85">
                      {currentQuestion.header}
                    </p>
                  ) : null}
                  <h3 className="mt-1 text-[17px] font-semibold leading-snug text-foreground">
                    {currentQuestion.question}
                  </h3>
                  {currentQuestion.multiSelect ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground/80">
                      {t('workspace.nativePromptMultiSelectHint')}
                    </p>
                  ) : null}
                  {currentQuestion.multiSelect && selectedCount > 0 ? (
                    <p className="mt-2 text-[12px] font-medium text-muted-foreground/75">
                      {t('workspace.nativePromptSelectedCount').replace('{count}', String(selectedCount))}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-md bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground/80">
                  {entry.rawName}
                </span>
              </div>

              {selectedSummary || selectedPreview ? (
                <div className="mt-4 rounded-lg bg-muted/40 px-4 py-3 font-mono text-[13px] text-muted-foreground">
                  {selectedSummary ? (
                    <p className="whitespace-pre-wrap text-foreground/90">
                      {selectedSummary}
                    </p>
                  ) : null}
                  {selectedPreview ? (
                    <p className={cn(
                      'whitespace-pre-wrap',
                      selectedSummary ? 'mt-2 text-muted-foreground' : 'text-muted-foreground',
                    )}>
                      {selectedPreview.split('\n').slice(0, 6).join('\n')}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 space-y-2">
                {questionOptions.map((option, index) => {
                  const isSelected = option.optionKind === 'custom'
                    ? currentAnswerState.customSelected
                    : currentAnswerState.selectedLabels.includes(option.label);
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
                        const emptyAnswer = createEmptyPromptAnswer();
                        updatePromptState(entry.toolUseId, (current) => ({
                          ...current,
                          answers: {
                            ...current.answers,
                            [questionIndex]: (() => {
                              const answerForQuestion = current.answers[questionIndex] ?? emptyAnswer;
                              if (option.optionKind === 'custom') {
                                return currentQuestion.multiSelect
                                  ? {
                                    ...answerForQuestion,
                                    customSelected: !answerForQuestion.customSelected,
                                  }
                                  : {
                                    ...answerForQuestion,
                                    selectedOptions: [],
                                    customSelected: true,
                                  };
                              }

                              if (!currentQuestion.multiSelect) {
                                return {
                                  ...answerForQuestion,
                                  selectedOptions: [option.label],
                                  customSelected: false,
                                };
                              }

                              const nextSelectedOptions = answerForQuestion.selectedOptions.includes(option.label)
                                ? answerForQuestion.selectedOptions.filter((value) => value !== option.label)
                                : [...answerForQuestion.selectedOptions, option.label];

                              return {
                                ...answerForQuestion,
                                selectedOptions: nextSelectedOptions,
                              };
                            })(),
                          },
                        }));
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn(
                          'mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-[12px] transition-colors',
                          isSelected
                            ? 'border-foreground/60 bg-foreground/10 text-foreground'
                            : 'border-border/70 text-muted-foreground/60',
                        )}>
                          {isSelected ? <Check className="h-3.5 w-3.5" /> : index + 1}
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

              {currentAnswerState.customSelected ? (
                <div className="mt-4 space-y-2">
                  <label
                    htmlFor={`ask-user-custom-${entry.toolUseId}-${questionIndex}`}
                    className="text-[12px] font-medium text-muted-foreground/80"
                  >
                    {t('workspace.nativePromptCustomLabel')}
                  </label>
                  <textarea
                    id={`ask-user-custom-${entry.toolUseId}-${questionIndex}`}
                    value={currentAnswerState.customText}
                    onChange={(event) => {
                      const value = event.target.value;
                      updatePromptState(entry.toolUseId, (current) => ({
                        ...current,
                        answers: {
                          ...current.answers,
                          [questionIndex]: {
                            ...(current.answers[questionIndex] ?? createEmptyPromptAnswer()),
                            customSelected: true,
                            customText: value,
                          },
                        },
                      }));
                    }}
                    rows={4}
                    placeholder={t('workspace.nativePromptCustomPlaceholder')}
                    className="min-h-[112px] w-full resize-y rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-[14px] leading-relaxed text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              ) : null}

              <div className="mt-5 flex items-center justify-end gap-2">
                {questionIndex > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-4 text-[13px]"
                    disabled={isSubmittingPrompt}
                    onClick={() => {
                      updatePromptState(entry.toolUseId, (current) => ({
                        ...current,
                        currentQuestionIndex: Math.max(0, current.currentQuestionIndex - 1),
                      }));
                    }}
                  >
                    {t('workspace.nativePromptBack')}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="h-9 rounded-lg bg-foreground px-5 text-[13px] font-medium text-background hover:bg-foreground/90"
                  disabled={!canAdvance || isSubmittingPrompt}
                  onClick={async () => {
                    if (!canAdvance) {
                      return;
                    }

                    if (!isLastQuestion) {
                      updatePromptState(entry.toolUseId, (current) => ({
                        ...current,
                        currentQuestionIndex: Math.min(
                          questionPrompt.questions.length - 1,
                          current.currentQuestionIndex + 1,
                        ),
                      }));
                      return;
                    }

                    const reply = buildAskUserQuestionResponse(
                      questionPrompt.questions,
                      promptState.answers,
                    );
                    if (!reply) {
                      return;
                    }

                    await onSubmitPromptReply({
                      kind: 'ask_user_question',
                      toolUseId: entry.toolUseId,
                      text: reply.text,
                      answers: reply.answers,
                      annotations: reply.annotations,
                    });
                  }}
                >
                  {isLastQuestion ? t('common.submit') : t('workspace.nativePromptContinue')}
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
                    disabled={isSubmittingPrompt}
                    onClick={() => {
                      void onSubmitPromptReply({
                        kind: 'text',
                        text: reply,
                      });
                    }}
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
  codexInstalled = false,
  opencodeInstalled = false,
  onLaunchNewSession,
}: WorkspaceNativeSessionViewProps) {
  const { t } = useLocale();
  const environments = useAppStore((state) => state.environments);
  const {
    getNativeSessionEvents,
    sendNativeSessionInput,
    respondNativeSessionPermission,
    respondNativeSessionPrompt,
    stopNativeSession,
    updateNativeSessionSettings,
    handoffNativeSessionToTerminal,
    listNativeSessions,
    searchWorkspaceFiles,
  } = useTauriCommands();
  const [sessionEnv, setSessionEnv] = useState(session.env_name);
  const [sessionRuntimePermMode, setSessionRuntimePermMode] = useState(session.perm_mode);
  const sessionPermMode = normalizePermissionModeName(sessionRuntimePermMode);
  const [sessionEffort, setSessionEffort] = useState<EffortLevel>('high');
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

  useEffect(() => {
    setSessionEnv(session.env_name);
    setSessionRuntimePermMode(session.perm_mode);
  }, [session.env_name, session.perm_mode, session.runtime_id]);

  const messages = useMemo(
    () => buildMessagesFromEvents(
      buildBaseMessages(seedMessages, localUserPrompts[0]),
      localUserPrompts.slice(1),
      events,
      session.status === 'error' ? session.last_error : null,
    ),
    [events, localUserPrompts, seedMessages, session.last_error, session.status],
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
  const hasAskUserQuestionPrompt = attentionState.prompts.some(
    (entry) => entry.prompt.prompt_type === 'ask_user_question',
  );
  const hasQuickReplyPrompt = attentionState.prompts.some(
    (entry) => entry.prompt.prompt_type !== 'ask_user_question',
  );
  const hasHardBlockingAttention = attentionState.permissions.length > 0
    || Boolean(attentionState.terminalPrompt)
    || hasAskUserQuestionPrompt;
  const hasBlockingAttention = hasHardBlockingAttention || hasQuickReplyPrompt;
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

    if (sessionRuntimePermMode === 'plan') {
      return trimmedText;
    }

    return [
      'Stay in planning mode for this reply.',
      'Outline the plan only and wait for confirmation before executing changes.',
      '',
      trimmedText,
    ].join('\n');
  }, [session.provider, sessionRuntimePermMode]);

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
    const allAttachments = prompts.flatMap((p) => p.attachments);
    const images = extractComposerImagePayloads(allAttachments);
    const payload = buildQueuedBatchText(prompts.map((prompt) => ({
      text: prompt.text,
      planMode: prompt.planMode,
      attachments: prompt.attachments,
    })));
    if (!payload && images.length === 0) {
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
      await sendNativeSessionInput(
        session.runtime_id,
        payload ?? '',
        images.length > 0 ? images : undefined,
      );
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

  const sendInteractivePromptReply = useCallback(async (
    payload: InteractivePromptReplyPayload,
  ) => {
    const promptEntry = {
      id: `user-${Date.now()}`,
      text: payload.kind === 'ask_user_question'
        ? payload.text
        : buildComposerPromptPreview(payload.text, payload.attachments ?? []),
      timestamp: Date.now(),
    };

    let requestText = '';
    let requestImages: Array<{ mediaType: string; base64Data: string }> | undefined;
    if (payload.kind === 'text') {
      requestText = buildComposerPromptText(payload.text, payload.attachments ?? []);
      const images = extractComposerImagePayloads(payload.attachments ?? []);
      requestImages = images.length > 0 ? images : undefined;
      if (!requestText.trim() && !requestImages) {
        return false;
      }
    }

    setIsSending(true);
    setLocalUserPrompts((previous) => [...previous, promptEntry]);
    if (payload.kind === 'text') {
      setComposerText('');
      setComposerPlanModeEnabled(sessionRuntimePermMode === 'plan');
    }

    try {
      if (payload.kind === 'ask_user_question') {
        await respondNativeSessionPrompt(session.runtime_id, {
          toolUseId: payload.toolUseId,
          promptType: 'ask_user_question',
          answers: payload.answers,
          annotations: payload.annotations,
        });
      } else {
        await sendNativeSessionInput(session.runtime_id, requestText, requestImages);
      }
      await pollEvents();
      await refreshSummary();
      return true;
    } catch (error) {
      console.error('Failed to send interactive prompt reply:', error);
      setLocalUserPrompts((previous) =>
        previous.filter((prompt) => prompt.id !== promptEntry.id),
      );
      toast.error(t('workspace.nativeSendFailed'));
      return false;
    } finally {
      setIsSending(false);
    }
  }, [
    pollEvents,
    refreshSummary,
    respondNativeSessionPrompt,
    sendNativeSessionInput,
    sessionRuntimePermMode,
    session.runtime_id,
    t,
  ]);

  const handleEnvChange = useCallback((envName: string) => {
    const previousEnv = sessionEnv;
    setSessionEnv(envName);
    void updateNativeSessionSettings(session.runtime_id, envName, undefined)
      .then(refreshSummary)
      .catch((error) => {
        console.error('Failed to update native session environment:', error);
        setSessionEnv(previousEnv);
        toast.error(t('workspace.nativeSettingsFailed'));
      });
  }, [refreshSummary, session.runtime_id, sessionEnv, t, updateNativeSessionSettings]);

  const handlePermModeChange = useCallback((mode: PermissionModeName) => {
    const previousMode = sessionRuntimePermMode;
    setSessionRuntimePermMode(mode);
    setComposerPlanModeEnabled(false);
    void updateNativeSessionSettings(session.runtime_id, undefined, mode)
      .then(refreshSummary)
      .catch((error) => {
        console.error('Failed to update native session permission mode:', error);
        setSessionRuntimePermMode(previousMode);
        setComposerPlanModeEnabled(previousMode === 'plan');
        toast.error(t('workspace.nativeSettingsFailed'));
      });
  }, [refreshSummary, session.runtime_id, sessionRuntimePermMode, t, updateNativeSessionSettings]);

  const handleEffortChange = useCallback((effort: EffortLevel) => {
    const previousEffort = sessionEffort;
    setSessionEffort(effort);
    void updateNativeSessionSettings(session.runtime_id, undefined, undefined, effort)
      .catch((error) => {
        console.error('Failed to update native session effort:', error);
        setSessionEffort(previousEffort);
        toast.error(t('workspace.nativeSettingsFailed'));
      });
  }, [session.runtime_id, sessionEffort, t, updateNativeSessionSettings]);

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
    setComposerPlanModeEnabled(sessionRuntimePermMode === 'plan');

    if (hasQuickReplyPrompt && !isProcessingTurn && !hasHardBlockingAttention) {
      return sendInteractivePromptReply({
        kind: 'text',
        text,
        attachments,
      });
    }

    if (isProcessingTurn || hasHardBlockingAttention) {
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
    hasHardBlockingAttention,
    hasQuickReplyPrompt,
    isProcessingTurn,
    sendPromptBatch,
    sendInteractivePromptReply,
    sessionRuntimePermMode,
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
        primaryActionLabel={
          isTerminalStatus(session.status)
            ? t('workspace.newSession')
            : !composerText.trim() && isProcessingTurn
              ? t('workspace.nativeStop')
              : t('workspace.composeSend')
        }
        primaryActionIcon={
          isTerminalStatus(session.status)
            ? <SquarePen className="h-4 w-4" />
            : !composerText.trim() && isProcessingTurn
              ? <ProcessingActionIcon stopping={isStopping} />
              : <ArrowUp className="h-4 w-4" />
        }
        primaryActionDisabled={
          isTerminalStatus(session.status)
            ? false
            : !composerText.trim() && isProcessingTurn
              ? isStopping
              : undefined
        }
        onPrimaryAction={
          isTerminalStatus(session.status)
            ? onStartNew
            : !composerText.trim() && isProcessingTurn
              ? () => void handleStop()
              : undefined
        }
        primaryActionVariant={
          isTerminalStatus(session.status)
            ? 'outline'
            : 'default'
        }
        primaryActionClassName={
          isTerminalStatus(session.status)
            ? 'shadow-none w-auto rounded-full px-3 gap-1.5'
            : undefined
        }
        provider={session.provider}
        installedSkills={installedSkills}
        workingDir={session.project_dir}
        searchWorkspaceFiles={searchWorkspaceFiles}
        planModeEnabled={composerPlanModeEnabled}
        onPlanModeEnabledChange={setComposerPlanModeEnabled}
        planModeHint={session.provider === 'claude' && sessionRuntimePermMode === 'plan'
          ? t('workspace.composerPlanModeHintClaudeLocked')
          : undefined}
        codexInstalled={codexInstalled}
        opencodeInstalled={opencodeInstalled}
        onLaunchNewSession={onLaunchNewSession}
        queuedMessages={queuedMessages}
        onFlushQueuedMessages={() => void flushQueuedMessages()}
        onRemoveQueuedMessage={(id) => {
          setQueuedMessages((previous) => previous.filter((message) => message.id !== id));
        }}
        queueCanFlush={!isSending && !isProcessingTurn && !hasBlockingAttention}
        aboveComposer={hasAttentionPanel ? (
          <WorkspaceAttentionPanel
            provider={session.provider}
            attentionState={attentionState}
            respondingRequestId={respondingRequestId}
            isSubmittingPrompt={isSending}
            onPermission={(requestId, approved) => {
              void handlePermission(requestId, approved);
            }}
            onSubmitPromptReply={async (payload) => {
              return await sendInteractivePromptReply(payload);
            }}
          />
        ) : null}
        controls={(
          <ComposerControls
            provider={session.provider}
            envName={sessionEnv}
            permMode={sessionPermMode}
            effort={sessionEffort}
            environments={environments}
            onEnvChange={handleEnvChange}
            onPermModeChange={handlePermModeChange}
            onEffortChange={handleEffortChange}
          />
        )}
        secondaryActions={(
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-full"
                  disabled={isHandingOff}
                  onClick={() => void handleHandoff()}
                >
                  {isHandingOff ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <TerminalSquare className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{t('workspace.nativeOpenTerminal')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      />
    </div>
  );
}
