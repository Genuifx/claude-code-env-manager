import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  message: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, message, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="w-12 h-12 text-muted-foreground/20 mb-4" />
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {action && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorBanner({ message, onRetry, retryLabel }: ErrorBannerProps) {
  return (
    <div role="alert" className="flex items-center justify-between gap-4 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
