import { useState } from 'react';
import { LayoutGrid, X, ChevronDown, Loader2, Check, Minimize2 } from 'lucide-react';
// Note: useState imported for future use, dismissed state removed per design
import { Button } from '@/components/ui/button';
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
  onMinimizeAll: () => void;
  onCloseAll: () => void;
}

export function ArrangeBanner({
  runningCount,
  onArrange,
  isArranging,
  arrangeStatus,
  selectedLayout,
  onSelectLayout,
  onMinimizeAll,
  onCloseAll,
}: ArrangeBannerProps) {
  const { t } = useLocale();
  const [popoverOpen, setPopoverOpen] = useState(false);

  if (runningCount < 2) return null;

  return (
    <div
      className="glass-subtle glass-noise rounded-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-2 fade-in duration-250"
    >
      {/* Split Button: main action + popover chevron - Left side */}
      <div className="flex items-center shrink-0 glass-split-btn">
        <Button
          size="sm"
          variant="ghost"
          disabled={isArranging}
          onClick={() => onArrange()}
          className={`
            rounded-none border-0
            ${arrangeStatus === 'success'
              ? 'bg-success/15 text-success hover:bg-success/25'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
            }
          `}
        >
          {arrangeStatus === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {arrangeStatus === 'success' && <Check className="w-3.5 h-3.5" />}
          {arrangeStatus === 'normal' && <LayoutGrid className="w-3.5 h-3.5" />}
          <span className="ml-1.5">
            {arrangeStatus === 'loading'
              ? t('sessions.arranging')
              : arrangeStatus === 'success'
                ? t('sessions.arranged')
                : t('sessions.arrangeWindows')
            }
          </span>
        </Button>

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
            <Button
              size="sm"
              variant="ghost"
              disabled={isArranging}
              className={`
                rounded-none border-0 px-1.5 glass-divider-left
                ${arrangeStatus === 'success'
                  ? 'bg-success/15 text-success hover:bg-success/25'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
                }
              `}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          }
        />
      </div>

      <div className="flex-1" />

      {/* Separator + Bulk actions - Right side */}
      <div className="h-5 shrink-0 glass-divider-left" />

      <Button size="sm" variant="ghost" onClick={onMinimizeAll} className="glass-ghost-hover">
        <Minimize2 className="w-3.5 h-3.5 mr-1" />
        {t('sessions.minimizeAll')}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCloseAll} className="glass-ghost-hover">
        <X className="w-3.5 h-3.5 mr-1" />
        {t('sessions.closeAll')}
      </Button>
    </div>
  );
}
