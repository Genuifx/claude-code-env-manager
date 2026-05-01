import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  FolderOpen,
  TerminalSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { shallow } from 'zustand/shallow';
import { WorkspaceStatusStrip } from '@/components/workspace/WorkspaceStatusStrip';
import { ProjectTree } from '@/components/workspace/ProjectTree';
import { WorkspaceNativeSessionView } from '@/components/workspace/WorkspaceNativeSessionView';
import { WorkspaceSessionComposer } from '@/components/workspace/WorkspaceSessionComposer';
import { ComposerControls } from '@/components/workspace/ComposerControls';
import type { EffortLevel } from '@/components/workspace/ComposerControls';
import type { PermissionModeName } from '@ccem/core/browser';
import {
  buildComposerPromptPreview,
  buildComposerPromptText,
  extractComposerImagePayloads,
  type ComposerSubmitPayload,
} from '@/components/workspace/composerAttachments';
import { WorkspaceSkeleton } from '@/components/ui/skeleton-states';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/store';
import type { InstalledSkill, LaunchClient } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import {
  useSessionInterruptedEvent,
  useSessionUpdatedEvent,
  useTaskCompletedEvent,
  useTaskErrorEvent,
} from '@/hooks/useTauriEvents';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLocale } from '@/locales';
import { scheduleAfterFirstPaint } from '@/lib/idle';
import { cn, getProjectName } from '@/lib/utils';
import {
  fetchConversationDetail,
  fetchHistorySessions,
  invalidateHistoryCache,
} from '@/features/conversations/historyData';
import type {
  ConversationMessageData,
  HistorySegment,
  HistorySessionItem,
} from '@/features/conversations/types';
import { toSessionKey } from '@/features/conversations/types';
import { useWorkspaceSessionDecorations } from '@/components/workspace/useWorkspaceSessionDecorations';
import type { NativeSessionSummary } from '@/lib/tauri-ipc';

const LazyHistoryDetail = lazy(async () =>
  import('@/components/workspace/WorkspaceConversationDetail').then((m) => ({
    default: m.WorkspaceConversationDetail,
  }))
);

type WorkspaceViewMode = 'compose' | 'live' | 'history';

interface WorkspaceLiveSessionEntry {
  session: NativeSessionSummary;
  initialPrompt: string | null;
  seedMessages: ConversationMessageData[];
}

function resolveComposerDispatch(options: {
  provider: 'claude' | 'codex';
  prompt: string;
  permissionMode: string;
  planModeEnabled: boolean;
}) {
  const trimmedPrompt = options.prompt.trim();
  if (!options.planModeEnabled) {
    return {
      prompt: trimmedPrompt,
      permMode: options.permissionMode,
    };
  }

  if (options.provider === 'claude') {
    return {
      prompt: trimmedPrompt,
      permMode: 'plan',
    };
  }

  return {
    prompt: trimmedPrompt.startsWith('/plan')
      ? trimmedPrompt
      : (trimmedPrompt ? `/plan ${trimmedPrompt}` : '/plan'),
    permMode: options.permissionMode,
  };
}

const ACTIVE_LIVE_RUNTIME_STORAGE_KEY = 'ccem-workspace-live-runtime';
const LIVE_RUNTIME_SET_STORAGE_KEY = 'ccem-workspace-live-runtimes';

function readPersistedLiveRuntimeIds(): string[] {
  const raw = localStorage.getItem(LIVE_RUNTIME_SET_STORAGE_KEY);
  const legacyActiveRuntimeId = localStorage.getItem(ACTIVE_LIVE_RUNTIME_STORAGE_KEY);

  if (!raw) {
    return legacyActiveRuntimeId ? [legacyActiveRuntimeId] : [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return legacyActiveRuntimeId ? [legacyActiveRuntimeId] : [];
    }

    const runtimeIds = parsed.filter((value): value is string => typeof value === 'string' && value.length > 0);
    if (legacyActiveRuntimeId && !runtimeIds.includes(legacyActiveRuntimeId)) {
      runtimeIds.push(legacyActiveRuntimeId);
    }
    return runtimeIds;
  } catch {
    return legacyActiveRuntimeId ? [legacyActiveRuntimeId] : [];
  }
}

function writePersistedLiveRuntimeIds(runtimeIds: string[]) {
  if (runtimeIds.length === 0) {
    localStorage.removeItem(LIVE_RUNTIME_SET_STORAGE_KEY);
    return;
  }

  localStorage.setItem(LIVE_RUNTIME_SET_STORAGE_KEY, JSON.stringify(runtimeIds));
}

function DetailFallback() {
  return <div className="flex-1 overflow-hidden" />;
}

function canRestoreWorkspaceLiveSession(session: NativeSessionSummary): boolean {
  if (!session.is_active) {
    return false;
  }

  return !['stopped', 'error', 'handoff', 'interrupted'].includes(session.status);
}

interface WorkspaceProps {
  isActive?: boolean;
  onNavigate: (tab: string) => void;
  onLaunchWithDir: (dir: string, client?: LaunchClient) => void;
}

