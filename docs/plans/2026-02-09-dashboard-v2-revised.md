# Dashboard v2 — Revised Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Rewrite the Dashboard (Home) page content to replace the current 4-section project list + oversized launch center with a compact LaunchStrip + deduplicated RecentProjects grid + PulseBar — achieving "1 click to continue last project."

**Architecture:** Keep existing AppLayout/SideRail/PageHeader unchanged. Adapt the 3 orphaned dashboard components (CurrentEnvCard → LaunchStrip, SessionsCard → removed from dashboard, StatsCard → PulseBar stat items). New RecentProjects component merges all 4 project sources (favorites/recent/vscode/jetbrains) with path-based deduplication. All strings via `t()`, all colors via semantic tokens.

**Tech Stack:** React 18, Tailwind CSS, Zustand, Tauri v2, Lucide icons, `useLocale()` for i18n, `useCountUp` for animations.

**Key Design Decisions (from argue rounds):**
- Project card click = **Direct Launch** (1 click, uses current env+perm)
- No Rocket icon on launch button (taste spec)
- Native `<select>` for env/perm dropdowns (taste spec)
- Stat cards kept as `grid-cols-3` (taste spec) — moved to PulseBar compact row
- Max 6 projects visible at 880×640 minimum window

**Source Specs:**
- `docs/plans/2026-02-08-product-design-taste-spec.md` (interaction weights, personality)
- `docs/plans/2026-02-09-dashboard-v2-implementation.md` (original spec, partially superseded)
- `docs/plans/2026-02-09-dashboard-redesign-team.md` (team debate report)

---

## Final Layout

```
+--+--------------------------------------------------------------+
|  | PageHeader: "Dashboard"                                [48px] |
|S |--------------------------------------------------------------|
|i |                                                               |
|d | LAUNCH STRIP  (h-14, rounded-xl, env color left border)      |
|e | ┌───────────────────────────────────────────────────────────┐ |
|R | │▌ [official ▾] │ [dev ▾] │ 📁 ccem          [启动]       │ |
|a | └───────────────────────────────────────────────────────────┘ |
|i |                                                               |
|l | 最近项目                                                      |
|  | ┌───────────────────────────────────────────────────────────┐ |
|6 | │  ★ HERO CARD (col-span-2)                                │ |
|4 | │  claude-code-env-manager · ~/G/Github/ccem · 2h ago      │ |
|p | │  ● 运行中                                    [▶ 继续]    │ |
|x | └───────────────────────────────────────────────────────────┘ |
|  | ┌──────────────────────┐  ┌──────────────────────┐           |
|  | │ my-website           │  │ api-server           │           |
|  | │ ~/Projects/web · 3d  │  │ ~/Projects/api · 5d  │           |
|  | └──────────────────────┘  └──────────────────────┘           |
|  |                                                               |
|  | PULSE BAR (text-sm, bg-muted/30)                             |
|  | ┌───────────────────────────────────────────────────────────┐ |
|  | │  12.4K tokens · $1.23 today · 2 sessions active  详情 >  │ |
|  | └───────────────────────────────────────────────────────────┘ |
|  |                                                               |
+--+--------------------------------------------------------------+
```

---

## Task 1: Extract Shared Utilities

**Files:**
- Modify: `apps/desktop/src/lib/utils.ts`

**What to do:**

Extract `formatRelativeTime`, `truncatePath`, and `getProjectName` from `ProjectList.tsx` into `lib/utils.ts` so they can be reused by the new dashboard components.

```ts
// Add to existing utils.ts (which currently only has cn())

export function getProjectName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

export function truncatePath(path: string): string {
  const home = '/Users/';
  if (path.startsWith(home)) {
    const afterHome = path.substring(home.length);
    const firstSlash = afterHome.indexOf('/');
    if (firstSlash > 0) {
      return '~/' + afterHome.substring(firstSlash + 1);
    }
  }
  return path.length > 40 ? '...' + path.slice(-37) : path;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}
```

