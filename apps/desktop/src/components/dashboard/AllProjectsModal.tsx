import { useState } from 'react';
import { FolderOpen, Play, Star, X, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useLocale } from '@/locales';
import { getProjectName, truncatePath, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AllProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunch: (dir: string) => void;
}

type Tab = 'favorites' | 'recent' | 'vscode' | 'jetbrains';

export function AllProjectsModal({ open, onOpenChange, onLaunch }: AllProjectsModalProps) {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>('favorites');
  const { favorites, recent, vscodeProjects, jetbrainsProjects } = useAppStore();
  const {
    addFavoriteProject,
    removeFavoriteProject,
    openDirectoryPicker,
    syncVSCodeProjects,
    syncJetBrainsProjects,
  } = useTauriCommands();
  const [syncing, setSyncing] = useState<'vscode' | 'jetbrains' | null>(null);

  if (!open) return null;

  const isFavorite = (path: string) => favorites.some(f => f.path === path);

  const handleAddFavorite = async () => {
    const path = await openDirectoryPicker();
    if (path) {
      await addFavoriteProject(path, getProjectName(path));
    }
  };

  const handleSync = async (type: 'vscode' | 'jetbrains') => {
    setSyncing(type);
    try {
      if (type === 'vscode') await syncVSCodeProjects();
      else await syncJetBrainsProjects();
    } finally {
      setSyncing(null);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'favorites', label: t('dashboard.tabFavorites') },
    { key: 'recent', label: t('dashboard.tabRecent') },
    { key: 'vscode', label: t('dashboard.tabVSCode') },
    { key: 'jetbrains', label: t('dashboard.tabJetBrains') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      {/* Modal */}
      <div className="relative frosted-panel glass-noise rounded-2xl w-[520px] max-h-[480px] flex flex-col shadow-elevation-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <h2 className="text-base font-semibold text-foreground">{t('dashboard.allProjects')}</h2>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 py-2 border-b border-white/[0.08]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
              )}
            >
              {tab.label}
            </button>
          ))}

          {/* Sync button for vscode/jetbrains tabs */}
          {(activeTab === 'vscode' || activeTab === 'jetbrains') && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs gap-1.5"
              onClick={() => handleSync(activeTab)}
              disabled={syncing !== null}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', syncing === activeTab && 'animate-spin')} />
              {t('dashboard.syncProjects')}
            </Button>
          )}

          {activeTab === 'favorites' && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs gap-1.5"
              onClick={handleAddFavorite}
            >
              <Plus className="w-3.5 h-3.5" />
              {t('dashboard.addFavorite')}
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {activeTab === 'favorites' && favorites.map((project) => (
              <ProjectRow
                key={project.path}
                name={project.name}
                path={project.path}
                onLaunch={() => { onLaunch(project.path); onOpenChange(false); }}
                trailing={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/[0.08]"
                    onClick={() => removeFavoriteProject(project.path)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                }
              />
            ))}

            {activeTab === 'recent' && recent.map((project) => (
              <ProjectRow
                key={project.path}
                name={getProjectName(project.path)}
                path={project.path}
                subtitle={formatRelativeTime(project.lastUsed)}
                onLaunch={() => { onLaunch(project.path); onOpenChange(false); }}
                trailing={!isFavorite(project.path) ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-primary hover:bg-primary/[0.08]"
                    onClick={() => addFavoriteProject(project.path, getProjectName(project.path))}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </Button>
                ) : undefined}
              />
            ))}

            {activeTab === 'vscode' && vscodeProjects.map((project) => (
              <ProjectRow
                key={project.path}
                name={getProjectName(project.path)}
                path={project.path}
                onLaunch={() => { onLaunch(project.path); onOpenChange(false); }}
                trailing={!isFavorite(project.path) ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-primary hover:bg-primary/[0.08]"
                    onClick={() => addFavoriteProject(project.path, getProjectName(project.path))}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </Button>
                ) : undefined}
              />
            ))}

            {activeTab === 'jetbrains' && jetbrainsProjects.map((project) => (
              <ProjectRow
                key={project.path}
                name={getProjectName(project.path)}
                path={project.path}
                subtitle={project.ide}
                onLaunch={() => { onLaunch(project.path); onOpenChange(false); }}
                trailing={!isFavorite(project.path) ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-muted-foreground hover:text-primary hover:bg-primary/[0.08]"
                    onClick={() => addFavoriteProject(project.path, getProjectName(project.path))}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </Button>
                ) : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({
  name,
  path,
  subtitle,
  onLaunch,
  trailing,
}: {
  name: string;
  path: string;
  subtitle?: string;
  onLaunch: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <FolderOpen className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{name}</div>
          <div className="text-2xs text-muted-foreground truncate">
            {truncatePath(path)}
            {subtitle && <> · <span className="text-primary">{subtitle}</span></>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-primary hover:text-primary hover:bg-primary/[0.08]"
          onClick={onLaunch}
        >
          <Play className="w-3.5 h-3.5" />
        </Button>
        {trailing}
      </div>
    </div>
  );
}
