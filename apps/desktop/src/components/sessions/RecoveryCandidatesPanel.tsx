import { useCallback, useEffect, useState, useTransition } from 'react';
import { History, RefreshCw, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LaunchButton } from '@/components/ui/LaunchButton';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLocale } from '@/locales';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import type { RuntimeRecoveryCandidate } from '@/lib/tauri-ipc';

function formatTimestamp(value: string) {
  try {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function summarizeProject(path: string) {
  const parts = path.split('/').filter(Boolean);
  return parts.slice(-2).join('/') || path;
}

function sourceLabel(candidate: RuntimeRecoveryCandidate) {
  switch (candidate.source.type) {
    case 'telegram':
      return `Telegram · ${candidate.source.chat_id}/${candidate.source.thread_id}`;
    case 'cron':
      return `Cron · ${candidate.source.task_id}`;
    default:
      return 'Desktop';
  }
}

function candidatesEqual(left: RuntimeRecoveryCandidate[], right: RuntimeRecoveryCandidate[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((candidate, index) => {
    const other = right[index];
    return other
      && other.runtime_id === candidate.runtime_id
      && other.runtime_kind === candidate.runtime_kind
      && other.claude_session_id === candidate.claude_session_id
      && other.project_dir === candidate.project_dir
      && other.env_name === candidate.env_name
      && other.perm_mode === candidate.perm_mode
      && other.saved_at === candidate.saved_at
      && JSON.stringify(other.source) === JSON.stringify(candidate.source);
  });
}

export function RecoveryCandidatesPanel() {
  const { t } = useLocale();
  const [candidates, setCandidates] = useState<RuntimeRecoveryCandidate[]>([]);
  const [busyRuntimeId, setBusyRuntimeId] = useState<string | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const {
    listRuntimeRecoveryCandidates,
    dismissRuntimeRecoveryCandidate,
    createInteractiveSession,
    createHeadlessSession,
  } = useTauriCommands();

  const refreshCandidates = useCallback(async () => {
    const next = await listRuntimeRecoveryCandidates();
    setCandidates((current) => (candidatesEqual(current, next) ? current : next));
    return next;
  }, [listRuntimeRecoveryCandidates]);

  useEffect(() => {
    void refreshCandidates();
  }, [refreshCandidates]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      startRefreshTransition(() => {
        void refreshCandidates();
      });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [refreshCandidates]);

  const handleDismiss = useCallback(async (runtimeId: string) => {
    setBusyRuntimeId(runtimeId);
    try {
      await dismissRuntimeRecoveryCandidate(runtimeId);
      await refreshCandidates();
      toast.success(t('sessions.recoveryDismissed'));
    } catch (error) {
      toast.error(t('sessions.recoveryDismissFailed').replace('{error}', String(error)));
    } finally {
      setBusyRuntimeId(null);
    }
  }, [dismissRuntimeRecoveryCandidate, refreshCandidates, t]);

  const handleResume = useCallback(async (candidate: RuntimeRecoveryCandidate) => {
    setBusyRuntimeId(candidate.runtime_id);
    try {
      if (candidate.runtime_kind === 'interactive') {
        await createInteractiveSession({
          envName: candidate.env_name,
          permMode: candidate.perm_mode,
          workingDir: candidate.project_dir,
          resumeSessionId: candidate.claude_session_id,
          client: 'claude',
        });
      } else {
        await createHeadlessSession({
          envName: candidate.env_name,
          permMode: candidate.perm_mode,
          workingDir: candidate.project_dir,
          resumeSessionId: candidate.claude_session_id,
        });
      }
      await refreshCandidates();
      toast.success(t('sessions.recoveryResumed'));
    } catch (error) {
      toast.error(t('sessions.recoveryResumeFailed').replace('{error}', String(error)));
    } finally {
      setBusyRuntimeId(null);
    }
  }, [createHeadlessSession, createInteractiveSession, refreshCandidates, t]);

  if (candidates.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">{t('sessions.recoveryTitle')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('sessions.recoverySubtitle').replace('{count}', String(candidates.length))}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="glass-btn-outline h-8 px-2"
          onClick={() => {
            startRefreshTransition(() => {
              void refreshCandidates();
            });
          }}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {candidates.map((candidate) => {
          const isBusy = busyRuntimeId === candidate.runtime_id;
          const isInteractive = candidate.runtime_kind === 'interactive';
          return (
            <div
              key={candidate.runtime_id}
              className="rounded-2xl border border-black/[0.06] bg-black/[0.02] p-4 text-left dark:border-white/[0.08] dark:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {summarizeProject(candidate.project_dir)}
                    </span>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                      isInteractive ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                    )}>
                      {isInteractive ? t('sessions.recoveryKindInteractive') : t('sessions.recoveryKindHeadless')}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono break-all">
                    {candidate.project_dir}
                  </p>
                </div>
                <History className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <span>{candidate.env_name}</span>
                <span>{candidate.perm_mode}</span>
                <span>{sourceLabel(candidate)}</span>
                <span>{formatTimestamp(candidate.saved_at)}</span>
              </div>

              <div className="mt-3 rounded-xl border border-black/[0.05] bg-background/70 px-3 py-2 dark:border-white/[0.08]">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {t('sessions.recoverySessionId')}
                </p>
                <p className="mt-1 break-all font-mono text-xs text-foreground">
                  {candidate.claude_session_id}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="glass-btn-outline"
                  disabled={isBusy}
                  onClick={() => void handleDismiss(candidate.runtime_id)}
                >
                  <X className="w-4 h-4" />
                  {t('sessions.recoveryDismiss')}
                </Button>
                {/* Resume button */}
                <LaunchButton
                  onClick={() => void handleResume(candidate)}
                  disabled={isBusy}
                  size="sm"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  {isInteractive ? t("sessions.recoveryResumeInteractive") : t("sessions.recoveryResumeHeadless")}
                </LaunchButton>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