Then update `ProjectList.tsx` to import these from `@/lib/utils` instead of defining them locally.

**Test:** `pnpm run build` in `apps/desktop/` succeeds. App still works.

**Commit:** `refactor: extract project utilities to shared lib/utils`

---

## Task 2: Add New i18n Keys

**Files:**
- Modify: `apps/desktop/src/locales/zh.json`
- Modify: `apps/desktop/src/locales/en.json`

**What to do:**

Add new keys needed for LaunchStrip, RecentProjects, PulseBar. Keep existing keys unchanged — they are still used by the current Dashboard during transition.

Add to `dashboard` namespace in both files:

```json
// zh.json additions to "dashboard":
"launchBtn": "启动",
"launchBtnDone": "已启动 ✓",
"selectDirPlaceholder": "选择目录...",
"continueWork": "继续工作",
"noProjects": "还没有项目记录",
"selectDirToStart": "选择一个目录开始",
"viewAll": "查看全部 →",
"tokensToday": "tokens",
"costToday": "today",
"sessionsActive": "sessions active",
"details": "详情 →",
"heroRunning": "运行中",
"heroSessions": "个会话"
```

```json
// en.json additions to "dashboard":
"launchBtn": "Launch",
"launchBtnDone": "Launched ✓",
"selectDirPlaceholder": "Select directory...",
"continueWork": "Continue",
"noProjects": "No projects yet",
"selectDirToStart": "Select a directory to start",
"viewAll": "View all →",
"tokensToday": "tokens",
"costToday": "today",
"sessionsActive": "sessions active",
"details": "Details →",
"heroRunning": "running",
"heroSessions": "sessions"
```

**Test:** `pnpm run build` succeeds. No TypeScript errors.

**Commit:** `feat(i18n): add dashboard v2 translation keys`

---

## Task 3: Rewrite LaunchStrip (adapt CurrentEnvCard)

**Files:**
- Rewrite: `apps/desktop/src/components/dashboard/CurrentEnvCard.tsx` → rename to `LaunchStrip.tsx`
- Modify: `apps/desktop/src/components/dashboard/index.ts`

**What to build:**

Replace the CurrentEnvCard (tall card with API details) with a horizontal LaunchStrip (single row, h-14). This is the core innovation from the argue rounds.

