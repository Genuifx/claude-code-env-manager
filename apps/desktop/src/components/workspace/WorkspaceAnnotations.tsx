import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, MessageSquareQuote, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLocale } from '@/locales';
import { cn } from '@/lib/utils';
import {
  MAX_WORKSPACE_SELECTION_CHARS,
  normalizeWorkspaceSelection,
  type WorkspaceAnnotation,
} from './workspaceAnnotationModel';

interface SelectionCandidate {
  quote: string;
  left: number;
  top: number;
  editing: boolean;
}

interface WorkspaceTranscriptSelectionProps {
  rootRef: RefObject<HTMLElement | null>;
  canAdd: boolean;
  onAdd: (quote: string, note: string) => boolean;
}

function selectionNodeIsInside(root: HTMLElement, node: Node | null): boolean {
  return Boolean(node && (node === root || root.contains(node)));
}

export function WorkspaceTranscriptSelection({
  rootRef,
  canAdd,
  onAdd,
}: WorkspaceTranscriptSelectionProps) {
  const { t } = useLocale();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [candidate, setCandidate] = useState<SelectionCandidate | null>(null);
  const [note, setNote] = useState('');

  const dismiss = useCallback(() => {
    setCandidate(null);
    setNote('');
  }, []);

  const captureSelection = useCallback((event?: Event) => {
    const target = event?.target;
    if (target instanceof Element && target.closest('[data-workspace-selection-action]')) {
      return;
    }

    const root = rootRef.current;
    const selection = window.getSelection();
    if (!root || !selection || selection.isCollapsed || selection.rangeCount === 0) {
      if (!candidate?.editing) {
        dismiss();
      }
      return;
    }
    if (
      !selectionNodeIsInside(root, selection.anchorNode)
      || !selectionNodeIsInside(root, selection.focusNode)
    ) {
      if (!candidate?.editing) {
        dismiss();
      }
      return;
    }

    const rawText = selection.toString();
    const quote = normalizeWorkspaceSelection(rawText);
    if (!quote) {
      if (rawText.trim().length > MAX_WORKSPACE_SELECTION_CHARS) {
        setCandidate(null);
      } else if (!candidate?.editing) {
        dismiss();
      }
      return;
    }

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      return;
    }
    setCandidate({
      quote,
      left: Math.max(124, Math.min(window.innerWidth - 124, rect.left + rect.width / 2)),
      top: Math.max(12, Math.min(window.innerHeight - 72, rect.bottom + 8)),
      editing: false,
    });
    setNote('');
  }, [candidate?.editing, dismiss, rootRef]);

  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => captureSelection(event);
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dismiss();
        return;
      }
      if (event.key.startsWith('Arrow') || event.key === 'Shift') {
        captureSelection(event);
      }
    };
    const handleResize = () => dismiss();
    document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [captureSelection, dismiss]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    root.addEventListener('scroll', dismiss, { passive: true });
    return () => root.removeEventListener('scroll', dismiss);
  }, [dismiss, rootRef]);

  useEffect(() => {
    if (!candidate?.editing) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        dismiss();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [candidate?.editing, dismiss]);

  if (!candidate || typeof document === 'undefined') {
    return null;
  }

  const save = () => {
    if (!note.trim()) {
      return;
    }
    if (onAdd(candidate.quote, note)) {
      window.getSelection()?.removeAllRanges();
      dismiss();
    }
  };

  return createPortal(
    <div
      ref={panelRef}
      data-workspace-selection-action
      className={cn(
        'fixed z-[100] -translate-x-1/2 rounded-2xl border border-border/45 bg-popover shadow-xl',
        candidate.editing ? 'w-[min(420px,calc(100vw-24px))] p-3' : 'p-1',
      )}
      style={{ left: candidate.left, top: candidate.top }}
      onMouseDown={(event) => {
        if (!candidate.editing) {
          event.preventDefault();
        }
      }}
    >
      {candidate.editing ? (
        <div className="space-y-2.5">
          <div className="flex items-start gap-2">
            <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="line-clamp-3 text-xs leading-5 text-foreground/80">
              {candidate.quote}
            </p>
          </div>
          <textarea
            autoFocus
            maxLength={4_000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                save();
              }
            }}
            placeholder={t('workspace.selectionAnnotationPlaceholder')}
            className="min-h-[72px] w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              {t('workspace.selectionAnnotationSubmitHint')}
            </span>
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant="ghost" className="h-7 rounded-full px-3" onClick={dismiss}>
                {t('common.cancel')}
              </Button>
              <Button type="button" size="sm" className="h-7 rounded-full px-3" disabled={!note.trim()} onClick={save}>
                <Check className="mr-1 h-3.5 w-3.5" />
                {t('workspace.selectionAnnotationAdd')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 rounded-xl px-3"
          disabled={!canAdd}
          onClick={() => setCandidate((current) => current ? {
            ...current,
            editing: true,
            top: Math.max(12, Math.min(current.top, window.innerHeight - 230)),
          } : current)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t(canAdd ? 'workspace.selectionAddToTask' : 'workspace.selectionAnnotationLimit')}
        </Button>
      )}
    </div>,
    document.body,
  );
}

