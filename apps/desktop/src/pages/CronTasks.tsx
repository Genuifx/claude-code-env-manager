import { useEffect, useState, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useLocale } from '@/locales';
import { useAppStore, type CronTask, type CronTaskRun, type CronTemplate } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { CronEditor } from '@/components/cron';
import { AiCronPanel } from '@/components/cron/AiCronPanel';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Clock, Plus, Play, Trash2, ChevronRight, CheckCircle2, XCircle,
  Timer, AlertTriangle, FolderOpen, ChevronDown, GitPullRequest,
  FlaskConical, FileText, Shield, Newspaper, Sparkles, X,
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

const INPUT_CLS = 'w-full px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative rounded-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-hidden shadow-elevation-4 border border-[hsl(var(--glass-border-light)/0.25)]"
        style={{ background: 'hsl(var(--surface-overlay))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/5" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">{editTask ? t('cron.editTask') : t('cron.addTask')}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-5 pb-5 space-y-4 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('cron.taskName')}</label>
            <input className={INPUT_CLS} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('cron.taskNamePlaceholder')} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('cron.schedule')}</label>
            <CronEditor value={cronExpr} onChange={setCronExpr} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('cron.prompt')}</label>
            <textarea className={cn(INPUT_CLS, 'min-h-[80px] resize-y')} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t('cron.promptPlaceholder')} rows={3} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t('cron.workingDir')}</label>
            <div className="flex gap-2">
              <input className={cn(INPUT_CLS, 'flex-1 font-mono')} value={workDir} onChange={(e) => setWorkDir(e.target.value)} placeholder="/path/to/project" />
              <button type="button" onClick={async () => { const d = await openDirectoryPicker(); if (d) setWorkDir(d); }} className="px-3 py-2 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.06] text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-colors shrink-0">
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('cron.environment')}</label>
              <Select value={envName || '__default__'} onValueChange={(v) => setEnvName(v === '__default__' ? '' : v)}>
                <SelectTrigger className="w-full h-auto px-3 py-2 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-sm">
                  <SelectValue placeholder={t('cron.envDefault')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">{t('cron.envDefault')}</SelectItem>
                  {environments.map((env) => <SelectItem key={env.name} value={env.name}>{env.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t('cron.timeout')}</label>
              <div className="flex items-center gap-2">
                <input type="number" className={INPUT_CLS} value={timeoutSecs} onChange={(e) => setTimeoutSecs(Number(e.target.value) || 300)} min={30} max={3600} />
                <span className="text-2xs text-muted-foreground shrink-0">{t('cron.timeoutUnit')}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
            <button className="px-4 py-2 text-sm rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors" onClick={onClose}>{t('common.cancel')}</button>
            <button className="px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors disabled:opacity-50" onClick={doSave} disabled={saving || !name.trim() || !prompt.trim() || !workDir.trim()}>{saving ? t('common.loading') : t('common.save')}</button>
          </div>
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
          onClick={async () => {
            await retryCronTask(taskId);
            // Immediately load to show "running" state, then poll for completion
            await loadCronTaskRuns(taskId);
            const poll = setInterval(async () => {
              const runs = await loadCronTaskRuns(taskId);
              // Stop polling once no run is in "running" state
              const store = useAppStore.getState();
              const current = store.cronRuns[taskId] || [];
              if (!current.some((r: { status: string }) => r.status === 'running')) clearInterval(poll);
            }, 2000);
            setTimeout(() => clearInterval(poll), 600000); // safety: stop after 10min
          }}
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
  const [showAiPanel, setShowAiPanel] = useState(false);

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

  const handleAiEdit = (task: { name: string; cronExpression: string; prompt: string; workingDir: string }) => {
    setEditingTask({
      id: '',
      name: task.name,
      cronExpression: task.cronExpression,
      prompt: task.prompt,
      workingDir: task.workingDir,
      envName: null,
      enabled: true,
      timeoutSecs: 300,
      templateId: null,
      triggerType: 'schedule',
      parentTaskId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as CronTask);
    setDialogOpen(true);
    setShowAiPanel(false);
  };

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
    <div className="space-y-4">
      <div className="flex items-center justify-start gap-2 pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
        <button onClick={() => setShowAiPanel(!showAiPanel)} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors', showAiPanel ? 'bg-primary/20 text-primary' : 'glass-outline-btn text-foreground hover:bg-white/[0.06]')}>
          <Sparkles className="w-4 h-4" />
          {t('cron.aiCreate')}
        </button>
        <button onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          {t('cron.addTask')}
        </button>
      </div>
      {showAiPanel && (
        <AiCronPanel
          open={showAiPanel}
          onClose={() => setShowAiPanel(false)}
          onTaskCreated={() => { loadCronTasks(); setShowAiPanel(false); }}
          onEdit={handleAiEdit}
        />
      )}

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

      <div className="flex gap-4" style={{ height: 'calc(100vh - 170px)' }}>
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

      <TaskDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={handleSave} editTask={editingTask} environments={environments} />

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setPendingDelete(null)}>
          <div
            className="relative rounded-2xl max-w-sm w-full mx-4 overflow-hidden shadow-elevation-4 border border-[hsl(var(--glass-border-light)/0.25)]"
            style={{ background: 'hsl(var(--surface-overlay))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative px-5 pt-5 pb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-transparent" />
              <div className="relative flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </div>
                <h2 className="text-sm font-semibold text-foreground">{t('common.delete')}</h2>
              </div>
            </div>
            <div className="px-5 pb-5 space-y-4">
              <p className="text-foreground text-sm">{t('cron.confirmDelete').replace('{name}', pendingDelete.name)}</p>
              <div className="flex justify-end gap-2 pt-1">
                <button className="px-4 py-2 text-sm rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors" onClick={() => setPendingDelete(null)}>{t('common.cancel')}</button>
                <button className="px-4 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm transition-colors" onClick={handleDelete}>{t('common.delete')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
