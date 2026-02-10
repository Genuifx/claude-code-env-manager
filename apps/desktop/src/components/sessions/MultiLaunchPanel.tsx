import { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useLocale } from '@/locales';
import { useAppStore, type ArrangeLayout } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { PaneDirectoryPicker } from './PaneDirectoryPicker';

interface MultiLaunchPanelProps {
  layout: ArrangeLayout;
  onBack: () => void;
  onLaunchMulti: (dirs: string[], layout: ArrangeLayout) => void;
  isLaunching: boolean;
}

export function MultiLaunchPanel({ layout, onBack, onLaunchMulti, isLaunching }: MultiLaunchPanelProps) {
  const { t } = useLocale();
  const { openDirectoryPicker } = useTauriCommands();
  const { favorites, recent, sessions } = useAppStore();

  const paneCount = layout === 'grid4' ? 4 : 2;
  const [dirs, setDirs] = useState<(string | null)[]>(Array(paneCount).fill(null));

  const runningCount = sessions.filter(s => s.status === 'running').length;

  const handleBrowse = async (index: number) => {
    const path = await openDirectoryPicker();
    if (path) {
      setDirs(prev => {
        const next = [...prev];
        next[index] = path;
        return next;
      });
    }
  };

  const handleClear = (index: number) => {
    setDirs(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const handleQuickPick = (path: string) => {
    // Fill the first empty pane
    const emptyIndex = dirs.findIndex(d => d === null);
    if (emptyIndex !== -1) {
      setDirs(prev => {
        const next = [...prev];
        next[emptyIndex] = path;
        return next;
      });
    }
  };

  const validDirs = dirs.filter(Boolean) as string[];
  const layoutLabel = layout === 'grid4' ? t('sessions.splitScreen4') : t('sessions.splitScreen2');

  // Merge favorites + recent for quick pick pills, dedup, max 6
  const seen = new Set<string>();
  const quickPicks: { path: string; name: string }[] = [];
  for (const fav of favorites) {
    if (!seen.has(fav.path)) { seen.add(fav.path); quickPicks.push({ path: fav.path, name: fav.name }); }
  }
  for (const rec of recent) {
    if (!seen.has(rec.path) && quickPicks.length < 6) {
      seen.add(rec.path);
      quickPicks.push({ path: rec.path, name: rec.path.split('/').pop() || rec.path });
    }
  }
  // Filter out already-selected dirs
  const availablePicks = quickPicks.filter(p => !dirs.includes(p.path));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-foreground">
          {layoutLabel} · {t('sessions.selectDirs')}
        </span>
      </div>

      {/* Running sessions hint */}
      {runningCount > 0 && (
        <p className="text-2xs text-muted-foreground mb-3">
          {t('sessions.existingSessionsHint').replace('{count}', String(runningCount))}
        </p>
      )}

      {/* Pane pickers */}
      <div className="space-y-2 mb-3">
        {dirs.map((dir, i) => (
          <PaneDirectoryPicker
            key={i}
            index={i}
            selectedDir={dir}
            onBrowse={() => handleBrowse(i)}
            onClear={() => handleClear(i)}
          />
        ))}
      </div>

      {/* Quick pick pills */}
      {availablePicks.length > 0 && (
        <div className="mb-4">
          <span className="text-2xs text-muted-foreground block mb-1.5">
            {t('sessions.recentQuickPick')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {availablePicks.map((p) => (
              <button
                key={p.path}
                type="button"
                onClick={() => handleQuickPick(p.path)}
                className="px-2 py-0.5 rounded-full glass-subtle text-2xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Launch button */}
      <button
        type="button"
        disabled={validDirs.length === 0 || isLaunching}
        onClick={() => onLaunchMulti(validDirs, layout)}
     className={`
          w-full h-9 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
          ${validDirs.length === 0 || isLaunching
            ? 'bg-primary/30 text-primary-foreground/50 cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }
        `}
      >
        {isLaunching ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t('sessions.launching')}
          </>
        ) : validDirs.length === paneCount ? (
          t('sessions.launchAndArrange').replace('{count}', String(validDirs.length))
        ) : validDirs.length > 0 ? (
          t('sessions.launchCount').replace('{count}', String(validDirs.length))
        ) : (
          t('sessions.selectDirs')
        )}
      </button>
    </div>
  );
}
