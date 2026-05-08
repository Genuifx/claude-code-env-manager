import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import type { PetNotificationItem } from '@/types/pet';

interface PetBubbleProps {
  item: PetNotificationItem;
  onOpen: (item: PetNotificationItem) => void;
}

function toneClass(tone: PetNotificationItem['tone']): string {
  switch (tone) {
    case 'attention':
      return 'border-amber-300/80 bg-amber-50/95 text-amber-950';
    case 'failed':
      return 'border-red-300/80 bg-red-50/95 text-red-950';
    case 'interrupted':
      return 'border-zinc-300/80 bg-zinc-50/95 text-zinc-900';
    case 'done':
      return 'border-emerald-300/80 bg-emerald-50/95 text-emerald-950';
    case 'running':
    default:
      return 'border-stone-300/80 bg-white/95 text-stone-950';
  }
}

function StatusIcon({ tone }: { tone: PetNotificationItem['tone'] }) {
  if (tone === 'running') {
    return <Loader2 className="h-4 w-4 animate-spin text-amber-600" aria-hidden="true" />;
  }
  if (tone === 'failed' || tone === 'attention') {
    return <CircleAlert className="h-4 w-4 text-amber-700" aria-hidden="true" />;
  }
  return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
}

export function PetBubble({ item, onOpen }: PetBubbleProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={[
        'pointer-events-auto w-[330px] rounded-[18px] border px-4 py-3 text-left shadow-[0_10px_30px_rgba(39,31,18,0.18)]',
        'transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(39,31,18,0.24)]',
        toneClass(item.tone),
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-2">
        <StatusIcon tone={item.tone} />
        <span className="truncate text-sm font-semibold">{item.title}</span>
        <span className="ml-auto shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium">
          {item.statusLabel}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm leading-5 opacity-80">{item.message}</p>
    </button>
  );
}
