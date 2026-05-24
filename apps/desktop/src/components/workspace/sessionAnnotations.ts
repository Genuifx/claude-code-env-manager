import archivedStickerUrl from '@/assets/session-stickers/archived.png';
import blockedStickerUrl from '@/assets/session-stickers/blocked.png';
import calmStickerUrl from '@/assets/session-stickers/calm.png';
import celebratingStickerUrl from '@/assets/session-stickers/celebrating.png';
import confusedStickerUrl from '@/assets/session-stickers/confused.png';
import excitedStickerUrl from '@/assets/session-stickers/excited.png';
import focusedStickerUrl from '@/assets/session-stickers/focused.png';
import reviewingStickerUrl from '@/assets/session-stickers/reviewing.png';
import riskyStickerUrl from '@/assets/session-stickers/risky.png';
import shippingStickerUrl from '@/assets/session-stickers/shipping.png';
import urgentStickerUrl from '@/assets/session-stickers/urgent.png';
import waitingStickerUrl from '@/assets/session-stickers/waiting.png';
import type { SessionStickerId, SessionTaskStage } from '@/features/conversations/types';

export interface SessionTaskStageDefinition {
  id: SessionTaskStage;
  labelKey: string;
  className: string;
}

export interface SessionStickerDefinition {
  id: SessionStickerId;
  labelKey: string;
  imageUrl: string;
}

export const SESSION_TASK_STAGES: SessionTaskStageDefinition[] = [
  { id: 'ideation', labelKey: 'workspace.annotationStageIdeation', className: 'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300' },
  { id: 'implementation', labelKey: 'workspace.annotationStageImplementation', className: 'bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300' },
  { id: 'validation', labelKey: 'workspace.annotationStageValidation', className: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300' },
  { id: 'release', labelKey: 'workspace.annotationStageRelease', className: 'bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-300' },
  { id: 'done', labelKey: 'workspace.annotationStageDone', className: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' },
];

export const SESSION_STICKERS: SessionStickerDefinition[] = [
  { id: 'focused', labelKey: 'workspace.annotationStickerFocused', imageUrl: focusedStickerUrl },
  { id: 'excited', labelKey: 'workspace.annotationStickerExcited', imageUrl: excitedStickerUrl },
  { id: 'calm', labelKey: 'workspace.annotationStickerCalm', imageUrl: calmStickerUrl },
  { id: 'blocked', labelKey: 'workspace.annotationStickerBlocked', imageUrl: blockedStickerUrl },
  { id: 'confused', labelKey: 'workspace.annotationStickerConfused', imageUrl: confusedStickerUrl },
  { id: 'waiting', labelKey: 'workspace.annotationStickerWaiting', imageUrl: waitingStickerUrl },
  { id: 'urgent', labelKey: 'workspace.annotationStickerUrgent', imageUrl: urgentStickerUrl },
  { id: 'reviewing', labelKey: 'workspace.annotationStickerReviewing', imageUrl: reviewingStickerUrl },
  { id: 'shipping', labelKey: 'workspace.annotationStickerShipping', imageUrl: shippingStickerUrl },
  { id: 'celebrating', labelKey: 'workspace.annotationStickerCelebrating', imageUrl: celebratingStickerUrl },
  { id: 'risky', labelKey: 'workspace.annotationStickerRisky', imageUrl: riskyStickerUrl },
  { id: 'archived', labelKey: 'workspace.annotationStickerArchived', imageUrl: archivedStickerUrl },
];

export function getSessionTaskStageDefinition(stage?: SessionTaskStage) {
  return SESSION_TASK_STAGES.find((item) => item.id === stage);
}

export function getSessionStickerDefinition(sticker?: SessionStickerId) {
  return SESSION_STICKERS.find((item) => item.id === sticker);
}
