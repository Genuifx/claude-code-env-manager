import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import type { ArrangeLayout } from '@/store';
import { LauncherQuickSection } from './LauncherQuickSection';
import { LauncherMultiSection } from './LauncherMultiSection';
import { MultiLaunchPanel } from './MultiLaunchPanel';

interface SessionLauncherPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunchSingle: (dir: string) => void;
  onLaunchMulti: (dirs: string[], layout: ArrangeLayout) => void;
  onBrowseAndLaunch: () => void;
  isLaunching: boolean;
  trigger: React.ReactNode;
}

export function SessionLauncherPopover({
  open,
  onOpenChange,
  onLaunchSingle,
  onLaunchMulti,
  onBrowseAndLaunch,
  isLaunching,
  trigger,
}: SessionLauncherPopoverProps) {
  const [view, setView] = useState<'menu' | 'multi'>('menu');
  const [multiLayout, setMultiLayout] = useState<ArrangeLayout>('horizontal2');

  const handleSelectLayout = (layout: ArrangeLayout) => {
    setMultiLayout(layout);
    setView('multi');
  };

  const handleLaunchSingle = (dir: string) => {
    onLaunchSingle(dir);
    onOpenChange(false);
    setView('menu');
  };

  const handleLaunchMulti = (dirs: string[], layout: ArrangeLayout) => {
    onLaunchMulti(dirs, layout);
    onOpenChange(false);
    setView('menu');
  };

  const handleBrowse = () => {
    onBrowseAndLaunch();
    onOpenChange(false);
    setView('menu');
  };

  // Reset view when popover closes
  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      // Small delay so the close animation finishes before resetting
      setTimeout(() => setView('menu'), 200);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          className="frosted-panel glass-noise rounded-xl p-4 w-[340px] z-50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {view === 'menu' ? (
            <div className="space-y-3">
              <LauncherQuickSection
                onLaunchSingle={handleLaunchSingle}
                onBrowse={handleBrowse}
              />
              <div className="border-t border-[--glass-border-light]" />
              <LauncherMultiSection onSelectLayout={handleSelectLayout} />
            </div>
          ) : (
            <MultiLaunchPanel
              layout={multiLayout}
              onBack={() => setView('menu')}
              onLaunchMulti={handleLaunchMulti}
              isLaunching={isLaunching}
            />
          )}

          <Popover.Arrow className="fill-[hsl(var(--surface-overlay))]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
