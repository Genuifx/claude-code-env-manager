import * as Popover from '@radix-ui/react-popover';
import type { ArrangeLayout } from '@/store';
import { useLocale } from '@/locales';
import { Button } from '@/components/ui/button';
import { LayoutThumbnail } from './LayoutThumbnail';

const layouts: ArrangeLayout[] = ['horizontal2', 'vertical2', 'grid4', 'left_main3'];

interface LayoutPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runningCount: number;
  selectedLayout: ArrangeLayout;
  onSelectLayout: (layout: ArrangeLayout) => void;
  onArrange: (layout: ArrangeLayout) => Promise<void>;
  trigger: React.ReactNode;
}

export function LayoutPopover({
  open,
  onOpenChange,
  runningCount,
  selectedLayout,
  onSelectLayout,
  onArrange,
  trigger,
}: LayoutPopoverProps) {
  const { t } = useLocale();

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          className="frosted-panel glass-noise rounded-xl p-4 w-[280px] z-50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <p className="text-xs font-medium text-muted-foreground mb-3">
            {t('sessions.selectLayout')}
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {layouts.map((layout) => (
              <LayoutThumbnail
                key={layout}
                layout={layout}
                selected={selectedLayout === layout}
                onClick={() => onSelectLayout(layout)}
              />
            ))}
          </div>

          <Button
            className="w-full"
            onClick={async () => {
              await onArrange(selectedLayout);
              onOpenChange(false);
            }}
            style={{ boxShadow: '0 2px 8px hsl(var(--primary) / 0.25), 0 4px 16px hsl(var(--primary) / 0.15)' }}
          >
            {t('sessions.arrangeRunningCount').replace('{count}', String(runningCount))}
          </Button>

          <Popover.Arrow className="fill-[hsl(var(--glass-bg)/0.66)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
