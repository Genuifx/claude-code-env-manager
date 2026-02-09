import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/locales';

interface CurrentEnvCardProps {
  onSwitchEnv?: () => void;
}

export function CurrentEnvCard({ onSwitchEnv }: CurrentEnvCardProps) {
  const { currentEnv, environments } = useAppStore();
  const { t } = useLocale();
  const env = environments.find(e => e.name === currentEnv);

  return (
    <div className="relative bg-card rounded-2xl border border-border p-6 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          <div className="absolute inset-0 w-3 h-3 rounded-full bg-primary animate-ping opacity-75" />
        </div>
        <h3 className="font-semibold text-foreground">{t('dashboard.currentEnv')}</h3>
      </div>

      {/* Environment name */}
      <div className="text-2xl font-bold text-foreground mb-4 tracking-tight">
        {currentEnv}
      </div>

      {/* Environment details */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">API</span>
          <span className="text-foreground/80 font-medium truncate max-w-[200px]">
            {env?.baseUrl || 'api.anthropic.com'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Model</span>
          <span className="text-foreground/80 font-medium">
            {env?.model || 'claude-sonnet-4-5'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">API Key</span>
          <span className="text-primary font-medium">
            {env?.apiKey ? '••••••••' : 'Configured'}
          </span>
        </div>
      </div>

      {/* Action */}
      <Button
        variant="outline"
        className="w-full bg-muted/50 hover:bg-muted border-border"
        onClick={onSwitchEnv}
      >
        {t('dashboard.environment')}
      </Button>
    </div>
  );
}