```tsx
// LaunchStrip.tsx
import { FolderOpen, ChevronDown, Globe, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/locales';
import { getProjectName } from '@/lib/utils';
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';

interface LaunchStripProps {
  currentEnv: string;
  environments: { name: string }[];
  permissionMode: PermissionModeName;
  selectedWorkingDir: string | null;
  launched: boolean;
  onSwitchEnv: (name: string) => void;
  onSetPermMode: (mode: PermissionModeName) => void;
  onSelectDir: () => void;
  onLaunch: () => void;
}

function getEnvColorClass(envName: string): string {
  const lower = envName.toLowerCase();
  if (lower === 'official') return 'bg-chart-1';
  if (lower.includes('glm')) return 'bg-chart-2';
  if (lower.includes('deepseek')) return 'bg-chart-3';
  if (lower.includes('kimi')) return 'bg-chart-4';
  if (lower.includes('minimax')) return 'bg-chart-5';
  return 'bg-primary';
}

export function LaunchStrip({
  currentEnv,
  environments,
  permissionMode,
  selectedWorkingDir,
  launched,
  onSwitchEnv,
  onSetPermMode,
  onSelectDir,
  onLaunch,
}: LaunchStripProps) {
  const { t } = useLocale();

  return (
    <div className="h-14 flex items-center gap-0 rounded-xl bg-card border border-border overflow-hidden">
      {/* Environment color bar */}
      <div className={`w-[3px] self-stretch ${getEnvColorClass(currentEnv)}`} />

      {/* Environment badge + native select */}
      <div className="flex items-center gap-2 px-4 border-r border-border/50">
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
            <Globe className="w-3.5 h-3.5" />
            {currentEnv}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </div>
          <select
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={currentEnv}
            onChange={(e) => onSwitchEnv(e.target.value)}
          >
            {environments.map(env => (
              <option key={env.name} value={env.name}>{env.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Permission badge + native select */}
      <div className="flex items-center gap-2 px-4 border-r border-border/50">
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-chart-4/10 text-chart-4">
            <Shield className="w-3.5 h-3.5" />
            {permissionMode}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </div>
          <select
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={permissionMode}
            onChange={(e) => onSetPermMode(e.target.value as PermissionModeName)}
          >
            {Object.keys(PERMISSION_PRESETS).map((mode) => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory section */}
      <div className="flex-1 flex items-center gap-2 px-4 min-w-0">
        <button
          onClick={onSelectDir}
          className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground hover:text-foreground transition-colors"
          title={selectedWorkingDir || t('dashboard.selectDirPlaceholder')}
        >
          <FolderOpen className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            {selectedWorkingDir
              ? getProjectName(selectedWorkingDir)
              : t('dashboard.selectDirPlaceholder')}
          </span>
        </button>
      </div>

      {/* Launch button — NO Rocket icon (taste spec) */}
      <Button
        onClick={onLaunch}
        title={t('dashboard.launchShortcut')}
        className="h-14 px-6 rounded-none rounded-r-xl gap-2 font-medium text-sm shadow-none hover:shadow-none active:translate-y-0.5 active:shadow-md transition-all duration-150"
      >
        {launched ? t('dashboard.launchBtnDone') : t('dashboard.launchBtn')}
      </Button>
    </div>
  );
}
```

**Update index.ts barrel:**
```ts
export { LaunchStrip } from './LaunchStrip';
export { StatsCard } from './StatsCard';
export { SessionsCard } from './SessionsCard';
```

**Delete the old file:** `CurrentEnvCard.tsx`

**Test:** `pnpm run build` succeeds. No import errors.

**Commit:** `feat(dashboard): replace CurrentEnvCard with LaunchStrip`

---

## Task 4: Build RecentProjects with Smart Merge

**Files:**
- Create: `apps/desktop/src/components/dashboard/RecentProjects.tsx`
- Modify: `apps/desktop/src/components/dashboard/index.ts`

**What to build:**

The core project deduplication component. Merges all 4 project sources into a single list, deduplicated by path, with a hero card for the most recent project.

