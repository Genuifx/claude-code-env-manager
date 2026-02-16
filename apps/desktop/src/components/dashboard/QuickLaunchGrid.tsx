import { useState } from 'react';
import { FolderOpen, Play, Plus, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useLocale } from '@/locales';
import { getProjectName, formatRelativeTime } from '@/lib/utils';
import { AllProjectsModal } from './AllProjectsModal';

interface QuickLaunchGridProps {
  onLaunch: (dir: string) => void;
}

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
      <div className="glass-card glass-noise p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-primary" />
            {t('dashboard.favorites')}
          </h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleAddFavorite}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            {t('dashboard.addFavorite')}
          </Button>
        </div>

        {/* Favorites grid */}
        {visibleFavorites.length === 0 ? (
          <button
            onClick={handleAddFavorite}
            className="w-full py-6 rounded-lg border border-dashed border-white/[0.12] flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground hover:border-white/[0.2] transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm">{t('dashboard.addFirstFavorite')}</span>
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {visibleFavorites.map((project) => (
              <button
                key={project.path}
                onClick={() => handleLaunch(project.path)}
                className="group glass-subtle rounded-lg p-3 text-left hover:bg-white/[0.06] transition-colors relative"
                title={project.path}
              >
                <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-primary/60 flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {project.name}
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                  <Play className="w-5 h-5 text-primary" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Recent inline row */}
        {recentFiltered.length > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]">
            <span className="text-2xs text-muted-foreground uppercase tracking-wider flex-shrink-0">
              {t('dashboard.recentHistory')}
            </span>
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              {recentFiltered.map((project) => (
                <button
                  key={project.path}
                  onClick={() => handleLaunch(project.path)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors flex-shrink-0"
                >
                  <span className="truncate max-w-[100px]">{getProjectName(project.path)}</span>
                  <span className="text-2xs opacity-60">{formatRelativeTime(project.lastUsed)}</span>
                  <Play className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors flex-shrink-0"
            >
              {t('dashboard.viewAll')}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* View all link when no recent but has favorites */}
        {recentFiltered.length === 0 && visibleFavorites.length > 0 && (
          <div className="flex justify-end mt-3 pt-3 border-t border-white/[0.06]">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 texs text-primary hover:text-primary/80 transition-colors"
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
