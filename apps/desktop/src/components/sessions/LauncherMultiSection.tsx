import { useLocale } from '@/locales';
import { LayoutThumbnail } from './LayoutThumbnail';
import type { ArrangeLayout } from '@/store';

interface LauncherMultiSectionProps {
  onSelectLayout: (layout: ArrangeLayout) => void;
}

const multiLayouts: { layout: ArrangeLayout; labelKey: string }[] = [
  { layout: 'horizontal2', labelKey: 'sessions.splitScreen2' },
  { layout: 'grid4', labelKey: 'sessions.splitScreen4' },
];

export function LauncherMultiSection({ onSelectLayout }: LauncherMultiSectionProps) {
  const { t } = useLocale();

  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground mb-2 block">
        {t('sessions.multiLaunch')}
      </span>
      <div className="grid grid-cols-2 gap-2">
        {multiLayouts.map(({ layout }) => (
          <LayoutThumbnail
            key={layout}
            layout={layout}
            selected={false}
            onClick={() => onSelectLayout(layout)}
          />
        ))}
      </div>
    </div>
  );
}