```tsx
// RecentProjects.tsx
import { Star, Play, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/locales';
import { getProjectName, truncatePath, formatRelativeTime } from '@/lib/utils';
import type { Session } from '@/store';

// Types from store
interface FavoriteProject { path: string; name: string; }
interface RecentProject { path: string; lastUsed: string; }
interface VSCodeProject { path: string; syncedAt: string; }
interface JetBrainsProject { path: string; ide: string; syncedAt: string; }

interface MergedProject {
  path: string;
  name: string;
  lastUsed: string | null;
  isFavorite: boolean;
  hasActiveSession: boolean;
  source: 'favorite' | 'recent' | 'vscode' | 'jetbrains';
}

interface RecentProjectsProps {
  favorites: FavoriteProject[];
  recent: RecentProject[];
  vscodeProjects: VSCodeProject[];
  jetbrainsProjects: JetBrainsProject[];
  sessions: Session[];
  onLaunch: (workingDir: string) => void;
  onSelectDir: () => void;
  onNavigate: (tab: string) => void;
}

function mergeProjects(
  favorites: FavoriteProject[],
  recent: RecentProject[],
  vscodeProjects: VSCodeProject[],
  jetbrainsProjects: JetBrainsProject[],
  sessions: Session[],
): MergedProject[] {
  const merged = new Map<string, MergedProject>();
  const activePaths = new Set(
    sessions.filter(s => s.status === 'running').map(s => s.workingDir)
  );

  // Add favorites first (pinned)
  for (const fav of favorites) {
    merged.set(fav.path, {
      path: fav.path,
      name: fav.name,
      lastUsed: null,
      isFavorite: true,
      hasActiveSession: activePaths.has(fav.path),
      source: 'favorite',
    });
  }

  // Add recent — update favorites with lastUsed if overlap
  for (const rec of recent) {
    const existing = merged.get(rec.path);
    if (existing) {
      existing.lastUsed = rec.lastUsed;
    } else {
      merged.set(rec.path, {
        path: rec.path,
        name: getProjectName(rec.path),
        lastUsed: rec.lastUsed,
        isFavorite: false,
        hasActiveSession: activePaths.has(rec.path),
        source: 'recent',
      });
    }
  }

  // Add VSCode projects — only if not already present
  for (const vs of vscodeProjects) {
    if (!merged.has(vs.path)) {
      merged.set(vs.path, {
        path: vs.path,
        name: getProjectName(vs.path),
        lastUsed: vs.syncedAt,
        isFavorite: false,
        hasActiveSession: activePaths.has(vs.path),
        source: 'vscode',
      });
    }
  }

  // Add JetBrains projects — only if not already present
  for (const jb of jetbrainsProjects) {
    if (!merged.has(jb.path)) {
      merged.set(jb.path, {
        path: jb.path,
        name: getProjectName(jb.path),
        lastUsed: jb.syncedAt,
        isFavorite: false,
        hasActiveSession: activePaths.has(jb.path),
        source: 'jetbrains',
      });
    }
  }

  // Sort: most recently used first, favorites with no lastUsed go to end of favorites
  return Array.from(merged.values())
    .sort((a, b) => {
      if (!a.lastUsed && !b.lastUsed) return 0;
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    })
    .slice(0, 6); // Max 6 projects
}

export function RecentProjects({
  favorites,
  recent,
  vscodeProjects,
  jetbrainsProjects,
  sessions,
  onLaunch,
  onSelectDir,
  onNavigate,
}: RecentProjectsProps) {
  const { t } = useLocale();
  const mergedProjects = mergeProjects(
    favorites, recent, vscodeProjects, jetbrainsProjects, sessions
  );

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {t('dashboard.recentProjects')}
        </h3>
        {mergedProjects.length > 0 && (
          <button
            onClick={() => onNavigate('environments')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('dashboard.viewAll')}
          </button>
        )}
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-2 gap-3">
        {mergedProjects.length === 0 ? (
          /* Empty state */
          <div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.noProjects')}
            </p>
            <Button variant="outline" size="sm" onClick={onSelectDir}>
              <FolderOpen className="w-4 h-4 mr-2" />
              {t('dashboard.selectDirToStart')}
            </Button>
          </div>
        ) : (
          <>
            {/* Hero card: first project, col-span-2 */}
            <HeroProjectCard
              project={mergedProjects[0]}
              onLaunch={onLaunch}
            />
            {/* Remaining cards */}
            {mergedProjects.slice(1).map(project => (
              <ProjectCard
                key={project.path}
                project={project}
                onLaunch={onLaunch}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* --- Hero Project Card (col-span-2) --- */

function HeroProjectCard({
  project,
  onLaunch,
}: {
  project: MergedProject;
  onLaunch: (path: string) => void;
}) {
  const { t } = useLocale();

  return (
    <div
      className="col-span-2 bg-card border border-border rounded-xl p-4
        border-l-[3px] border-l-primary hover:border-primary/30
        transition-colors cursor-pointer group"
      onClick={() => onLaunch(project.path)}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {project.isFavorite && (
              <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            )}
            <span className="font-medium text-foreground truncate">
              {project.name}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {truncatePath(project.path)}
            {project.lastUsed && (
              <> · {formatRelativeTime(project.lastUsed)}</>
            )}
          </div>
          {project.hasActiveSession && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {t('dashboard.heroRunning')}
            </div>
          )}
        </div>
        <Button
          size="sm"
          className="opacity-80 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onLaunch(project.path); }}
        >
          <Play className="w-3.5 h-3.5 mr-1.5" />
          {t('dashboard.continueWork')}
        </Button>
      </div>
    </div>
  );
}

/* --- Regular Project Card --- */

function ProjectCard({
  project,
  onLaunch,
}: {
  project: MergedProject;
  onLaunch: (path: string) => void;
}) {
  return (
    <div
      className="bg-card border border-border rounded-xl p-3
        hover:border-primary/30 transition-colors cursor-pointer group"
      onClick={() => onLaunch(project.path)}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {project.isFavorite && (
              <Star className="w-3 h-3 text-primary fill-primary flex-shrink-0" />
            )}
            {project.hasActiveSession && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
            )}
            <span className="text-sm font-medium text-foreground truncate">
              {project.name}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {truncatePath(project.path)}
            {project.lastUsed && (
              <> · <span className="text-primary/70">{formatRelativeTime(project.lastUsed)}</span></>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={(e) => { e.stopPropagation(); onLaunch(project.path); }}
        >
          <Play className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
```

