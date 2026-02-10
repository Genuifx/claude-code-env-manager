import { FolderOpen, Star, Clock, Play } from 'lucide-react';
import { useLocale } from '@/locales';
import { useAppStore } from '@/store';

interface LauncherQuickSectionProps {
  onLaunchSingle: (dir: string) => void;
  onBrowse: () => void;
}

export function LauncherQuickSection({ onLaunchSingle, onBrowse }: LauncherQuickSectionProps) {
  const { t } = useLocale();
  const { favorites, recent } = useAppStore();

  // Merge favorites + recent, dedup by path, favorites first, max 5
  const seen = new Set<string>();
  const projects: { path: string; name: string; isFavorite: boolean }[] = [];

  for (const fav of favorites) {
    if (!seen.has(fav.path)) {
      seen.add(fav.path);
      projects.push({ path: fav.path, name: fav.name, isFavorite: true });
    }
  }
  for (const rec of recent) {
    if (!seen.has(rec.path) && projects.length < 5) {
      seen.add(rec.path);
      const name = rec.path.split('/').pop() || rec.path;
      projects.push({ path: rec.path, name, isFavorite: false });
    }
  }

  const truncatePath = (path: string) =>
    path.replace(/^\/Users\/[^/]+/, '~').split('/').slice(-2).join('/');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          {t('sessions.quickLaunch')}
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
          {projects.map((project) => (
            <button
              key={project.path}
              type="button"
              onClick={() => onLaunchSingle(project.path)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-raised transition-colors group text-left"
            >
              {project.isFavorite ? (
                <Star className="w-3 h-3 text-amber-400 shrink-0" />
              ) : (
                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm text-foreground truncate flex-1">
                {project.name}
              </span>
              <span className="text-2xs text-muted-foreground truncate max-w-[120px]">
                {truncatePath(project.path)}
              </span>
              <Play className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
