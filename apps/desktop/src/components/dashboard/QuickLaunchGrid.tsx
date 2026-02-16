import { useState } from 'react';
import { FolderOpen, Play, Plus, Star, ArrowRight, Code2, Sparkles, Clock } from 'lucide-react';
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

  // Recent projects not already in favorites, max 4
  const favPaths = new Set(favorites.map(f => f.path));
  const recentFiltered = recent.filter(r => !favPaths.has(r.path)).slice(0, 4);

  // Show max 6 favorites
  const visibleFavorites = favorites.slice(0, 6);

  return (
    <>
      <div className="h-full flex flex-col glass-card glass-noise rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Star className="w-4 h-4 text-primary/70" />
            <h3 className="text-sm font-semibold text-foreground tracking-wide">
              {t('dashboard.favorites')}
            </h3>
            {visibleFavorites.length > 0 && (
              <span className="text-2xs font-medium bg-white/[0.06] text-muted-foreground px-2 py-0.5 rounded-full tabular-nums">
                {favorites.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground px-2.5"
              onClick={handleAddFavorite}
            >
              <Plus className="w-3.5 h-3.5" />
              {t('dashboard.addFavorite')}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {visibleFavorites.length === 0 ? (
            <button
              onClick={handleAddFavorite}
              className="w-full h-full min-h-[200px] rounded-xl glass-ghost-card flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/[0.08] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary/60" />
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">{t('dashboard.addFirstFavorite')}</div>
                <div className="text-2xs text-muted-foreground/60 mt-1">
                  Quick access to your favorite projects
                </div>
              </div>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {visibleFavorites.map((project, i) => {
                const color = PROJECT_COLORS[i % PROJECT_COLORS.length];
                return (
                  <button
                    key={project.path}
                    onClick={() => handleLaunch(project.path)}
                    className="group relative glass-subtle rounded-xl p-4 text-left transition-all duration-200 hover:bg-white/[0.06] hover:scale-[1.01] active:scale-[0.99] overflow-hidden"
                    style={{ '--project-color': color } as React.CSSProperties}
                    title={project.path}
                  >
                    {/* Left accent bar */}
                    <div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full opacity-50 group-hover:opacity-80 transition-opacity"
                      style={{ background: `hsl(${color})` }}
                    />

                    {/* Ambient glow on hover */}
                    <div
                      className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-[0.08] transition-opacity blur-xl pointer-events-none"
                      style={{ background: `hsl(${color})` }}
                    />

                    <div className="relative flex items-start gap-3">
                      {/* Icon */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                        style={{ background: `hsl(${color} / 0.12)` }}
                      >
                        <Code2
                          className="w-4 h-4"
                          style={{ color: `hsl(${color})` }}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate mb-0.5">
                          {project.name}
                        </div>
                        <div className="text-2xs text-muted-foreground/50 truncate font-mono">
                          {project.path.split('/').slice(-2).join('/')}
                        </div>
                      </div>
                    </div>

                    {/* Hover play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/10 backdrop-blur-[2px] rounded-xl">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                        style={{
                          background: `hsl(${color} / 0.9)`,
                          boxShadow: `0 0 20px hsl(${color} / 0.4)`
                        }}
                      >
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with recent projects */}
        {recentFiltered.length > 0 && (
          <div className="border-t border-white/[0.06] px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="text-2xs text-muted-foreground/50 uppercase tracking-widest flex-shrink-0 font-medium">
                {t('dashboard.recentHistory')}
              </span>
              <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {recentFiltered.map((project) => (
                  <button
                    key={project.path}
                    onClick={() => handleLaunch(project.path)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap',
                      'text-muted-foreground/60 hover:text-foreground',
                      'hover:bg-white/[0.04] transition-all flex-shrink-0'
                    )}
                  >
                    <Clock className="w-3 h-3 opacity-50" />
                    <span className="truncate max-w-[80px]">{getProjectName(project.path)}</span>
                    <span className="text-2xs opacity-40">{formatRelativeTime(project.lastUsed)}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1 text-2xs text-primary/60 hover:text-primary transition-colors flex-shrink-0 font-medium"
              >
                {t('dashboard.viewAll')}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* View all when no recent */}
        {recentFiltered.length === 0 && visibleFavorites.length > 0 && (
          <div className="border-t border-white/[0.06] px-5 py-3 flex justify-end">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 text-2xs text-primary/60 hover:text-primary transition-colors font-medium"
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
