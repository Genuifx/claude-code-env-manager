import { useState } from 'react';
import { LayoutGrid, X, ChevronDown, Loader2, Check } from 'lucide-react';
import { useLocale } from '@/locales';
import { LayoutPopover } from './LayoutPopover';
import type { ArrangeLayout } from '@/store';

interface ArrangeBannerProps {
  runningCount: number;
  onArrange: (layout?: ArrangeLayout) => Promise<void>;
  isArranging: boolean;
  arrangeStatus: 'normal' | 'loading' | 'success';
  selectedLayout: ArrangeLayout;
  onSelectLayout: (layout: ArrangeLayout) => void;
}

export function ArrangeBanner({
  runningCount,
  onArrange,
  isArranging,
  arrangeStatus,
  selectedLayout,
  onSelectLayout,
}: ArrangeBannerProps) {
  const { t } = useLocale();
  const [dismissed, setDismissed] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  if (runningCount < 2 || dismissed) return null;

  return (
    <div
      className="glass-subtle glass-noise rounded-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-2 fade-in duration-250"
    >
      <LayoutGrid className="w-4 h-4 text-primary shrink-0" />

      <div className="flex-1 min-w-0">
        <span className="text-sm text-foreground">
          {t('sessions.arrangeBannerText').replace('{count}', String(runningCount))}
        </span>
        <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
          {t('sessions.arrangeBannerHint')}
        </span>
      </div>

      {/* Split Button: main action + popover chevron */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          disabled={isArranging}
          onClick={() => onArrange()}
          className={`
            h-8 px-3 rounded-l-md text-sm font-medium flex items-center gap-1.5 transition-all
            ${arrangeStatus === 'success'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
            }
            ${isArranging ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {arrangeStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {arrangeStatus === 'success' && <Check className="w-3.5 h-3.5" />}
          {arrangeStatus === 'normal' && <LayoutGrid className="w-3.5 h-3.5" />}
          <span>
            {arrangeStatus === 'loading'
              ? t('sessions.arranging')
              : arrangeStatus === 'success'
                ? t('sessions.arranged')
                : t('sessions.arrangeWindows')
            }
          </span>
        </button>

        <LayoutPopover
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          runningCount={runningCount}
          selectedLayout={selectedLayout}
          onSelectLayout={onSelectLayout}
          onArrange={async (layout) => {
            await onArrange(layout);
          }}
          trigger={
            <button
              type="button"
              disabled={isArranging}
              className={`
                h-8 px-1.5 rounded-r-md border-l-0 text-sm flex items-center transition-all
                ${arrangeStatus === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                }
                ${isArranging ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          }
        />
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
