import { useState } from 'react';
import { FolderOpen, Play, Plus, Star, ArrowRight, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useLocale } from '@/locales';
import { getProjectName, formatRelativeTime } from '@/lib/utils';
import { AllProjectsModal } from './AllProjectsModal';
import { cn } from '@/lib/utils';

interface QuickLaunchGridProps {
  onLaunch: (dir: string) => void;
}

const PROJECT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-6)',
  'var(--primary)',
];

export function QuickLaunchGrid({ onLaunch }: QuickLaunchGridProps) {
  const { t } = useLocale();
  const { favorites, recent } = useAppStore();
  const { openDirectoryPicker, addFavoriteProject } = useTauriCommands();
  const [modalOpen, setModalOpen] = useState(false);
  const { setSelectedWorkingDir } = useAppStore();

  const handleLaunch = (path: string) => {
    setSelectedWorkingDir(path);
    onLaunch(path);
  };

  const handleAddFavorite = async () => {
    const path = await openDirectoryPicker();
    if (path) {
      const name = getProjectName(path);
      await addFavoriteProject(path, name);
    }
  };

  // Recent projects not already in favorites, max 3
  const favPaths = new Set(favorites.map(f => f.path));
  const recentFiltered = recent.filter(r => !favPaths.has(r.path)).slice(0, 3);

  // Show max 6 favorites
  const visibleFavorites = favorites.slice(0, 6);

  return (
    <>
      <div className="glass-card glass-noise p-4 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest flex items-center gap-2">
            <Star className="w-3 h-3 text-primary/60" />
            {t('dashboard.favorites')}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-2xs gap-1 text-muted-foreground hover:text-foreground px-2"
              onClick={handleAddFavorite}
            >
              <Plus className="w-3 h-3" />
              {t('dashboard.addFavorite')}
            </Button>
          </div>
        </div>

        {/* Favorites grid */}
        {visibleFavorites.length === 0 ? (
          <button
            onClick={handleAddFavorite}
            className="w-full py-8 rounded-xl glass-ghost-card flex flex-col items-center gap-2.5 text-muted-foreground hover:text-foreground transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary/60" />
            </div>
            <span className="text-sm">{t('dashboard.addFirstFavorite')}</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {visibleFavorites.map((project, i) => {
              const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
              return (
                <button
                  key={project.path}
                  onClick={() => handleLaunch(project.path)}
                  className="group glass-subtle rounded-xl p-3 text-left transition-all duration-200 hover:bg-white/[0.08] hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
                  title={project.path}
                >
                  {/* Subtle top accent line */}
                  <div
                    className="absolute top-0 left-3 right-3 h-[1.5px] rounded-full opacity-40 group-hover:opacity-70 transition-opacity"
                    style={{ background: `hsl(${color})` }}
                  />

                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ background: `hsl(${color} / 0.12)` }}
                    >
                      <Code2
                        className="w-3.5 h-3.5"
                        style={{ color: `hsl(${color})` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">
                      {project.name}
                    </span>
                  </div>

                  {/* Hover play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/15 backdrop-blur-[2px] rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-primary/90 flex items-center justify-center shadow-[0_0_16px_hsl(var(--primary)/0.4)]">
                      <Play className="w-3.5 h-3.5 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Recent inline row */}
        {recentFiltered.length > 0 && (
          <div className="flex items-center gap-3 mt-3.5 pt-3 border-t border-white/[0.05]">
            <span className="text-2xs text-muted-foreground/50 uppercase tracking-widest flex-shrink-0 font-medium">
              {t('dashboard.recentHistory')}
            </span>
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              {recentFiltered.map((project) => (
                <button
                  key={project.path}
                  onClick={() => handleLaunch(project.path)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs',
                    'text-muted-foreground/70 hover:text-foreground',
                    'hover:bg-white/[0.05] transition-all flex-shrink-0'
                  )}
                >
                  <FolderOpen className="w-3 h-3 opacity-50" />
                  <span className="truncate max-w-[90px]">{getProjectName(project.path)}</span>
                  <span className="text-2xs opacity-40">{formatRelativeTime(project.lastUsed)}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 text-2xs text-primary/70 hover:text-primary transition-colors flex-shrink-0 font-medium"
            >
              {t('dashboard.viewAll')}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* View all link when no recent but has favorites */}
        {recentFiltered.length === 0 && visibleFavorites.length > 0 && (
          <div className="flex justify-end mt-3 pt-3 border-t border-white/[0.05]">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 text-2xs text-primary/70 hover:text-primary transition-colors font-medium"
            >
              {t('dashboard.viewAll')}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <AllProjectsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onLaunch={handleLaunch}
      />
    </>
  );
}