**Update index.ts barrel:**
```ts
export { LaunchStrip } from './LaunchStrip';
export { RecentProjects } from './RecentProjects';
export { StatsCard } from './StatsCard';
export { SessionsCard } from './SessionsCard';
```

**Test:** `pnpm run build` succeeds.

**Commit:** `feat(dashboard): add RecentProjects with smart merge deduplication`

---

## Task 5: Adapt StatsCard → PulseBar

**Files:**
- Rewrite: `apps/desktop/src/components/dashboard/StatsCard.tsx` → rename to `PulseBar.tsx`
- Modify: `apps/desktop/src/components/dashboard/index.ts`

**What to build:**

Replace the tall stats card with a compact single-row PulseBar at the bottom of the dashboard. Shows tokens, cost, session count in one horizontal line with a "Details →" link to Analytics.

```tsx
// PulseBar.tsx
import { useLocale } from '@/locales';
import { formatTokens } from '@/lib/utils';

interface PulseBarProps {
  totalTokens: number;
  todayCost: number;
  sessionCount: number;
  onNavigate: (tab: string) => void;
}

export function PulseBar({
  totalTokens,
  todayCost,
  sessionCount,
  onNavigate,
}: PulseBarProps) {
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-muted/30">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          {formatTokens(totalTokens)} {t('dashboard.tokensToday')}
        </span>
        <span className="text-border">·</span>
        <span>
          ${todayCost.toFixed(2)} {t('dashboard.costToday')}
        </span>
        <span className="text-border">·</span>
        <span className="flex items-center gap-1.5">
          {sessionCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
          {sessionCount} {t('dashboard.sessionsActive')}
        </span>
      </div>
      <button
        onClick={() => onNavigate('analytics')}
        className="text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        {t('dashboard.details')}
      </button>
    </div>
  );
}
```

**Delete the old file:** `StatsCard.tsx`

**Update index.ts barrel:**
```ts
export { LaunchStrip } from './LaunchStrip';
export { RecentProjects } from './RecentProjects';
export { PulseBar } from './PulseBar';
export { SessionsCard } from './SessionsCard';
```

**Note:** `SessionsCard` stays exported — it might be used by the Sessions page or removed later. We don't touch it now.

**Test:** `pnpm run build` succeeds.

**Commit:** `feat(dashboard): replace StatsCard with PulseBar`

---

## Task 6: Rewrite Dashboard.tsx

**Files:**
- Rewrite: `apps/desktop/src/pages/Dashboard.tsx`

**What to build:**

