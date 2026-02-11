import * as Popover from '@radix-ui/react-popover';
import type { ArrangeLayout } from '@/store';
import { LauncherQuickSection } from './LauncherQuickSection';

interface SessionLauncherPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunchMulti: (dirs: string[], layout: ArrangeLayout) => void;
  onBrowseAndLaunch: () => void;
  isLaunching: boolean;
  trigger: React.ReactNode;
}

export function SessionLauncherPopover({
  open,
  onOpenChange,
  onLaunchMulti,
  onBrowseAndLaunch,
  isLaunching,
  trigger,
}: SessionLauncherPopoverProps) {
  const handleLaunchMulti = (dirs: string[], layout: ArrangeLayout) => {
    onLaunchMulti(dirs, layout);
    onOpenChange(false);
  };

  const handleBrowse = () => {
    onBrowseAndLaunch();
    onOpenChange(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          className="frosted-panel glass-noise rounded-xl p-4 w-[320px] z-50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <LauncherQuickSection
            onLaunchMulti={handleLaunchMulti}
            onBrowse={handleBrowse}
            isLaunching={isLaunching}
          />
          <Popover.Arrow className="fill-[hsl(var(--glass-bg)/0.66)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
