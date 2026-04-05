import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PetPanel } from './PetPanel';

export function PetEntry() {
  const companion = useAppStore((s) => s.companion);
  if (!companion) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'sidebar-nav-item group relative w-full flex items-center gap-2.5 px-2.5 h-[30px] rounded-lg',
            'transition-colors duration-[var(--duration-fast)]',
            'text-sidebar-foreground hover:text-foreground hover:bg-white/[0.06]',
            'data-[state=open]:sidebar-nav-active data-[state=open]:text-primary'
          )}
        >
          <span className="font-mono text-[13px] leading-none shrink-0">(✦&gt;</span>
          <span className="text-[13px] leading-none truncate">{companion.name}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-[180px] p-3 glass-card glass-noise border-0 shadow-xl"
      >
        <PetPanel companion={companion} />
      </PopoverContent>
    </Popover>
  );
}