Complete rewrite of the Dashboard page using the new components. Removes the old status bar, big launch button, env/perm selects, stat cards, and ProjectList. Replaces with LaunchStrip → RecentProjects → PulseBar.

```tsx
// Dashboard.tsx
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import { useCountUp } from '@/hooks/useCountUp';
import { useLocale } from '@/locales';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { DashboardSkeleton } from '@/components/ui/skeleton-states';
import { LaunchStrip, RecentProjects, PulseBar } from '@/components/dashboard';
import type { PermissionModeName } from '@ccem/core/browser';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onLaunch: () => void;
  onLaunchWithDir: (dir: string) => void;
}

export function Dashboard({ onNavigate, onLaunch, onLaunchWithDir }: DashboardProps) {
  const { t } = useLocale();

  const {
    currentEnv,
    environments,
    permissionMode,
    setPermissionMode,
    selectedWorkingDir,
    sessions,
    usageStats,
    favorites,
    recent,
    vscodeProjects,
    jetbrainsProjects,
    setSelectedWorkingDir,
    isLoadingEnvs,
    isLoadingStats,
  } = useAppStore();

  const { openDirectoryPicker, switchEnvironment } = useTauriCommands();

  // Launch success feedback — "Launched ✓" for 1 second
  const [launched, setLaunched] = useState(false);
  const launchedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (launchedTimerRef.current) {
        clearTimeout(launchedTimerRef.current);
      }
    };
  }, []);

  // FTUE flags
  const showAddEnvsLink = environments.length <= 1 && !localStorage.getItem('ccem-ftue-envs-added');

  const handleSelectDirectory = useCallback(async () => {
    try {
      const dir = await openDirectoryPicker();
      if (dir) {
        setSelectedWorkingDir(dir);
      }
    } catch (err) {
      console.error('Failed to open directory dialog:', err);
    }
  }, [openDirectoryPicker, setSelectedWorkingDir]);

  // Dashboard-specific keyboard shortcuts
  const dashboardShortcuts = useMemo(() => ({
    'meta+o': () => handleSelectDirectory(),
  }), [handleSelectDirectory]);

  useKeyboardShortcuts(dashboardShortcuts);

  // Stats for PulseBar (computed before skeleton check for useCountUp hooks)
  const todayTokensRaw = (usageStats?.today.inputTokens ?? 0) + (usageStats?.today.outputTokens ?? 0);
  const todayCostRaw = usageStats?.today.cost ?? 0;
  const runningCount = sessions.filter(s => s.status === 'running').length;

  // Count-up animations (hooks must be called unconditionally)
  const animatedTokens = useCountUp(todayTokensRaw);
  const animatedCostCents = useCountUp(Math.round(todayCostRaw * 100));

  const handleLaunchClick = useCallback(() => {
    if (selectedWorkingDir) {
      onLaunchWithDir(selectedWorkingDir);
    } else {
      onLaunch();
    }
    // Set FTUE launched flag
    localStorage.setItem('ccem-ftue-launched', 'true');

    // Show "Launched ✓" feedback for 1 second
    if (launchedTimerRef.current) {
      clearTimeout(launchedTimerRef.current);
    }
    setLaunched(true);
    launchedTimerRef.current = setTimeout(() => {
      setLaunched(false);
      launchedTimerRef.current = null;
    }, 1000);
  }, [selectedWorkingDir, onLaunch, onLaunchWithDir]);

  // Direct launch from project card — uses current env+perm, sets workingDir
  const handleProjectLaunch = useCallback((workingDir: string) => {
    setSelectedWorkingDir(workingDir);
    onLaunchWithDir(workingDir);
    // Set FTUE launched flag
    localStorage.setItem('ccem-ftue-launched', 'true');
  }, [onLaunchWithDir, setSelectedWorkingDir]);

  // Show skeleton when loading
  if (isLoadingEnvs || isLoadingStats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="page-transition-enter space-y-5">
      {/* Launch Strip */}
      <LaunchStrip
        currentEnv={currentEnv}
        environments={environments}
        permissionMode={permissionMode}
        selectedWorkingDir={selectedWorkingDir}
        launched={launched}
        onSwitchEnv={switchEnvironment}
        onSetPermMode={setPermissionMode}
        onSelectDir={handleSelectDirectory}
        onLaunch={handleLaunchClick}
      />

      {/* FTUE: Add more environments link */}
      {showAddEnvsLink && (
        <button
          className="text-sm text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
          onClick={() => onNavigate('environments')}
        >
          {t('dashboard.addMoreEnvs')}
        </button>
      )}

      {/* Recent Projects (deduplicated) */}
      <RecentProjects
        favorites={favorites}
        recent={recent}
        vscodeProjects={vscodeProjects}
        jetbrainsProjects={jetbrainsProjects}
        sessions={sessions}
        onLaunch={handleProjectLaunch}
        onSelectDir={handleSelectDirectory}
        onNavigate={onNavigate}
      />

      {/* Pulse Bar */}
      <PulseBar
        totalTokens={animatedTokens}
        todayCost={animatedCostCents / 100}
        sessionCount={runningCount}
        onNavigate={onNavigate}
      />
    </div>
  );
}
```

