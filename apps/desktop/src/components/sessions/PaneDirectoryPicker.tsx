import { FolderOpen, X } from 'lucide-react';
import { useLocale } from '@/locales';

interface PaneDirectoryPickerProps {
  index: number;
  selectedDir: string | null;
  onBrowse: () => void;
  onClear: () => void;
}

export function PaneDirectoryPicker({ index, selectedDir, onBrowse, onClear }: PaneDirectoryPickerProps) {
  const { t } = useLocale();

  const dirDisplay = selectedDir
    ? selectedDir.replace(/^\/Users\/[^/]+/, '~').split('/').slice(-2).join('/')
    : null;

  return (
    <div className="space-y-1">
      <span className="text-2xs font-medium text-muted-foreground">
        {t('sessions.paneN').replace('{n}', String(index + 1))}
      </span>
      <button
        type="button"
        onClick={selectedDir ? undefined : onBrowse}
        className={`
          w-full h-9 rounded-lg px-3 flex items-center gap-2 transition-all text-left
          glass-subtle border border-[--glass-border-light]
          ${selectedDir
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground cursor-pointer'
          }
        `}
      >
        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
        <span className="text-sm truncate flex-1" title={selectedDir || undefined}>
          {dirDisplay || t('sessions.selectDirPlaceholder')}
        </span>
        {selectedDir ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </button>
    </div>
  );
}
