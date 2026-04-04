import { Claude, Codex } from '@lobehub/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';

interface AgentLaunchSplitButtonProps {
  newSessionLabel: string;
  claudeLabel: string;
  codexLabel: string;
  codexUnavailableLabel: string;
  codexInstalled?: boolean;
  className?: string;
  onLaunchClaude: () => void;
  onLaunchCodex: () => void;
}

export function AgentLaunchSplitButton({
  newSessionLabel,
  claudeLabel,
  codexLabel,
  codexUnavailableLabel,
  codexInstalled = false,
  className,
  onLaunchClaude,
  onLaunchCodex,
}: AgentLaunchSplitButtonProps) {
  return (
    <ButtonGroup className={cn('w-full', className)} aria-label={newSessionLabel}>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 gap-2"
        onClick={onLaunchClaude}
        aria-label={`${newSessionLabel}: ${claudeLabel}`}
      >
        <Claude.Color size={14} />
        <span className="text-xs font-semibold">{claudeLabel}</span>
      </Button>

      <ButtonGroupSeparator />

      <Button
        variant="outline"
        size="sm"
        className="flex-1 gap-2"
        onClick={onLaunchCodex}
        disabled={!codexInstalled}
        aria-label={
          codexInstalled
            ? `${newSessionLabel}: ${codexLabel}`
            : `${codexLabel} ${codexUnavailableLabel}`
        }
      >
        <Codex.Color size={14} />
        <span className="text-xs font-semibold">{codexLabel}</span>
        {!codexInstalled && (
          <span className="text-2xs text-muted-foreground">({codexUnavailableLabel})</span>
        )}
      </Button>
    </ButtonGroup>
  );
}