**Removed from old Dashboard:**
- Status bar (env badge + perm badge + session count) → absorbed into LaunchStrip
- `py-6` big launch button center → replaced by LaunchStrip
- Native `<select>` env/perm controls (standalone) → moved inside LaunchStrip
- `grid-cols-3` stat cards → replaced by PulseBar
- `<ProjectList />` component → replaced by `<RecentProjects />`
- `AmberDot` component → removed (FTUE amber dots were on stat cards; PulseBar is simpler)

**Kept:**
- Skeleton loading via `DashboardSkeleton`
- `useCountUp` for animated stat values
- `useKeyboardShortcuts` for Cmd+O
- FTUE "add more environments" link
- Launch feedback ("Launched ✓" for 1s)

**Test:** `pnpm run build` succeeds. App renders new Dashboard.

**Commit:** `feat(dashboard): rewrite with LaunchStrip + RecentProjects + PulseBar`

---

## Task 7: Update DashboardSkeleton

**Files:**
- Modify: `apps/desktop/src/components/ui/skeleton-states.tsx`

**What to do:**

Update `DashboardSkeleton` to match the new Dashboard layout (LaunchStrip → project grid → PulseBar) instead of the old layout (status bar → button → stat cards → project list).

```tsx
// Replace existing DashboardSkeleton with:
export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* LaunchStrip skeleton */}
      <div className="h-14 rounded-xl bg-card border border-border skeleton-shimmer" />

      {/* Recent Projects skeleton */}
      <div>
        <div className="h-4 w-24 rounded bg-muted skeleton-shimmer mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {/* Hero card skeleton */}
          <div className="col-span-2 h-24 rounded-xl bg-card border border-border skeleton-shimmer" />
          {/* Regular card skeletons */}
          <div className="h-16 rounded-xl bg-card border border-border skeleton-shimmer" />
          <div className="h-16 rounded-xl bg-card border border-border skeleton-shimmer" />
        </div>
      </div>

      {/* PulseBar skeleton */}
      <div className="h-10 rounded-lg bg-muted/30 skeleton-shimmer" />
    </div>
  );
}
```

**Test:** Temporarily set `isLoadingEnvs` to true in store. Screenshot — should show shimmer blocks matching new layout.

**Commit:** `fix(dashboard): update skeleton to match new layout`

---

## Task 8: Cleanup Orphaned Imports + Build Verify