interface WorkspaceComposerAnnotationsProps {
  annotations: WorkspaceAnnotation[];
  onUpdate: (id: string, note: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function WorkspaceComposerAnnotations({
  annotations,
  onUpdate,
  onRemove,
  onClear,
}: WorkspaceComposerAnnotationsProps) {
  const { t } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState('');
  const countLabel = useMemo(
    () => t('workspace.composerAnnotationCount').replace('{count}', String(annotations.length)),
    [annotations.length, t],
  );

  if (annotations.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/40 bg-surface px-2.5 text-[11px] font-medium text-foreground/85 transition-colors hover:bg-muted/60"
          >
            <MessageSquareQuote className="h-3.5 w-3.5 text-muted-foreground" />
            {countLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-[min(440px,calc(100vw-24px))] rounded-2xl border-border/45 bg-popover p-2 shadow-xl"
        >
          <div className="mb-1.5 flex items-center justify-between px-1">
            <span className="text-xs font-semibold">{t('workspace.composerAnnotationsTitle')}</span>
            <Button type="button" size="sm" variant="ghost" className="h-7 rounded-full px-2 text-[10px]" onClick={onClear}>
              <Trash2 className="mr-1 h-3 w-3" />
              {t('workspace.composerAnnotationsClear')}
            </Button>
          </div>
          <div className="max-h-[320px] space-y-1.5 overflow-y-auto">
            {annotations.map((annotation, index) => (
              <div key={annotation.id} className="rounded-xl bg-surface px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-[10px] font-semibold text-muted-foreground">{index + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-3 text-[11px] leading-4.5 text-muted-foreground">
                      {annotation.quote}
                    </p>
                    {editingId === annotation.id ? (
                      <div className="mt-2 space-y-1.5">
                        <textarea
                          autoFocus
                          maxLength={4_000}
                          value={editingNote}
                          onChange={(event) => setEditingNote(event.target.value)}
                          className="min-h-[64px] w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        />
                        <div className="flex justify-end gap-1">
                          <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setEditingId(null)}>
                            {t('common.cancel')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            disabled={!editingNote.trim()}
                            onClick={() => {
                              onUpdate(annotation.id, editingNote);
                              setEditingId(null);
                            }}
                          >
                            {t('common.save')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground/90">{annotation.note}</p>
                    )}
                  </div>
                  {editingId !== annotation.id ? (
                    <div className="flex shrink-0 gap-0.5">
                      <button
                        type="button"
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        aria-label={t('workspace.composerAnnotationEdit')}
                        onClick={() => {
                          setEditingId(annotation.id);
                          setEditingNote(annotation.note);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        aria-label={t('workspace.composerAnnotationRemove')}
                        onClick={() => onRemove(annotation.id)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <button
        type="button"
        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        aria-label={t('workspace.composerAnnotationsClear')}
        onClick={onClear}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
