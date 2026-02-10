import { useState } from 'react';
import { FolderOpen, Star, Clock, Check, Loader2 } from 'lucide-react';
import { useLocale } from '@/locales';
import { useAppStore, type ArrangeLayout } from '@/store';

interface LauncherQuickSectionProps {
  onLaunchMulti: (dirs: string[], layout: ArrangeLayout) => void;
  onBrowse: () => void;
  isLaunching: boolean;
}

export function LauncherQuickSection({ onLaunchMulti, onBrowse, isLaunching }: LauncherQuickSectionProps) {
  const { t } = useLocale();
  const { favorites, recent } = useAppStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Merge favorites + recent, dedup by path, favorites first, max 6
  const seen = new Set<string>();
  const projects: { path: string; name: string; isFavorite: boolean }[] = [];

  for (const fav of favorites) {
    if (!seen.has(fav.path)) {
      seen.add(fav.path);
      projects.push({ path: fav.path, name: fav.name, isFavorite: true });
    }
  }
  for (const rec of recent) {
    if (!seen.has(rec.path) && projects.length < 6) {
      seen.add(rec.path);
      const name = rec.path.split('/').pop() || rec.path;
      projects.push({ path: rec.path, name, isFavorite: false });
    }
  }

  const truncatePath = (path: string) =>
    path.replace(/^\/Users\/[^/]+/, '~').split('/').slice(-2).join('/');

  const toggleSelect = (path: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const selectedDirs = projects.filter(p => selected.has(p.path)).map(p => p.path);
  const count = selectedDirs.length;

  const handleLayoutLaunch = (layout: ArrangeLayout) => {
    if (count === 0 || isLaunching) return;
    const paneCount = layout === 'grid4' ? 4 : 2;
    // Fill panes: cycle through selected dirs to reach paneCount
    const dirs: string[] = [];
    for (let i = 0; i < paneCount; i++) {
      dirs.push(selectedDirs[i % count]);
    }
    onLaunchMulti(dirs, layout);
    setSelected(new Set());
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          {count > 0
            ? t('sessions.selectDirs').replace('{count}', String(count))
            : t('sessions.quickLaunch')
          }
        </span>
        <button
          type="button"
          onClick={onBrowse}
          className="text-2xs text-primary hover:text-primary/80 transition-colors font-medium"
        >
          {t('sessions.browseDir')}
        </button>
      </div>

      {/* Project list */}
      {projects.length === 0 ? (
        <div className="py-4 text-center">
          <FolderOpen className="w-5 h-5 text-muted-foreground/40 mx-auto mb-1.5" />
          <p className="text-2xs text-muted-foreground">{t('sessions.noRecentProjects')}</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {projects.map((project) => {
            const isSelected = selected.has(project.path);
            return (
              <button
                key={project.path}
                type="button"
                onClick={() => toggleSelect(project.path)}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors group text-left
                  ${isSelected
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : 'hover:bg-surface-raised'
                  }
                `}
              >
                {/* Checkbox area */}
                <div className={`
                  w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                  ${isSelected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-muted-foreground/30 group-hover:border-muted-foreground/60'
                  }
                `}>
                  {isSelected && <Check className="w-3 h-3" />}
                </div>

                {project.isFavorite ? (
                  <Star className="w-3 h-3 text-amber-400 shrink-0" />
                ) : (
                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm text-foreground truncate flex-1">
                  {project.name}
                </span>
                <span className="text-2xs text-muted-foreground truncate max-w-[100px]">
                  {truncatePath(project.path)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Action buttons — visible when 1+ selected */}
      {count >= 1 && (
        <>
          <div className="border-t border-[--glass-border-light] mt-3 pt-3" />
          <div className="flex items-center gap-2">
            {isLaunching ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground w-full justify-center py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('sessions.launching')}
              </div>
            ) : (
              <>
                <span className="text-2xs text-muted-foreground shrink-0">
                  {t('sessions.launchCount').replace('{count}', String(count))}:
                </span>
                <div className="flex gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => handleLayoutLaunch('horizontal2')}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg glass-subtle hover:bg-surface-raised transition-colors text-2xs font-medium text-foreground"
                  >
                    <LayoutThumbnailMini layout="horizontal2" />
                    {t('sessions.layoutHorizontal2')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLayoutLaunch('grid4')}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg glass-subtle hover:bg-surface-raised transition-colors text-2xs font-medium text-foreground"
                  >
                    <LayoutThumbnailMini layout="grid4" />
                    {t('sessions.layoutGrid4')}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Tiny inline SVG for layout buttons */
function LayoutThumbnailMini({ layout }: { layout: 'horizontal2' | 'grid4' }) {
  if (layout === 'horizontal2') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <line x1="12" y1="3" x2="12" y2="21" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  );
}
