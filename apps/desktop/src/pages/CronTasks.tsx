import { useEffect, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useLocale } from '@/locales';
import { useAppStore, type CronTask, type CronTaskRun, type CronTemplate } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { CronEditor } from '@/components/cron';
import { PageHeader } from '@/components/layout';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Clock, Plus, Play, Trash2, ChevronRight, CheckCircle2, XCircle,
  Timer, AlertTriangle, FolderOpen, ChevronDown, GitPullRequest,
  FlaskConical, FileText, Shield, Newspaper,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function formatDuration(ms?: number | null) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTime(iso?: string | null) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const TEMPLATE_ICONS: Record<string, typeof Clock> = {
  'git-pr-review': GitPullRequest,
  'test-runner': FlaskConical,
  'doc-gen': FileText,
  'security-audit': Shield,
  'changelog': Newspaper,
};

function getTemplateIcon(id: string) {
  return TEMPLATE_ICONS[id] || Clock;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLocale();
  const map: Record<string, { icon: typeof CheckCircle2; cls: string; key: string }> = {
    running: { icon: Timer, cls: 'text-warning bg-warning/10', key: 'cron.statusRunning' },
    success: { icon: CheckCircle2, cls: 'text-success bg-success/10', key: 'cron.statusSuccess' },
    failed: { icon: XCircle, cls: 'text-destructive bg-destructive/10', key: 'cron.statusFailed' },
    timeout: { icon: AlertTriangle, cls: 'text-warning bg-warning/10', key: 'cron.statusTimeout' },
  };
  const c = map[status] || map.failed;
  const Icon = c.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium', c.cls)}>
      <Icon className="w-3 h-3" />
      {t(c.key)}
    </span>
  );
}

function StatusDot({ task, runs }: { task: CronTask; runs?: CronTaskRun[] }) {
  if (!task.enabled) return <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />;
  const last = runs?.[runs.length - 1];
  if (!last) return <span className="w-2 h-2 rounded-full bg-success animate-pulse" />;
  if (last.status === 'running') return <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />;
  if (last.status === 'success') return <span className="w-2 h-2 rounded-full bg-success" />;
  return <span className="w-2 h-2 rounded-full bg-destructive" />;
}

const INPUT_CLS = 'w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50';