**Files:**
- Modify: `apps/desktop/src/components/dashboard/index.ts` (final barrel)
- Delete: `apps/desktop/src/components/dashboard/CurrentEnvCard.tsx` (if not done in Task 3)
- Delete: `apps/desktop/src/components/dashboard/StatsCard.tsx` (if not done in Task 5)
- Verify: `apps/desktop/src/components/projects/ProjectList.tsx` still works (it's used by other pages or kept for reference)

**What to do:**

1. Ensure the barrel export only exports active components:
   ```ts
   export { LaunchStrip } from './LaunchStrip';
   export { RecentProjects } from './RecentProjects';
   export { PulseBar } from './PulseBar';
   ```

2. Update `ProjectList.tsx` to import utilities from `@/lib/utils`:
   ```ts
   import { getProjectName, truncatePath, formatRelativeTime } from '@/lib/utils';
   ```
   Remove the local definitions of these functions.

3. Run `pnpm run build` in `apps/desktop/` — must succeed with zero errors.

4. Grep for any remaining references to deleted components:
   ```bash
   grep -r "CurrentEnvCard\|StatsCard" apps/desktop/src/ --include="*.tsx" --include="*.ts"
   ```
   Should return zero results (except the deleted files themselves).

5. Check no hardcoded Chinese strings in new components (all should use `t()`).

6. Check no hardcoded colors like `slate-`, `emerald-`, `blue-600` in new components.

**Test:** Full build succeeds. No orphaned imports. App runs.

**Commit:** `chore(dashboard): cleanup orphaned imports and barrel exports`

---

## Execution Order & Dependencies

```
Task 1 (Extract utils)          FIRST — no deps
    │
Task 2 (i18n keys)              Can be parallel with Task 1
    │
Task 3 (LaunchStrip)            Depends on Task 1 + 2
    │
Task 4 (RecentProjects)         Depends on Task 1 + 2
    │
Task 5 (PulseBar)               Depends on Task 1 + 2
    │
Task 6 (Rewrite Dashboard)      Depends on Tasks 3 + 4 + 5
    │
Task 7 (Update Skeleton)        Depends on Task 6
    │
Task 8 (Cleanup + Verify)       LAST
```

Tasks 3, 4, 5 can be done in parallel after Tasks 1+2 are complete.

---

## Vertical Space Budget (880×640 minimum window)

| Element | Height |
|---------|--------|
| PageHeader | 48px |
| py-6 top padding (AppLayout) | 24px |
| LaunchStrip | 56px (h-14) |
| FTUE link (optional) | ~20px |
| gap (space-y-5) | 20px |
| "最近项目" header | 28px |
| Hero card | ~96px |
| gap | 12px |
| 2 regular cards | ~64px |
| gap | 20px |
| PulseBar | 40px |
| py-6 bottom padding | 24px |
| **Total** | **~452px** ✅ (under 640 - 48 = 592px content area) |

140px of safety margin. Even with FTUE link showing, everything fits.

---

## What's NOT in This Plan

These are handled by other tasks in `taste-spec-implementation.md`:
- i18n infrastructure (Task 1 there — already done)
- Keyboard shortcuts beyond Cmd+O (Task 15)
- FTUE amber dots and ghost cards (Task 11)
- Delight moments — count-up is already integrated via `useCountUp`
- Launch button physical response — CSS `active:` classes already in LaunchStrip

---

## Self-Test Protocol

After ALL tasks complete:

1. `pnpm run build` in `apps/desktop/` — zero errors
2. Launch app with `cd apps/desktop && pnpm tauri dev`
3. Screenshot Dashboard — verify:
   - LaunchStrip shows env badge + perm badge + dir + launch button
   - No Rocket icon on launch button
   - Recent Projects shows deduplicated list (no project appears twice)
   - Hero card for most recent project with col-span-2
   - PulseBar at bottom with tokens/cost/sessions
4. Click a project card → Claude Code launches immediately with current env/perm
5. Switch locale to `en` in Settings → verify all Dashboard text is English
6. Resize to 880×640 → verify everything fits without scrolling
