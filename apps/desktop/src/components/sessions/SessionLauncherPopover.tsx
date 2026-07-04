import { useRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import type { ArrangeLayout } from '@/store';
import { LauncherQuickSection } from './LauncherQuickSection';
import { ccemMotion, clearMotionProps, gsap, shouldReduceMotion, useGSAP } from '@/lib/gsapMotion';

interface SessionLauncherPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunchMulti: (dirs: string[], layout: ArrangeLayout) => void;
  onBrowseAndLaunch: () => Promise<void>;
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
  const popoverMotionRef = useRef<HTMLDivElement>(null);

  const handleLaunchMulti = (dirs: string[], layout: ArrangeLayout) => {
    onLaunchMulti(dirs, layout);
    onOpenChange(false);
  };

  const handleBrowse = () => {
    void onBrowseAndLaunch();
    onOpenChange(false);
  };

  useGSAP(() => {
    const popover = popoverMotionRef.current;
    if (!open || !popover) {
      return;
    }

    const rows = gsap.utils.toArray<HTMLElement>(
      '[data-launcher-popover-row], [data-launcher-popover-action]',
      popover
    );
    if (shouldReduceMotion()) {
      clearMotionProps([popover, ...rows]);
      return;
    }

    const timeline = gsap.timeline({ defaults: { ease: ccemMotion.ease.standard, overwrite: 'auto' } });
    timeline.fromTo(
      popover,
      { autoAlpha: 0, y: 6, scale: 0.985 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: ccemMotion.duration.base,
        onComplete: () => clearMotionProps(popover),
      }
    );
    if (rows.length > 0) {
      timeline.fromTo(
        rows,
        { autoAlpha: 0, y: 5 },
        {
          autoAlpha: 1,
          y: 0,
          duration: ccemMotion.duration.quick,
          stagger: 0.02,
          onComplete: () => clearMotionProps(rows),
        },
        '-=0.16'
      );
    }
  }, { scope: popoverMotionRef, dependencies: [open] });

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={popoverMotionRef}
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
