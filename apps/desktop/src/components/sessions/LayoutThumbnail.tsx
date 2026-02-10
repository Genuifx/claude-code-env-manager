import type { ArrangeLayout } from '@/store';
import { useLocale } from '@/locales';

interface LayoutThumbnailProps {
  layout: ArrangeLayout;
  selected: boolean;
  onClick: () => void;
}

const layoutSvgs: Record<ArrangeLayout, React.ReactNode> = {
  horizontal2: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  ),
  vertical2: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
  grid4: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
  left_main3: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2" />
      <line x1="14" y1="3" x2="14" y2="21" />
      <line x1="14" y1="12" x2="22" y2="12" />
    </svg>
  ),
};

export function LayoutThumbnail({ layout, selected, onClick }: LayoutThumbnailProps) {
  const { t } = useLocale();

  const labelMap: Record<ArrangeLayout, string> = {
    horizontal2: t('sessions.layoutHorizontal2'),
    vertical2: t('sessions.layoutVertical2'),
    grid4: t('sessions.layoutGrid4'),
    left_main3: t('sessions.layoutLeftMain3'),
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex flex-col items-center gap-1.5 rounded-lg p-3 cursor-pointer transition-all
        ${selected
          ? 'glass-card ring-2 ring-primary/50 border-primary/30 text-primary'
          : 'glass-subtle text-muted-foreground hover:text-foreground'
        }
      `}
    >
      <div className="w-6 h-6">{layoutSvgs[layout]}</div>
      <span className="text-2xs font-medium">{labelMap[layout]}</span>
    </button>
  );
}
