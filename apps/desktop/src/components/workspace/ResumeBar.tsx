import { Check, Play } from 'lucide-react';
import type { HistorySessionItem } from '@/components/history/HistoryList';
import { useLocale } from '@/locales';
import { cn } from '@/lib/utils';

interface ResumeBarProps {
  selectedSession: HistorySessionItem | null;
  onResume: () => void;
  resumed: boolean;
}

export function ResumeBar({ selectedSession, onResume, resumed }: ResumeBarProps) {
  const { t } = useLocale();

  return (
    <div className="shrink-0 border-t border-border bg-surface backdrop-blur-xl px-4 py-3">
      {selectedSession ? (
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">
              <span className="font-medium">{selectedSession.projectName}</span>
              <span className="mx-2 text-muted-foreground">/</span>
              <span className="text-muted-foreground">{selectedSession.display}</span>
            </p>
          </div>
          <button
            className={cn(
              'shrink-0 inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-sm font-medium text-white transition-all',
              'liquid-launch-btn',
              resumed && 'launched'
            )}
            onClick={onResume}
            disabled={resumed}
          >
            {resumed ? (
              <>
                <Check className="w-3.5 h-3.5" />
                {t('workspace.resumed')}
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                {t('workspace.resumeSession')}
              </>
            )}
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-1">
          {t('workspace.selectToResume')}
        </p>
      )}
    </div>
  );
}