export function Workspace({ isActive = true, onNavigate }: WorkspaceProps) {
  const { t } = useLocale();
  const {
    isLoadingEnvs,
    isLoadingStats,
    environments,
    currentEnv,
    permissionMode,
    selectedWorkingDir,
    defaultWorkingDir,
    launchClient,
    installedSkills,
    setSelectedWorkingDir,
    setLaunchClient,
    setPermissionMode,
  } = useAppStore(
    (state) => ({
      isLoadingEnvs: state.isLoadingEnvs,
      isLoadingStats: state.isLoadingStats,
      environments: state.environments,
      currentEnv: state.currentEnv,
      permissionMode: state.permissionMode,
      selectedWorkingDir: state.selectedWorkingDir,
      defaultWorkingDir: state.defaultWorkingDir,
      launchClient: state.launchClient,
      installedSkills: state.installedSkills,
      setSelectedWorkingDir: state.setSelectedWorkingDir,
      setLaunchClient: state.setLaunchClient,
      setPermissionMode: state.setPermissionMode,
    }),
    shallow
  );

  const {
    switchEnvironment,
    openDirectoryPicker,
    loadCronTasks,
    loadInstalledSkills,
    checkCodexInstalled,
    checkOpenCodeInstalled,
    setSessionTitle,
    createNativeSession,
    listNativeSessions,
    launchOpenCodeWeb,
    launchClaudeCode,
    searchWorkspaceFiles,
  } = useTauriCommands();

  const [sessions, setSessions] = useState<HistorySessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessageData[]>([]);
  const [segments, setSegments] = useState<HistorySegment[]>([]);
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [codexInstalled, setCodexInstalled] = useState(false);
  const [opencodeInstalled, setOpenCodeInstalled] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceViewMode>('compose');
  const [composeProvider, setComposeProvider] = useState<'claude' | 'codex'>(
    launchClient === 'codex' ? 'codex' : 'claude'
  );
  const [composePrompt, setComposePrompt] = useState('');
  const [composePlanModeEnabled, setComposePlanModeEnabled] = useState(false);
  const [historyComposerText, setHistoryComposerText] = useState('');
  const [historyPlanModeEnabled, setHistoryPlanModeEnabled] = useState(false);
  const [historyEnv, setHistoryEnv] = useState('');
  const [historyPermMode, setHistoryPermMode] = useState<PermissionModeName>(permissionMode);
  const [composeEffort, setComposeEffort] = useState<EffortLevel>('high');
  const [historyEffort, setHistoryEffort] = useState<EffortLevel>('high');
  const [composeDir, setComposeDir] = useState<string | null>(selectedWorkingDir || defaultWorkingDir || null);
  const [workspaceInstalledSkills, setWorkspaceInstalledSkills] = useState<InstalledSkill[]>([]);
  const [liveSessionsByRuntimeId, setLiveSessionsByRuntimeId] = useState<
    Record<string, WorkspaceLiveSessionEntry>
  >({});
  const [activeLiveRuntimeId, setActiveLiveRuntimeId] = useState<string | null>(null);
  const [isCreatingNativeSession, setIsCreatingNativeSession] = useState(false);
  const [isResumingHistorySession, setIsResumingHistorySession] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshRequestSeqRef = useRef(0);
  const skillsBootstrapAttemptedRef = useRef(false);
  const conversationRequestSeqRef = useRef(0);
  const hydratingLiveRuntimeIdsRef = useRef(new Set<string>());
  const pendingRefreshRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const prevIsActiveRef = useRef(isActive);
  const selectedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedWorkingDir && selectedWorkingDir !== composeDir) {
      setComposeDir(selectedWorkingDir);
    }
  }, [composeDir, selectedWorkingDir]);

  useEffect(() => {
    setHistoryComposerText('');
    setHistoryPlanModeEnabled(false);
    setHistoryEnv(selectedSession?.envName || currentEnv || '');
    setHistoryPermMode(permissionMode);
  }, [selectedKey]);

  const upsertLiveSessionEntry = useCallback((
    session: NativeSessionSummary,
    options: {
      initialPrompt?: string | null;
      seedMessages?: ConversationMessageData[];
    } = {},
  ) => {
    setLiveSessionsByRuntimeId((previous) => {
      const existing = previous[session.runtime_id];
      return {
        ...previous,
        [session.runtime_id]: {
          session,
          initialPrompt: options.initialPrompt ?? existing?.initialPrompt ?? null,
          seedMessages: options.seedMessages ?? existing?.seedMessages ?? [],
        },
      };
    });
  }, []);

  const restoreNativeSessions = useCallback(async () => {
    const persistedRuntimeId = localStorage.getItem(ACTIVE_LIVE_RUNTIME_STORAGE_KEY);
    const persistedRuntimeIds = readPersistedLiveRuntimeIds();

    if (persistedRuntimeIds.length === 0) {
      return;
    }

    try {
      const nativeSessions = await listNativeSessions();
      const restorableSessionsByRuntimeId = new Map(
        nativeSessions
          .filter(canRestoreWorkspaceLiveSession)
          .map((session) => [session.runtime_id, session]),
      );
      const restoredSessions = persistedRuntimeIds
        .map((runtimeId) => restorableSessionsByRuntimeId.get(runtimeId))
        .filter((session): session is NativeSessionSummary => Boolean(session));

      if (restoredSessions.length === 0) {
        localStorage.removeItem(ACTIVE_LIVE_RUNTIME_STORAGE_KEY);
        localStorage.removeItem(LIVE_RUNTIME_SET_STORAGE_KEY);
        setLiveSessionsByRuntimeId({});
        setActiveLiveRuntimeId(null);
        return;
      }

      setLiveSessionsByRuntimeId(
        Object.fromEntries(
          restoredSessions.map((session) => [
            session.runtime_id,
            {
              session,
              initialPrompt: null,
              seedMessages: [],
            } satisfies WorkspaceLiveSessionEntry,
          ]),
        ),
      );

      if (!persistedRuntimeId) {
        return;
      }

      const target = restoredSessions.find((session) => session.runtime_id === persistedRuntimeId);
      if (!target) {
        localStorage.removeItem(ACTIVE_LIVE_RUNTIME_STORAGE_KEY);
        setActiveLiveRuntimeId(null);
        return;
      }

      setActiveLiveRuntimeId(target.runtime_id);
      setComposeDir(target.project_dir);
      setSelectedWorkingDir(target.project_dir);
      setWorkspaceMode('live');
    } catch (error) {
      console.error('Failed to restore native workspace sessions:', error);
    }
  }, [listNativeSessions, setSelectedWorkingDir]);

  useEffect(() => {
    if (installedSkills.length === 0) {
      return;
    }
    setWorkspaceInstalledSkills(installedSkills);
  }, [installedSkills]);

  useEffect(() => {
    const cancelDeferred = scheduleAfterFirstPaint(() => {
      void loadCronTasks().catch(() => {});
      void loadInstalledSkills()
        .then((skills) => {
          if (skills.length > 0) {
            setWorkspaceInstalledSkills(skills);
          }
        })
        .catch(() => {});
      checkCodexInstalled().then(setCodexInstalled).catch(() => {});
      checkOpenCodeInstalled().then(setOpenCodeInstalled).catch(() => {});
      void restoreNativeSessions();
    }, { delayMs: 220, timeoutMs: 1400 });

    return () => {
      cancelDeferred();
    };
  }, [checkCodexInstalled, checkOpenCodeInstalled, loadCronTasks, loadInstalledSkills, restoreNativeSessions]);

  useEffect(() => {
    if (installedSkills.length > 0 || skillsBootstrapAttemptedRef.current) {
      return;
    }

    skillsBootstrapAttemptedRef.current = true;
    void loadInstalledSkills()
      .then((skills) => {
        if (skills.length > 0) {
          setWorkspaceInstalledSkills(skills);
        }
      })
      .catch(() => {
        skillsBootstrapAttemptedRef.current = false;
      });
  }, [installedSkills.length, loadInstalledSkills]);

  const syncSessionState = useCallback((nextSessions: HistorySessionItem[]) => {
    setSessions(nextSessions);

    const currentSelectedKey = selectedKeyRef.current;
    if (!currentSelectedKey) {
      return;
    }

    const stillExists = nextSessions.some((session) => toSessionKey(session) === currentSelectedKey);
    if (!stillExists) {
      selectedKeyRef.current = null;
      setSelectedKey(null);
      setMessages([]);
      setSegments([]);
      setActiveSegment(null);
      setIsLoadingMessages(false);
      if (Object.keys(liveSessionsByRuntimeId).length === 0) {
        setWorkspaceMode('compose');
      }
    }
  }, [liveSessionsByRuntimeId]);

  useEffect(() => {
    if (activeLiveRuntimeId) {
      localStorage.setItem(ACTIVE_LIVE_RUNTIME_STORAGE_KEY, activeLiveRuntimeId);
      return;
    }
    localStorage.removeItem(ACTIVE_LIVE_RUNTIME_STORAGE_KEY);
  }, [activeLiveRuntimeId]);

  useEffect(() => {
    const restorableRuntimeIds = Object.values(liveSessionsByRuntimeId)
      .filter((entry) => canRestoreWorkspaceLiveSession(entry.session))
      .map((entry) => entry.session.runtime_id);
    writePersistedLiveRuntimeIds(restorableRuntimeIds);
  }, [liveSessionsByRuntimeId]);

  const activeLiveEntry = activeLiveRuntimeId
    ? liveSessionsByRuntimeId[activeLiveRuntimeId] ?? null
    : null;

  useEffect(() => {
    if (workspaceMode !== 'live') {
      return;
    }

    const providerSessionId = activeLiveEntry?.session.provider_session_id;
    if (!providerSessionId) {
      return;
    }

    const matchingSession = sessions.find((session) =>
      session.id === providerSessionId
      && session.source === activeLiveEntry.session.provider,
    );
    if (!matchingSession) {
      return;
    }

    const nextKey = toSessionKey(matchingSession);
    if (selectedKeyRef.current === nextKey) {
      return;
    }

    selectedKeyRef.current = nextKey;
    setSelectedKey(nextKey);
  }, [activeLiveEntry, sessions, workspaceMode]);

  const loadConversation = useCallback(
    async (
      session: HistorySessionItem,
      options: { resetBeforeLoad?: boolean; showLoading?: boolean } = {}
    ) => {
      const { resetBeforeLoad = true, showLoading = true } = options;
      const requestSeq = ++conversationRequestSeqRef.current;

      if (resetBeforeLoad) {
        setMessages([]);
        setSegments([]);
        setActiveSegment(null);
      }

      if (showLoading) {
        setIsLoadingMessages(true);
      }

      try {
        const { messages: msgs, segments: segs } = await fetchConversationDetail(session);

        if (requestSeq !== conversationRequestSeqRef.current) {
          return;
        }

        setMessages(msgs);
        setSegments(segs);
      } catch (error) {
        if (requestSeq !== conversationRequestSeqRef.current) {
          return;
        }
        console.error('Failed to load conversation:', error);
      } finally {
        if (showLoading && requestSeq === conversationRequestSeqRef.current) {
          setIsLoadingMessages(false);
        }
      }
    },
    []
  );

  const refreshWorkspaceData = useCallback(
    async (
      options: { force?: boolean; silent?: boolean; includeSelectedConversation?: boolean } = {}
    ) => {
      const {
        force = true,
        silent = true,
        includeSelectedConversation = true,
      } = options;
      const requestSeq = ++refreshRequestSeqRef.current;

      setIsRefreshing(true);
      if (!hasLoadedRef.current) {
        setIsLoadingSessions(true);
      }

      try {
        const nextSessions = await fetchHistorySessions('all', force);

        if (requestSeq !== refreshRequestSeqRef.current) {
          return;
        }

        syncSessionState(nextSessions);
        hasLoadedRef.current = true;

        if (includeSelectedConversation) {
          const currentSelectedKey = selectedKeyRef.current;
          if (currentSelectedKey) {
            const selectedSession = nextSessions.find(
              (session) => toSessionKey(session) === currentSelectedKey
            );
            if (selectedSession) {
              await loadConversation(selectedSession, {
                resetBeforeLoad: false,
                showLoading: false,
              });
            }
          }
        }
      } catch (error) {
        if (requestSeq !== refreshRequestSeqRef.current) {
          return;
        }

        console.error('Failed to refresh workspace history:', error);
        if (!silent) {
          toast.error(t('workspace.refreshFailed'));
        }
      } finally {
        if (requestSeq === refreshRequestSeqRef.current) {
          setIsRefreshing(false);
          setIsLoadingSessions(false);
          pendingRefreshRef.current = false;
        }
      }
    },
    [loadConversation, syncSessionState, t]
  );

  const scheduleWorkspaceRefresh = useCallback((delayMs = 700) => {
    pendingRefreshRef.current = true;

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      if (!isActive) {
        return;
      }

      void refreshWorkspaceData({
        force: true,
        silent: true,
        includeSelectedConversation: true,
      });
    }, delayMs);
  }, [isActive, refreshWorkspaceData]);

  useEffect(() => {
    void refreshWorkspaceData({
      force: false,
      silent: true,
      includeSelectedConversation: false,
    });
  }, [refreshWorkspaceData]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      prevIsActiveRef.current = isActive;
      return;
    }

    const becameActive = isActive && !prevIsActiveRef.current;
    prevIsActiveRef.current = isActive;

    if (!becameActive) {
      return;
    }

    void refreshWorkspaceData({
      force: true,
      silent: true,
      includeSelectedConversation: true,
    });
  }, [isActive, refreshWorkspaceData]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleWindowFocus = () => {
      scheduleWorkspaceRefresh(220);
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isActive, scheduleWorkspaceRefresh]);

  useSessionUpdatedEvent(() => {
    scheduleWorkspaceRefresh();
  });

  useTaskCompletedEvent(() => {
    scheduleWorkspaceRefresh();
  });

  useTaskErrorEvent(() => {
    scheduleWorkspaceRefresh();
  });

  useSessionInterruptedEvent(() => {
    scheduleWorkspaceRefresh();
  });

  const selectedSession = useMemo(() => {
    if (!selectedKey) return null;
    return sessions.find((session) => toSessionKey(session) === selectedKey) ?? null;
  }, [selectedKey, sessions]);

  const environmentByName = useMemo(
    () => Object.fromEntries(environments.map((environment) => [environment.name, environment])),
    [environments]
  );

  const { decorationsBySessionKey } = useWorkspaceSessionDecorations({
    sessions,
    isActive,
  });

  const findLiveEntryForSession = useCallback((session: HistorySessionItem) => {
    const sessionKey = toSessionKey(session);
    const runtimeId = decorationsBySessionKey[sessionKey]?.runtimeId;

    if (runtimeId && liveSessionsByRuntimeId[runtimeId]) {
      return liveSessionsByRuntimeId[runtimeId];
    }

    return Object.values(liveSessionsByRuntimeId).find((entry) =>
      entry.session.provider_session_id === session.id
      && entry.session.provider === session.source,
    );
  }, [decorationsBySessionKey, liveSessionsByRuntimeId]);

  const shouldHydrateLiveEntryFromHistory = useCallback((entry: WorkspaceLiveSessionEntry | null | undefined) => {
    if (!entry?.session.provider_session_id) {
      return false;
    }

    if (entry.seedMessages.length > 0) {
      return false;
    }

    return entry.session.last_event_seq == null;
  }, []);

  const hydrateLiveEntryFromHistory = useCallback(async (
    session: NativeSessionSummary,
  ): Promise<ConversationMessageData[] | null> => {
    if (!session.provider_session_id || session.last_event_seq != null) {
      return null;
    }

    if (hydratingLiveRuntimeIdsRef.current.has(session.runtime_id)) {
      return null;
    }

    hydratingLiveRuntimeIdsRef.current.add(session.runtime_id);

    try {
      const { messages: historyMessages } = await fetchConversationDetail({
        id: session.provider_session_id,
        source: session.provider,
      });

      upsertLiveSessionEntry(session, {
        seedMessages: historyMessages,
      });

      return historyMessages;
    } catch (error) {
      console.error('Failed to hydrate live workspace session from history:', error);
      return null;
    } finally {
      hydratingLiveRuntimeIdsRef.current.delete(session.runtime_id);
    }
  }, [upsertLiveSessionEntry]);

  const ensureLiveEntryForSession = useCallback(async (
    session: HistorySessionItem,
  ): Promise<WorkspaceLiveSessionEntry | null> => {
    const existing = findLiveEntryForSession(session);
    if (existing) {
      const hydratedMessages = shouldHydrateLiveEntryFromHistory(existing)
        ? await hydrateLiveEntryFromHistory(existing.session)
        : null;
      return {
        ...existing,
        seedMessages: hydratedMessages ?? existing.seedMessages,
      };
    }

    const runtimeId = decorationsBySessionKey[toSessionKey(session)]?.runtimeId;
    const nativeSessions = await listNativeSessions();
    const matchingSession = nativeSessions
      .filter((nativeSession) => {
        if (!canRestoreWorkspaceLiveSession(nativeSession)) {
          return false;
        }

        if (runtimeId) {
          return nativeSession.runtime_id === runtimeId;
        }

        return nativeSession.provider_session_id === session.id
          && nativeSession.provider === session.source;
      })
      .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))[0];

    if (!matchingSession) {
      return null;
    }

    upsertLiveSessionEntry(matchingSession);
    const hydratedMessages = await hydrateLiveEntryFromHistory(matchingSession);
    return {
      session: matchingSession,
      initialPrompt: null,
      seedMessages: hydratedMessages ?? [],
    };
  }, [
    decorationsBySessionKey,
    findLiveEntryForSession,
    hydrateLiveEntryFromHistory,
    listNativeSessions,
    shouldHydrateLiveEntryFromHistory,
    upsertLiveSessionEntry,
  ]);

  useEffect(() => {
    if (!activeLiveEntry || !shouldHydrateLiveEntryFromHistory(activeLiveEntry)) {
      return;
    }

    void hydrateLiveEntryFromHistory(activeLiveEntry.session);
  }, [activeLiveEntry, hydrateLiveEntryFromHistory, shouldHydrateLiveEntryFromHistory]);

  const effectiveComposeDir = composeDir || selectedWorkingDir || defaultWorkingDir || null;
  const effectiveComposeDirLabel = effectiveComposeDir ? getProjectName(effectiveComposeDir) : null;

  const handleSelect = useCallback(
    async (session: HistorySessionItem) => {
      const key = toSessionKey(session);
      setSelectedKey(key);
      selectedKeyRef.current = key;

      const liveEntry = await ensureLiveEntryForSession(session);
      if (liveEntry && canRestoreWorkspaceLiveSession(liveEntry.session)) {
        setActiveLiveRuntimeId(liveEntry.session.runtime_id);
        setComposeDir(liveEntry.session.project_dir);
        setSelectedWorkingDir(liveEntry.session.project_dir);
        setWorkspaceMode('live');
        return;
      }

      setWorkspaceMode('history');
      await loadConversation(session, {
        resetBeforeLoad: true,
        showLoading: true,
      });
    },
    [ensureLiveEntryForSession, loadConversation, setSelectedWorkingDir]
  );

  const openComposer = useCallback((client: 'claude' | 'codex', dir?: string | null) => {
    setComposeProvider(client);
    setLaunchClient(client);
    setWorkspaceMode('compose');
    setSelectedKey(null);
    selectedKeyRef.current = null;
    if (dir) {
      setComposeDir(dir);
      setSelectedWorkingDir(dir);
    }
  }, [setLaunchClient, setSelectedWorkingDir]);

  const handleNewSession = useCallback(async (client: LaunchClient = 'claude') => {
    if (client === 'opencode') {
      try {
        let targetDir = effectiveComposeDir;
        if (!targetDir) {
          targetDir = await openDirectoryPicker();
        }
        await launchOpenCodeWeb(targetDir ?? null, currentEnv || null);
      } catch (error) {
        console.error('Failed to launch OpenCode Web UI:', error);
        toast.error(t('workspace.openCodeLaunchFailed'));
      }
      return;
    }

    openComposer(client, effectiveComposeDir);
  }, [
    currentEnv,
    effectiveComposeDir,
    launchOpenCodeWeb,
    openComposer,
    openDirectoryPicker,
    t,
  ]);

  const handlePickComposeDir = useCallback(async () => {
    try {
      const dir = await openDirectoryPicker();
      if (dir) {
        setComposeDir(dir);
        setSelectedWorkingDir(dir);
      }
    } catch (error) {
      console.error('Failed to open directory dialog:', error);
    }
  }, [openDirectoryPicker, setSelectedWorkingDir]);

  const handleCreateForProject = useCallback((projectPath: string) => {
    openComposer(composeProvider, projectPath);
  }, [composeProvider, openComposer]);

  const handleCreateNativeConversation = useCallback(async (payload?: ComposerSubmitPayload) => {
    const rawPrompt = payload?.text ?? composePrompt;
    const attachments = payload?.attachments ?? [];
    const prompt = buildComposerPromptText(rawPrompt, attachments);
    const images = extractComposerImagePayloads(attachments);
    const workingDir = effectiveComposeDir;
    if ((!prompt && images.length === 0) || !workingDir) {
      return false;
    }
    const previewPrompt = buildComposerPromptPreview(rawPrompt, attachments);

    const dispatch = resolveComposerDispatch({
      provider: composeProvider,
      prompt,
      permissionMode,
      planModeEnabled: composePlanModeEnabled,
    });

    setIsCreatingNativeSession(true);
    try {
      const summary = await createNativeSession({
        provider: composeProvider,
        envName: currentEnv,
        permMode: dispatch.permMode,
        workingDir,
        initialPrompt: dispatch.prompt,
        initialImages: images.length > 0 ? images : undefined,
      });

      upsertLiveSessionEntry(summary, {
        initialPrompt: previewPrompt,
        seedMessages: [],
      });
      setActiveLiveRuntimeId(summary.runtime_id);
      setWorkspaceMode('live');
      setComposePrompt('');
      setComposePlanModeEnabled(false);
      setSelectedWorkingDir(workingDir);
      scheduleWorkspaceRefresh(1200);
      return true;
    } catch (error) {
      console.error('Failed to create native workspace session:', error);
      toast.error(t('workspace.nativeCreateFailed'));
      return false;
    } finally {
      setIsCreatingNativeSession(false);
    }
  }, [
    buildComposerPromptPreview,
    buildComposerPromptText,
    extractComposerImagePayloads,
    composePrompt,
    composeProvider,
    composePlanModeEnabled,
    createNativeSession,
    currentEnv,
    effectiveComposeDir,
    permissionMode,
    scheduleWorkspaceRefresh,
    setSelectedWorkingDir,
    upsertLiveSessionEntry,
    t,
  ]);

  const handleContinueHistorySession = useCallback(async (payload?: ComposerSubmitPayload) => {
    if (!selectedSession) {
      return false;
    }

    if (selectedSession.source === 'opencode') {
      try {
        await launchOpenCodeWeb(selectedSession.project, selectedSession.envName ?? currentEnv ?? null);
      } catch (error) {
        console.error('Failed to launch OpenCode Web UI from history:', error);
        toast.error(t('workspace.openCodeLaunchFailed'));
      }
      return false;
    }

    const rawPrompt = payload?.text ?? historyComposerText;
    const attachments = payload?.attachments ?? [];
    const prompt = buildComposerPromptText(rawPrompt, attachments);
    const images = extractComposerImagePayloads(attachments);
    if ((!prompt && images.length === 0) || !selectedSession.project) {
      return false;
    }

    const provider = selectedSession.source;
    const previewPrompt = buildComposerPromptPreview(rawPrompt, attachments);
    const dispatch = resolveComposerDispatch({
      provider,
      prompt,
      permissionMode: historyPermMode,
      planModeEnabled: historyPlanModeEnabled,
    });
    setIsResumingHistorySession(true);

    try {
      const summary = await createNativeSession({
        provider,
        envName: historyEnv,
        permMode: dispatch.permMode,
        workingDir: selectedSession.project,
        initialPrompt: dispatch.prompt,
        initialImages: images.length > 0 ? images : undefined,
        providerSessionId: selectedSession.id,
      });

      setLaunchClient(provider);
      upsertLiveSessionEntry(summary, {
        initialPrompt: previewPrompt,
        seedMessages: messages,
      });
      setActiveLiveRuntimeId(summary.runtime_id);
      setWorkspaceMode('live');
      setHistoryComposerText('');
      setHistoryPlanModeEnabled(false);
      setSelectedWorkingDir(selectedSession.project);
      scheduleWorkspaceRefresh(1200);
      return true;
    } catch (error) {
      console.error('Failed to continue workspace history session:', error);
      toast.error(t('workspace.nativeCreateFailed'));
      return false;
    } finally {
      setIsResumingHistorySession(false);
    }
  }, [
    buildComposerPromptPreview,
    buildComposerPromptText,
    extractComposerImagePayloads,
    createNativeSession,
    historyEnv,
    historyPermMode,
    historyPlanModeEnabled,
    historyComposerText,
    launchOpenCodeWeb,
    messages,
    scheduleWorkspaceRefresh,
    selectedSession,
    setLaunchClient,
    setSelectedWorkingDir,
    upsertLiveSessionEntry,
    t,
  ]);

  const handleLiveSessionUpdate = useCallback((session: NativeSessionSummary) => {
    upsertLiveSessionEntry(session);
  }, [upsertLiveSessionEntry]);

  const selectedHistorySupportsInline = selectedSession?.source !== 'opencode';
  const liveSessionEntries = useMemo(
    () => Object.values(liveSessionsByRuntimeId),
    [liveSessionsByRuntimeId],
  );

  const shortcuts = useMemo(
    () => ({
      'meta+o': () => void handlePickComposeDir(),
      'meta+enter': () => {
        if (workspaceMode === 'history') {
          void handleContinueHistorySession();
          return;
        }
        void handleCreateNativeConversation();
      },
    }),
    [
      handleContinueHistorySession,
      handleCreateNativeConversation,
      handlePickComposeDir,
      workspaceMode,
    ]
  );
  useKeyboardShortcuts(isActive ? shortcuts : {});

  const renderComposeView = () => (
    <div className="flex h-full min-h-0 flex-col items-center px-8">
      <div className="flex flex-1 flex-col items-center justify-end">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src="/logo.png" alt="" aria-hidden="true" className="h-10 w-10 rounded-xl" />
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('workspace.composeTitle')}
          </h2>
          <button
            type="button"
            onClick={() => void handlePickComposeDir()}
            className="inline-flex items-center gap-1.5 text-2xl font-semibold tracking-tight text-muted-foreground transition-colors hover:text-foreground"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="max-w-[300px] truncate">
              {effectiveComposeDirLabel || t('workspace.composeSelectFolder')}
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-3xl">
        <WorkspaceSessionComposer
          value={composePrompt}
          onValueChange={setComposePrompt}
          onSubmit={handleCreateNativeConversation}
          placeholder={t('workspace.composePlaceholder')}
          canSubmit={!!composePrompt.trim() && !!effectiveComposeDir && !isCreatingNativeSession}
          isSubmitting={isCreatingNativeSession}
          submitLabel={t('workspace.composeSend')}
          loadingLabel={t('common.loading')}
          provider={composeProvider}
          installedSkills={workspaceInstalledSkills}
          workingDir={effectiveComposeDir}
          searchWorkspaceFiles={searchWorkspaceFiles}
          planModeEnabled={composePlanModeEnabled}
          onPlanModeEnabledChange={setComposePlanModeEnabled}
          codexInstalled={codexInstalled}
          opencodeInstalled={opencodeInstalled}
          onLaunchNewSession={handleNewSession}
          secondaryActions={(
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-full"
                    onClick={() => {
                      const prompt = composePrompt.trim() || undefined;
                      void launchClaudeCode(
                        effectiveComposeDir || undefined,
                        undefined,
                        composeProvider as LaunchClient,
                        currentEnv || undefined,
                        prompt,
                      );
                    }}
                  >
                    <TerminalSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('workspace.nativeOpenTerminal')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          controls={(
            <ComposerControls
              provider={composeProvider}
              envName={currentEnv}
              permMode={permissionMode}
              effort={composeEffort}
              environments={environments}
              onEnvChange={(value) => void switchEnvironment(value)}
              onPermModeChange={setPermissionMode}
              onEffortChange={setComposeEffort}
            />
          )}
        />
      </div>
      <div className="flex-1" />
    </div>
  );

  const renderHistoryView = () => {
    if (!selectedSession) {
      return null;
    }

    const historyProvider = selectedSession.source === 'codex' ? 'codex' : 'claude';

    return (
      <div className="flex h-full min-h-0 flex-col">
        <Suspense fallback={<DetailFallback />}>
          <LazyHistoryDetail
            key={toSessionKey(selectedSession)}
            selectedSession={selectedSession}
            messages={messages}
            segments={segments}
            activeSegment={activeSegment}
            onActiveSegmentChange={setActiveSegment}
            isLoadingMessages={isLoadingMessages}
          />
        </Suspense>

        <WorkspaceSessionComposer
          value={historyComposerText}
          onValueChange={setHistoryComposerText}
          onSubmit={handleContinueHistorySession}
          placeholder={
            selectedHistorySupportsInline
              ? t('workspace.composePlaceholder')
              : t('workspace.historyContinueUnsupported')
          }
          disabled={!selectedHistorySupportsInline}
          canSubmit={selectedHistorySupportsInline && !!historyComposerText.trim() && !isResumingHistorySession}
          isSubmitting={isResumingHistorySession}
          submitLabel={selectedHistorySupportsInline ? t('workspace.composeSend') : t('workspace.openCodeWeb')}
          loadingLabel={t('common.loading')}
          provider={historyProvider}
          installedSkills={workspaceInstalledSkills}
          workingDir={selectedSession.project || null}
          searchWorkspaceFiles={searchWorkspaceFiles}
          planModeEnabled={historyPlanModeEnabled}
          onPlanModeEnabledChange={selectedHistorySupportsInline ? setHistoryPlanModeEnabled : undefined}
          planModeAvailable={selectedHistorySupportsInline}
          codexInstalled={codexInstalled}
          opencodeInstalled={opencodeInstalled}
          onLaunchNewSession={handleNewSession}
          controls={(
            <ComposerControls
              provider={historyProvider}
              envName={historyEnv}
              permMode={historyPermMode}
              effort={historyEffort}
              environments={environments}
              onEnvChange={setHistoryEnv}
              onPermModeChange={setHistoryPermMode}
              onEffortChange={setHistoryEffort}
            />
          )}
          secondaryActions={selectedHistorySupportsInline ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-full"
                    onClick={() => {
                      void launchClaudeCode(
                        selectedSession.project || undefined,
                        selectedSession.id,
                        historyProvider as LaunchClient,
                        historyEnv,
                      )
                        .then(() => toast.success(t('workspace.nativeHandoffDone')))
                        .catch(() => toast.error(t('workspace.nativeHandoffFailed')));
                    }}
                  >
                    <TerminalSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t('workspace.nativeOpenTerminal')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        />
      </div>
    );
  };

  if (isLoadingEnvs || isLoadingStats) {
    return <WorkspaceSkeleton />;
  }

  return (
    <div className="page-transition-enter flex h-full flex-col">
      <WorkspaceStatusStrip onNavigate={onNavigate} />

      <div className="workspace-main-container mx-3 mb-3 flex min-h-0 flex-1 overflow-hidden">
        <ProjectTree
          sessions={sessions}
          environmentByName={environmentByName}
          decorationsBySessionKey={decorationsBySessionKey}
          isLoading={isLoadingSessions}
          isRefreshing={isRefreshing}
          selectedKey={selectedKey}
          onSelect={handleSelect}
          onNewSession={handleNewSession}
          onRefresh={() => {
            void refreshWorkspaceData({
              force: true,
              silent: false,
              includeSelectedConversation: true,
            });
          }}
          codexInstalled={codexInstalled}
          opencodeInstalled={opencodeInstalled}
          onSaveTitle={async (session, title) => {
            await setSessionTitle(session.source, session.id, title);
          }}
          onSessionsChanged={async () => {
            invalidateHistoryCache();
            const refreshed = await fetchHistorySessions('all', true);
            setSessions(refreshed);
          }}
          onCreateForProject={handleCreateForProject}
        />

        <div className="workspace-reading-surface flex min-w-0 flex-1 flex-col overflow-hidden">
          {workspaceMode === 'history' && selectedSession
            ? renderHistoryView()
            : workspaceMode === 'compose' || (workspaceMode === 'live' && !activeLiveEntry)
              ? renderComposeView()
              : null}

          {liveSessionEntries.length > 0 ? (
            <div
              className={cn(
                'relative min-h-0 flex-1 overflow-hidden',
                workspaceMode === 'live' && activeLiveEntry ? 'block' : 'hidden',
              )}
            >
              {liveSessionEntries.map((entry) => {
                const isActiveLiveEntry = workspaceMode === 'live'
                  && activeLiveEntry?.session.runtime_id === entry.session.runtime_id;
                return (
                  <div
                    key={entry.session.runtime_id}
                    className={cn(
                      'absolute inset-0 min-h-0',
                      isActiveLiveEntry ? 'block' : 'hidden',
                    )}
                  >
                    <WorkspaceNativeSessionView
                      session={entry.session}
                      initialPrompt={entry.initialPrompt}
                      seedMessages={entry.seedMessages}
                      installedSkills={workspaceInstalledSkills}
                      isVisible={isActiveLiveEntry}
                      onSessionUpdate={handleLiveSessionUpdate}
                      codexInstalled={codexInstalled}
                      opencodeInstalled={opencodeInstalled}
                      onLaunchNewSession={handleNewSession}
                      onStartNew={() => {
                        setWorkspaceMode('compose');
                        setActiveLiveRuntimeId(null);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
