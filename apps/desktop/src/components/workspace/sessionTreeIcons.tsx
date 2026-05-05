import { memo } from 'react';
import { BadgeAlert, LoaderCircle } from 'lucide-react';
import { Claude, Codex, OpenCode } from '@lobehub/icons';
import { ModelIcon } from '@/components/history/ModelIcon';
import { cn } from '@/lib/utils';
import type { HistorySessionItem } from '@/features/conversations/types';
import type { Environment, LaunchClient } from '@/store';
import type { WorkspaceSessionDecoration } from './useWorkspaceSessionDecorations';

interface SessionTreeItemIconProps {
  session: HistorySessionItem;
  environment?: Environment;
  decoration?: WorkspaceSessionDecoration;
  isSelected?: boolean;
  className?: string;
}

function normalizeClient(value: string | undefined): LaunchClient {
  if (value === 'codex') {
    return 'codex';
  }
  if (value === 'opencode') {
    return 'opencode';
  }
  return 'claude';
}

function hintFromBaseUrl(baseUrl: string | undefined): string | undefined {
  if (!baseUrl) {
    return undefined;
  }

  const normalized = baseUrl.toLowerCase();
  if (normalized.includes('openrouter.ai')) return 'openrouter';
  if (normalized.includes('openai.com')) return 'gpt';
  if (normalized.includes('bigmodel.cn')) return 'glm';
  if (normalized.includes('moonshot.cn') || normalized.includes('kimi.com')) return 'kimi';
  if (normalized.includes('minimax')) return 'minimax';
  if (normalized.includes('deepseek')) return 'deepseek';
  if (normalized.includes('dashscope') || normalized.includes('aliyuncs.com')) return 'qwen';
  if (normalized.includes('11434') || normalized.includes('ollama')) return 'ollama';
  if (normalized.includes('googleapis.com') || normalized.includes('generativelanguage')) return 'gemini';
  if (normalized.includes('xiaomimimo.com')) return 'mimo';
  if (normalized.includes('anthropic.com')) return 'claude';
  return undefined;
}

export function resolveEnvironmentIconHint(environment?: Environment): string | undefined {
  if (!environment) {
    return undefined;
  }

  return (
    environment.defaultOpusModel
    || environment.runtimeModel
    || environment.defaultSonnetModel
    || environment.defaultHaikuModel
    || hintFromBaseUrl(environment.baseUrl)
    || environment.name
  );
}

export function resolveSessionClient(
  session: Pick<HistorySessionItem, 'source'>,
  decoration?: Pick<WorkspaceSessionDecoration, 'client'>
): LaunchClient {
  return normalizeClient(decoration?.client ?? session.source);
}

const SourceIdentityIcon = memo(function SourceIdentityIcon({
  client,
  className,
}: {
  client: LaunchClient;
  className?: string;
}) {
  if (client === 'codex') {
    return <Codex.Color size={14} className={className} />;
  }
  if (client === 'opencode') {
    return <OpenCode size={14} className={className} />;
  }
  return <Claude.Color size={14} className={className} />;
});

export const SessionTreeItemIcon = memo(function SessionTreeItemIcon({
  session,
  environment,
  decoration,
  isSelected = false,
  className,
}: SessionTreeItemIconProps) {
  const iconClassName = cn('w-3.5 h-3.5 shrink-0', className);

  if (decoration?.visualState === 'attention') {
    return (
      <span className="relative inline-flex items-center justify-center shrink-0">
        <span className="absolute inline-flex h-3.5 w-3.5 animate-ping rounded-full bg-warning/45 opacity-75" />
        <BadgeAlert className={cn(iconClassName, 'relative text-warning status-glow-warning')} />
      </span>
    );
  }

  if (decoration?.visualState === 'processing') {
    return (
      <LoaderCircle
        className={cn(
          iconClassName,
          'animate-spin',
          isSelected ? 'text-primary' : 'text-muted-foreground'
        )}
      />
    );
  }

  const client = resolveSessionClient(session, decoration);
  const providerHint = resolveEnvironmentIconHint(environment);
  if (client !== 'codex' && providerHint) {
    return <ModelIcon model={providerHint} size={14} className={iconClassName} withBg />;
  }

  return <SourceIdentityIcon client={client} className={iconClassName} />;
});
