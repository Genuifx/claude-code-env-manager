import stickerSheetUrl from '@/assets/session-sticker-sheet.png';
import type { SessionStickerId, SessionTaskStage } from '@/features/conversations/types';

export interface SessionTaskStageDefinition {
  id: SessionTaskStage;
  labelKey: string;
  className: string;
}

export interface SessionStickerDefinition {
  id: SessionStickerId;
  labelKey: string;
  col: number;
  row: number;
}

export const SESSION_TASK_STAGES: SessionTaskStageDefinition[] = [
  { id: 'ideation', labelKey: 'workspace.annotationStageIdeation', className: 'bg-violet-500/15 text-violet-300 border-violet-400/20' },
  { id: 'implementation', labelKey: 'workspace.annotationStageImplementation', className: 'bg-sky-500/15 text-sky-300 border-sky-400/20' },
  { id: 'validation', labelKey: 'workspace.annotationStageValidation', className: 'bg-amber-500/15 text-amber-300 border-amber-400/20' },
  { id: 'release', labelKey: 'workspace.annotationStageRelease', className: 'bg-teal-500/15 text-teal-300 border-teal-400/20' },
  { id: 'done', labelKey: 'workspace.annotationStageDone', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20' },
];

export const SESSION_STICKERS: SessionStickerDefinition[] = [
  { id: 'focused', labelKey: 'workspace.annotationStickerFocused', col: 0, row: 0 },
  { id: 'excited', labelKey: 'workspace.annotationStickerExcited', col: 1, row: 0 },
  { id: 'calm', labelKey: 'workspace.annotationStickerCalm', col: 2, row: 0 },
  { id: 'blocked', labelKey: 'workspace.annotationStickerBlocked', col: 3, row: 0 },
  { id: 'confused', labelKey: 'workspace.annotationStickerConfused', col: 0, row: 1 },
  { id: 'waiting', labelKey: 'workspace.annotationStickerWaiting', col: 1, row: 1 },
  { id: 'urgent', labelKey: 'workspace.annotationStickerUrgent', col: 2, row: 1 },
  { id: 'reviewing', labelKey: 'workspace.annotationStickerReviewing', col: 3, row: 1 },
  { id: 'shipping', labelKey: 'workspace.annotationStickerShipping', col: 0, row: 2 },
  { id: 'celebrating', labelKey: 'workspace.annotationStickerCelebrating', col: 1, row: 2 },
  { id: 'risky', labelKey: 'workspace.annotationStickerRisky', col: 2, row: 2 },
  { id: 'archived', labelKey: 'workspace.annotationStickerArchived', col: 3, row: 2 },
];

export function getSessionTaskStageDefinition(stage?: SessionTaskStage) {
  return SESSION_TASK_STAGES.find((item) => item.id === stage);
}

export function getSessionStickerDefinition(sticker?: SessionStickerId) {
  return SESSION_STICKERS.find((item) => item.id === sticker);
}

export function getStickerSpriteStyle(sticker: SessionStickerDefinition) {
  return {
    backgroundImage: `url(${stickerSheetUrl})`,
    backgroundSize: '400% 300%',
    backgroundPosition: `${(sticker.col / 3) * 100}% ${(sticker.row / 2) * 100}%`,
  };
}