function TaskDialog({ open, onClose, onSave, editTask, environments }: {
  open: boolean;
  onClose: () => void;
  onSave: (d: { name: string; cronExpression: string; prompt: string; workingDir: string; envName?: string; timeoutSecs?: number }) => Promise<void>;
  editTask?: CronTask;
  environments: { name: string }[];
}) {
  const { t } = useLocale();
  const { openDirectoryPicker } = useTauriCommands();
  const [name, setName] = useState('');
  const [cronExpr, setCronExpr] = useState('0 9 * * 1-5');
  const [prompt, setPrompt] = useState('');
  const [workDir, setWorkDir] = useState('');
  const [envName, setEnvName] = useState('');
  const [timeoutSecs, setTimeoutSecs] = useState(300);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editTask) {
      setName(editTask.name);
      setCronExpr(editTask.cronExpression);
      setPrompt(editTask.prompt);
      setWorkDir(editTask.workingDir);
      setEnvName(editTask.envName || '');
      setTimeoutSecs(editTask.timeoutSecs);
    } else {
      setName('');
      setCronExpr('0 9 * * 1-5');
      setPrompt('');
      setWorkDir('');
      setEnvName('');
      setTimeoutSecs(300);
    }
  }, [editTask, open]);

  if (!open) return null;

  const doSave = async () => {
    if (!name.trim() || !cronExpr.trim() || !prompt.trim() || !workDir.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), cronExpression: cronExpr.trim(), prompt: prompt.trim(), workingDir: workDir.trim(), envName: envName || undefined, timeoutSecs });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="frosted-panel glass-noise rounded-xl p-6 max-w-lg w-full mx-4 space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-foreground">{editTask ? t('cron.editTask') : t('cron.addTask')}</h2>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">{t('cron.taskName')}</label>
          <input className={INPUT_CLS} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('cron.taskNamePlaceholder')} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">{t('cron.schedule')}</label>
          <CronEditor value={cronExpr} onChange={setCronExpr} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">{t('cron.prompt')}</label>
          <textarea className={cn(INPUT_CLS, 'min-h-[80px] resize-y')} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t('cron.promptPlaceholder')} rows={3} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">{t('cron.workingDir')}</label>
          <div className="flex gap-2">
            <input className={cn(INPUT_CLS, 'flex-1 font-mono')} value={workDir} onChange={(e) => setWorkDir(e.target.value)} placeholder="/path/to/project" />
            <button type="button" onClick={async () => { const d = await openDirectoryPicker(); if (d) setWorkDir(d); }} className="px-3 py-2 rounded-lg glass-outline-btn text-sm text-foreground shrink-0"><FolderOpen className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">{t('cron.environment')}</label>
            <select className={INPUT_CLS} value={envName} onChange={(e) => setEnvName(e.target.value)}>
              <option value="">{t('cron.envDefault')}</option>
              {environments.map((env) => <option key={env.name} value={env.name}>{env.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">{t('cron.timeout')}</label>
            <div className="flex items-center gap-2">
              <input type="number" className={INPUT_CLS} value={timeoutSecs} onChange={(e) => setTimeoutSecs(Number(e.target.value) || 300)} min={30} max={3600} />
              <span className="text-2xs text-muted-foreground shrink-0">{t('cron.timeoutUnit')}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="px-4 py-2 text-sm rounded-lg glass-outline-btn text-foreground transition-colors" onClick={onClose}>{t('common.cancel')}</button>
          <button className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" onClick={doSave} disabled={saving || !name.trim() || !prompt.trim() || !workDir.trim()}>{saving ? t('common.loading') : t('common.save')}</button>
        </div>
      </div>
    </div>
  );
}

function RunHistoryPanel({ taskId }: { taskId: string }) {
  const { t } = useLocale();
  const { cronRuns } = useAppStore();
  const { loadCronTaskRuns, retryCronTask } = useTauriCommands();
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  useEffect(() => {
    loadCronTaskRuns(taskId);
  }, [taskId, loadCronTaskRuns]);

  const runs = cronRuns[taskId] || [];
  const sortedRuns = [...runs].reverse();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{t('cron.runHistory')}</h3>
        <button
          onClick={() => retryCronTask(taskId)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Play className="w-3 h-3" />
          {t('cron.retry')}
        </button>
      </div>
      {sortedRuns.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground/60 text-xs">
          <Timer className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>{t('cron.noRuns')}</p>
          <p className="text-2xs mt-1">{t('cron.noRunsHint')}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sortedRuns.map((run) => (
            <div key={run.id} className="glass-subtle glass-noise rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
              >
                <StatusBadge status={run.status} />
                <span className="text-2xs text-muted-foreground flex-1 truncate">{formatTime(run.startedAt)}</span>
                <span className="text-2xs text-muted-foreground">{formatDuration(run.durationMs)}</span>
                <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', expandedRun === run.id && 'rotate-180')} />
              </button>
              {expandedRun === run.id && (
                <div className="px-3 pb-3 space-y-2 border-t border-white/[0.06]">
                  {run.exitCode !== undefined && run.exitCode !== null && (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-2xs text-muted-foreground">{t('cron.exitCode')}:</span>
                      <span className="text-2xs font-mono text-foreground">{run.exitCode}</span>
                    </div>
                  )}
                  {run.stdout && (
                    <div className="space-y-1">
                      <span className="text-2xs text-muted-foreground">{t('cron.stdout')}</span>
                      <pre className="text-2xs font-mono text-foreground/80 bg-black/20 rounded-md p-2 max-h-[200px] overflow-auto whitespace-pre-wrap break-all">{run.stdout.slice(0, 5000)}</pre>
                    </div>
                  )}
                  {run.stderr && (
                    <div className="space-y-1">
                      <span className="text-2xs text-destructive">{t('cron.stderr')}</span>
                      <pre className="text-2xs font-mono text-destructive/80 bg-destructive/5 rounded-md p-2 max-h-[200px] overflow-auto whitespace-pre-wrap break-all">{run.stderr.slice(0, 5000)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CronTasks() {
  const { t } = useLocale();
  const { cronTasks, environments, isLoadingCron } = useAppStore();
  const {
    loadCronTasks, addCronTask, updateCronTask,
    deleteCronTask, toggleCronTask, listCronTemplates,
  } = useTauriCommands();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CronTask | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CronTask | null>(null);
  const [templates, setTemplates] = useState<CronTemplate[]>([]);

  useEffect(() => {
    loadCronTasks();
    listCronTemplates().then(setTemplates).catch(() => {});
  }, [loadCronTasks, listCronTemplates]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const setup = async () => {
      try {
        unsubs.push(await listen('cron-task-started', () => loadCronTasks()));
        unsubs.push(await listen('cron-task-completed', () => loadCronTasks()));
        unsubs.push(await listen('cron-task-failed', () => loadCronTasks()));
      } catch (err) {
        console.error('Failed to setup cron event listeners:', err);
      }
    };
    setup();
    return () => unsubs.forEach((fn) => fn());
  }, [loadCronTasks]);

  const handleAdd = () => { setEditingTask(undefined); setDialogOpen(true); };
  const handleEdit = (task: CronTask) => { setEditingTask(task); setDialogOpen(true); };

  const handleTemplateCreate = async (tpl: CronTemplate) => {
    try {
      const task = await addCronTask({
        name: tpl.name, cronExpression: tpl.cronExpression,
        prompt: tpl.prompt, workingDir: '~', templateId: tpl.id,
      });
      toast.success(t('cron.taskCreated'));
      setSelectedTaskId(task.id);
      setEditingTask(task);
      setDialogOpen(true);
    } catch {
      toast.error(t('cron.fillRequired'));
    }
  };

  const handleSave = useCallback(async (data: {
    name: string; cronExpression: string; prompt: string;
    workingDir: string; envName?: string; timeoutSecs?: number;
  }) => {
    if (editingTask) {
      await updateCronTask({ id: editingTask.id, ...data });
      toast.success(t('cron.taskUpdated'));
    } else {
      await addCronTask(data);
      toast.success(t('cron.taskAdded'));
    }
  }, [editingTask, addCronTask, updateCronTask, t]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await deleteCronTask(pendingDelete.id);
    toast.success(t('cron.taskDeleted'));
    if (selectedTaskId === pendingDelete.id) setSelectedTaskId(null);
    setPendingDelete(null);
  };

  const selectedTask = cronTasks.find((tk) => tk.id === selectedTaskId);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('cron.title')}>
        <button onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          {t('cron.addTask')}
        </button>
      </PageHeader>

      <div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
        {templates.length > 0 && cronTasks.length === 0 && (
          <div className="shrink-0">
            <p className="text-xs text-muted-foreground mb-2">{t('cron.templates')}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {templates.map((tpl) => {
                const TplIcon = getTemplateIcon(tpl.id);
                return (
                  <button key={tpl.id} onClick={() => handleTemplateCreate(tpl)} className="glass-card glass-noise rounded-xl px-4 py-3 flex items-center gap-2.5 shrink-0 text-left hover:ring-1 hover:ring-primary/30 transition-all">
                    <TplIcon className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{tpl.name}</p>
                      <p className="text-2xs text-muted-foreground truncate">{tpl.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className="w-[340px] shrink-0 flex flex-col gap-2 overflow-y-auto">
            {isLoadingCron ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass-card glass-noise rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-white/[0.06] rounded w-2/3 mb-2" />
                    <div className="h-3 bg-white/[0.06] rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : cronTasks.length === 0 ? (
              <EmptyState icon={Clock} message={t('cron.noTasks')} action={t('cron.addTask')} onAction={handleAdd} />
            ) : (
              cronTasks.map((task) => {
                const taskRuns = useAppStore.getState().cronRuns[task.id];
                return (
                  <button key={task.id} onClick={() => setSelectedTaskId(task.id)} className={cn('glass-card glass-noise rounded-xl p-3.5 text-left transition-all w-full group', selectedTaskId === task.id ? 'ring-1 ring-primary/40' : 'hover:ring-1 hover:ring-white/[0.08]')}>
                    <div className="flex items-start gap-2.5">
                      <StatusDot task={task} runs={taskRuns} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{task.name}</span>
                          {!task.enabled && (
                            <span className="text-2xs text-muted-foreground/50 px-1.5 py-0.5 rounded bg-white/[0.04]">{t('cron.disabled')}</span>
                          )}
                        </div>
                        <div className="text-2xs font-mono text-muted-foreground mt-1">{task.cronExpression}</div>
                        <div className="text-2xs text-muted-foreground/60 mt-0.5 truncate">{task.workingDir}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedTask ? (
              <div className="glass-card glass-noise rounded-xl p-5 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{selectedTask.name}</h2>
                    <span className="text-2xs font-mono text-muted-foreground">{selectedTask.cronExpression}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleCronTask(selectedTask.id)} className={cn('px-3 py-1 rounded-lg text-2xs font-medium transition-colors', selectedTask.enabled ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08]')}>
                      {selectedTask.enabled ? t('cron.enabled') : t('cron.disabled')}
                    </button>
                    <button onClick={() => handleEdit(selectedTask)} className="px-3 py-1 rounded-lg text-2xs glass-outline-btn text-foreground">{t('common.edit')}</button>
                    <button onClick={() => setPendingDelete(selectedTask)} className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-foreground">{t('cron.taskConfig')}</h3>
                  <div className="glass-subtle glass-noise rounded-lg p-3 space-y-2">
                    <div>
                      <span className="text-2xs text-muted-foreground">{t('cron.prompt')}</span>
                      <p className="text-xs text-foreground/80 mt-0.5 whitespace-pre-wrap">{selectedTask.prompt}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-2xs text-muted-foreground">{t('cron.workingDir')}</span>
                        <p className="text-xs font-mono text-foreground/80 mt-0.5 truncate">{selectedTask.workingDir}</p>
                      </div>
                      <div>
                        <span className="text-2xs text-muted-foreground">{t('cron.environment')}</span>
                        <p className="text-xs text-foreground/80 mt-0.5">{selectedTask.envName || t('cron.envDefault')}</p>
                      </div>
                      <div>
                        <span className="text-2xs text-muted-foreground">{t('cron.timeout')}</span>
                        <p className="text-xs text-foreground/80 mt-0.5">{selectedTask.timeoutSecs}{t('cron.timeoutUnit')}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <RunHistoryPanel taskId={selectedTask.id} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground/40 text-sm">
                <div className="text-center">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>{cronTasks.length > 0 ? t('cron.noRunsHint') : t('cron.noTasksHint')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={handleSave} editTask={editingTask} environments={environments} />

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPendingDelete(null)}>
          <div className="frosted-panel glass-noise rounded-xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-foreground text-sm">{t('cron.confirmDelete').replace('{name}', pendingDelete.name)}</p>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 text-sm rounded-lg glass-outline-btn text-foreground transition-colors" onClick={() => setPendingDelete(null)}>{t('common.cancel')}</button>
              <button className="px-4 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors" onClick={handleDelete}>{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
