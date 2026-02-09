# CCEM Desktop App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the 6-tab desktop app architecture based on the design document, transforming the current 4-tab structure into a comprehensive environment management and analytics platform.

**Architecture:**
- Frontend: React + TypeScript + Tailwind CSS + Zustand (state management)
- Backend: Tauri (Rust) with existing session management and config system
- Key Changes: Delete Permissions page, add Sessions and Analytics tabs, merge permissions into Environments, refactor Dashboard to be a launch center

**Tech Stack:**
- React 18 + TypeScript
- Tauri 2.x (Rust backend)
- Zustand (state management)
- Radix UI (component primitives)
- Tailwind CSS (styling)
- Recharts (for Analytics charts)
- Lucide React (icons)

**Current State:**
- ✅ 4 tabs exist: Dashboard, Environments, Permissions, Settings
- ✅ Session management backend (Rust) with focus/minimize/close
- ✅ Environment CRUD operations
- ✅ Working directory management with favorites/recent
- ❌ No Analytics/usage tracking
- ❌ No Sessions tab (sessions shown in Dashboard)
- ❌ Permissions not integrated into Environments

**Target State:**
- 6 tabs: Home, Sessions, Environments, Analytics, Skills, Settings
- Permissions merged into Environments tab
- Dashboard renamed to Home and simplified
- New Sessions tab with card/list views
- New Analytics tab with charts and heatmaps

---

## Phase 1: Preparation & Cleanup

### Task 1: Install Required Dependencies

**Files:**
- Modify: `apps/desktop/package.json`

**Step 1: Add chart library dependency**

```bash
cd apps/desktop
pnpm add recharts
pnpm add -D @types/recharts
```

**Step 2: Verify installation**

Run: `pnpm list recharts`
Expected: Shows recharts version installed

**Step 3: Commit**

```bash
git add apps/desktop/package.json apps/desktop/pnpm-lock.yaml
git commit -m "chore(desktop): add recharts for Analytics charts"
```

---

### Task 2: Create Type Definitions for Analytics

**Files:**
- Create: `apps/desktop/src/types/analytics.ts`

**Step 1: Create analytics types file**

```typescript
// apps/desktop/src/types/analytics.ts

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface TokenUsageWithCost extends TokenUsage {
  cost: number;
}

export interface UsageStats {
  today: TokenUsageWithCost;
  week: TokenUsageWithCost;
  month: TokenUsageWithCost;
  total: TokenUsageWithCost;
  dailyHistory: Record<string, TokenUsageWithCost>; // key: YYYY-MM-DD
  byModel: Record<string, TokenUsageWithCost>;
  byEnvironment: Record<string, TokenUsageWithCost>;
  lastUpdated: string;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  tokens: number;
  cost: number;
  level: 0 | 1 | 2 | 3 | 4; // 0=none, 1=low, 2=medium, 3=high, 4=very high
}

export interface Milestone {
  id: string;
  type: 'tokens' | 'cost' | 'streak' | 'savings';
  title: string;
  description: string;
  target: number;
  current: number;
  achieved: boolean;
  achievedAt?: string;
}

export interface ChartDataPoint {
  date: string;
  [key: string]: number | string; // Dynamic keys for different environments
}
```

**Step 2: Export from index**

Create `apps/desktop/src/types/index.ts`:

```typescript
export * from './analytics';
```

**Step 3: Commit**

```bash
git add apps/desktop/src/types/
git commit -m "feat(desktop): add analytics type definitions"
```

---

### Task 3: Delete Permissions Page

**Files:**
- Delete: `apps/desktop/src/pages/Permissions.tsx`
- Delete: `apps/desktop/src/components/permissions/ModeCard.tsx`
- Delete: `apps/desktop/src/components/permissions/index.ts`
- Modify: `apps/desktop/src/pages/index.ts`
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Remove Permissions page export**

In `apps/desktop/src/pages/index.ts`, remove the Permissions export:

```typescript
// Before
export { Dashboard } from './Dashboard';
export { Environments } from './Environments';
export { Permissions } from './Permissions';
export { Settings } from './Settings';

// After
export { Dashboard } from './Dashboard';
export { Environments } from './Environments';
export { Settings } from './Settings';
```

**Step 2: Remove Permissions from App.tsx routing**

In `apps/desktop/src/App.tsx`, remove the permissions case from renderPage():

```typescript
// Remove this entire case block:
case 'permissions':
  return (
    <Permissions
      onLaunch={handleLaunch}>
  );
```

**Step 3: Delete files**

```bash
rm apps/desktop/src/pages/Permissions.tsx
rm -rf apps/desktop/src/components/permissions/
```

**Step 4: Verify app still compiles**

Run: `cd apps/desktop && pnpm dev`
Expected: App compiles without errors

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(desktop): remove Permissions page (will merge into Environments)"
```

---

## Phase 2: Update Store for New Features

### Task 4: Extend Zustand Store with Analytics State

**Files:**
- Modify: `apps/desktop/src/store/index.ts`

**Step 1: Import analytics types**

Add to imports:

```typescript
import type { UsageStats, Milestone } from '@/types/analytics';
```

**Step 2: Add analytics state to AppState interface**

Add after the projects section:

```typescript
interface AppState {
  // ... existing fields ...

  // Analytics
  usageStats: UsageStats | null;
  milestones: Milestone[];
  continuousUsageDays: number;
  setUsageStats: (stats: UsageStats) => void;
  setMilestones: (milestones: Milestone[]) => void;
  setContinuousUsageDays: (days: number) => void;

  // ... rest of fields ...
}
```

**Step 3: Add analytics state implementation**

Add after the projects section in the store:

```typescript
// Analytics
usageStats: null,
milestones: [],
continuousUsageDays: 0,
setUsageStats: (stats) => set({ usageStats: stats }),
setMilestones: (milestones) => set({ milestones }),
setContinuousUsageDays: (days) => set({ continuousUsageDays: days }),
```

**Step 4: Commit**

```bash
git add apps/desktop/src/store/index.ts
git commit -m "feat(desktop): add analytics state to store"
```

---

## Phase 3: Build Sessions Tab

### Task 5: Create SessionCard Component

**Files:**
- Create: `apps/desktop/src/components/sessions/SessionCard.tsx`

**Step 1: Create SessionCard component**

```typescript
// apps/desktop/src/components/sessions/SessionCard.tsx
import { Clock, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Session } from '@/store';

interface SessionCardProps {
  session: Session;
  onFocus: (id: string) => void;
  onMinimize: (id: string) => void;
  onClose: (id: string) => void;
}

export function SessionCard({ session, onFocus, onMinimize, onClose }: SessionCardProps) {
  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-gray-500';
      case 'interrupted':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: Session['status']) => {
    switch (status) {
      case 'running':
        return '🟢';
      case 'stopped':
        return '⚫';
      case 'interrupted':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '⚫';
    }
  };

  const formatDuration = (startedAt: Date) => {
    const now = new Date();
    const diff = now.getTime() - startedAt.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours} 小时 ${minutes % 60} 分钟`;
    }
    return `${minutes} 分钟`;
  };

  const getProjectName = (path: string) => {
    return path.split('/').pop() || path;
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getStatusIcon(session.status)}</span>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {getProjectName(session.workingDir)}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {session.envName}
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
          {session.permMode || 'dev'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
        <Clock className="w-3 h-3" />
        <span>{formatDuration(session.startedAt)}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4 truncate">
        <FolderOpen className="w-3 h-3 flex-shrink-0" />
        <span className="truncate" title={session.workingDir}>
          {session.workingDir}
        </span>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onFocus(session.id)}
          disabled={session.status !== 'running'}
          className="flex-1"
        >
          Focus
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onMinimize(session.id)}
          disabled={session.status !== 'running'}
        >
          —
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onClose(session.id)}
          className="text-red-600 hover:text-red-700"
        >
          ✕
        </Button>
      </div>
    </Card>
  );
}
```

**Step 2: Verify component compiles**

Run: `cd apps/desktop && pnpm build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add apps/desktop/src/components/sessions/SessionCard.tsx
git commit -m "feat(desktop): add SessionCard component"
```

---

### Task 6: Create SessionList Component

**Files:**
- Create: `apps/desktop/src/components/sessions/SessionList.tsx`

**Step 1: Create SessionList component**

```typescript
// apps/desktop/src/components/sessions/SessionList.tsx
import { Clock, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Session } from '@/store';

interface SessionListProps {
  sessions: Session[];
  onFocus: (id: string) => void;
  onMinimize: (id: string) => void;
  onClose: (id: string) => void;
}

export function SessionList({ sessions, onFocus, onMinimize, onClose }: SessionListProps) {
  const getStatusIcon = (status: Session['status']) => {
    switch (status) {
      case 'running':
        return '🟢';
      case 'stopped':
        return '⚫';
      case 'interrupted':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '⚫';
    }
  };

  const formatDuration = (startedAt: Date) => {
    const now = new Date();
    const diff = now.getTime() - startedAt.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getProjectName = (path: string) => {
    return path.split('/').pop() || path;
  };

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center gap-4 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <span className="text-base">{getStatusIcon(session.status)}</span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-slate-900 dark:text-white">
                {getProjectName(session.workingDir)}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {session.envName}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                {session.permMode || 'dev'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(session.startedAt)}
              </span>
              <span className="flex items-center gap-1 truncate">
                <FolderOpen className="w-3 h-3 flex-shrink-0" />
                <span className="truncate" title={session.workingDir}>
                  {session.workingDir}
                </span>
              </span>
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onFocus(session.id)}
              disabled={session.status !== 'running'}
            >
              Focus
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMinimize(session.id)}
              disabled={session.status !== 'running'}
            >
              —
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onClose(session.id)}
              className="text-red-600 hover:text-red-700"
            >
              ✕
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Create index file**

Create `apps/desktop/src/components/sessions/index.ts`:

```typescript
export { SessionCard } from './SessionCard';
export { SessionList } from './SessionList';
```

**Step 3: Commit**

```bash
git add apps/desktop/src/components/sessions/
git commit -m "feat(desktop): add SessionList component"
```

---

### Task 7: Create Sessions Page

**Files:**
- Create: `apps/desktop/src/pages/Sessions.tsx`

**Step 1: Create Sessions page**

```typescript
// apps/desktop/src/pages/Sessions.tsx
import { useState } from 'react';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionCard, SessionList } from '@/components/sessions';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';

interface SessionsProps {
  onLaunch: () => void;
}

export function Sessions({ onLaunch }: SessionsProps) {
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const { sessions } = useAppStore();
  const { focusSession, minimizeSession, closeSession } = useTauriCommands();

  const handleFocus = async (id: string) => {
    try {
      await focusSession(id);
    } catch (err) {
      console.error('Failed toocus session:', err);
    }
  };

  const handleMinimize = async (id: string) => {
    try {
      await minimizeSession(id);
    } catch (err) {
      console.error('Failed to minimize session:', err);
    }
  };

  const handleClose = async (id: string) => {
    if (confirm('确定要关闭此会话吗？')) {
      try {
        await closeSession(id);
      } catch (err) {
        console.error('Failed to close session:', err);
      }
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Sessions ({sessions.length})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <Button
              size="sm"
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              onClick={() => setViewMode('card')}
              className="h-8 w-8 p-0"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className="h-8 w-8 p-0"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* New Session Button */}
          <Button onClick={onLaunch}>
            <Plus className="w-4 h-4 mr-2" />
            新会话
          </Button>
        </div>
      </div>

      {/* Sessions Display */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
            <span className="text-4xl">💬</span>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            暂无运行中的会话
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-4">
            点击"新会话"按钮启动 Claude Code
          </p>
          <Button onClick={onL}>
            <Plus className="w-4 h-4 mr-2" />
            启动 Claude Code
          <ton>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onFocus={handleFocus}
              onMinimize={handleMinimize}
              onClose={handleClose}
            />
          ))}
        </div>
      ) : (
        <SessionList
          sessions={sessions}
          onFocus={handleFocus}
          onMinimize={handleMinimize}
          onClose={handleClose}
        />
      )}

      {/* Layout Controls (Future Feature) */}
      {sessions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              布局控制:
            </span>
            <Button size="sm" variant="outline" disabled>
              ⊞ 4分屏
            </Button>
            <Button size="sm" variant="outline" disabled>
              — 全部最小化
            </Button>
            <Button size="sm" variant="outlisabled>
              ✕ 全部关闭
            </Button>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
              (未来功能)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Export from pages index**

Add to `apps/desktop/src/pages/index.ts`:

```typescript
export { Sessions } from './Sessions';
```

**Step 3: Commit**

```bash
git add apps/desktop/src/pages/Sessions.tsx apps/desktop/src/pages/index.ts
git commit -m "feat(desktop): add Sessions page with card/list views"
```

---
## Phase 4: Build Analytics Tab Components

### Task 8: Create Mock Analytics Data (Temporary)

**Files:**
- Create: `apps/desktop/src/lib/mockAnalytics.ts`

**Step 1: Create mock data generator**

```typescript
// apps/desktop/src/lib/mockAnalytics.ts
import type { UsageStats, Milestone, DailyActivity } from '@/types/analytics';

export function generateMockUsageStats(): UsageStats {
  const today = {
    inputTokens: 32000,
    outputTokens: 16200,
    cacheReadTokens: 8000,
    cacheCreationTokens: 4000,
    cost: 0.24,
  };

  const week = {
    inputTokens: 180000,
    outputTokens: 92000,
    cacheReadTokens: 45000,
    cacheCreationTokens: 22000,
    cost: 1.86,
  };

  const month = {
    inputTokens: 720000,
    outputTokens: 368000,
    cacheReadTokens: 180000,
    cacheCreationTokens: 88000,
    cost: 7.44,
  };

  const total = {
    inputTokens: 2480000,
    outputTokens: 1260000,
    cacheReadTokens: 620000,
    cacheCreationTokens: 300000,
    cost: 24.80,
  };

  // Generate daily history for last 30 days
  const dailyHistory: Record<string, typeof today> = {};
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    dailyHistory[dateStr] = {
      inputTokens: Math.floor(Math.random() * 50000) + 10000,
      outputTokens: Math.floor(Math.random() * 25000) + 5000,
      cacheReadTokens: Math.floor(Math.random() * 12000) + 3000,
      cacheCreationTokens: Math.floor(Math.random() * 6000) + 1500,
      cost: Math.random() * 0.5 + 0.1,
    };
  }

  const byModel = {
    'claude-opus-4-5': {
      inputTokens: 1200000,
      outputTokens: 600000,
      cacheReadTokens: 300000,
      cacheCreationTokens: 150000,
      cost: 12.50,
    },
    'claude-sonnet-4-5': {
      inputTokens: 800000,
      outputTokens: 400000,
      cacheReadTokens: 200000,
      cacheCreationTokens: 100000,
      cost: 8.30,
    },
    'glm-4-flash': {
      inputTokens: 400000,
      outputTokens:n      cacheReadTokens: 100000,
      cacheCreationTokens: 40000,
      cost: 3.20,
    },
    'deepseek-chat': {
      inputTokens: 80000,
      outputTokens: 60000,
      cacheReadTokens: 20000,
      cacheCreationTokens: 10000,
      cost: 0.80,
    },
  };

  const byEnvironment = {
    official: {
      inputTokens: 1500000,
      outputTokens: 750000,
      cacheReadTokens: 375000,
      cacheCreationTokens: 187500,
      cost: 15.60,
    },
    'GLM-4': {
      inputTokens: 600000,
      outputTokens: 300000,
      cacheReadTokens: 150000,
      cacheCreationTokens: 75000,
      cost: 6.20,
    },
    DeepSeek: {
      inputTokens: 380000,
      outputTokens: 210000,
      cacheReadTokens: 95000,
      cacheCreationTokens: 37500,
      cost: 3.00,
    },
  };

  return {
    today,
    week,
    month,
    total,
    dailyHistory,
    byModel,
    byEnvironment,
    lastUpdated: noISOString(),
  };
}

export function generateMockMilestones(): Milestone[] {
  return [
    {
      id: '1',
      type: 'tokens',
      title: '100K Tokens',
      description: '累计使用 100K tokens',
      target: 100000,
      current: 2480000,
      achieved: true,
      achievedAt: '2025-12-15T10:30:00Z',
    },
    {
      id: '2',
      type: 'tokens',
      title: '1M Tokens',
      description: '累计使用 1M tokens',
      target: 1000000,
      current: 2480000,
      achieved: true,
      achievedAt: '2026-01-20T14:20:00Z',
    },
    {
      id: '3',
      type: 'tokens',
      title: '5M Tokens',
      description: '累计使用 5M tokens',
      target: 5000000,
      current: 2480000,
      achieved: false,
    },
    {
      id: '4',
      type: 'cost',
      title: '第一个 $10',
      descripti费 $10',
      target: 10,
      current: 24.80,
      achieved: true,
      achievedAt: '2025-12-20T09:15:00Z',
    },
    {
      id: '5',
      type: 'cost',
      title: '$100',
      description: '累计消费 $100',
      target: 100,
      current: 24.80,
      achieved: false,
    },
    {
      id: '6',
      type: 'streak',
      title: '7天连续',
      description: '连续使用 7 天',
      target: 7,
      current: 42,
      achieved: true,
      achievedAt: '2025-12-25T00:00:00Z',
    },
    {
      id: '7',
      type: 'streak',
      title: '30天连续',
      description: '连续使用 30 天',
      target: 30,
      current: 42,
      achieved: true,
      achievedAt: '2026-01-18T00:00:00Z',
    },
    {
      id: '8',
      type: 'streak',
      title: '100天连续',
      description: '连续使用 100 天',
      target: 100,
      current: 42,
      achieved: false,
    },
  ];
}

export function generateMockDailyActivity(): DailyActivity[] {
  const activities: DailyActivity[] = [];
  const now = new Date();

  // Generate 365 days of activity
  for (let i = 0; i < 365; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const tokens = Math.floor(Math.random() * 60000);
    const cost = tokens * 0.000005;

    let level: DailyActivity['level'] = 0;
    if (tokens > 50000) level = 4;
    else if (tokens > 35000) level = 3;
    else if (tokens > 20000) level = 2;
    else if (tokens > 5000) level = 1;

    activities.push({
      date: dateStr,
      tokens,
      cost,
      level,
    });
  }

  return activities.reverse();
}
```

**Step 2: Commit**

```bash
git add apps/desktop/src/lib/mockAnalytics.ts
git commit -m "feat(desktop): add mock analytics data generator"
```

---

### Task 9: Create TokenChart Component

**Files:**
- Create: `apps/desktop/src/components/analytics/TokenChart.tsx`

**Step 1: Create TokenChart component**

```typescript
// apps/desktop/src/components/analytics/TokenChart.tsx
import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import type { ChartDataPoint } from '@/types/analytics';

interface TokenChartProps {
  data: ChartDataPoint[];
  environments: string[];
}

type ChartType = 'line' | 'bar';
type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

const COLORS = {
  official: '#3b82f6',
  'GLM-4': '#10b981',
  DeepSeek: '#8b5cf6',
  KIMI: '#f59e0b',
  MiniMax: '#ec4899',
};

export function TokenChart({ data, environments }: TokenChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [granularity, setGranularity] = useState<TimeGranularity>('day');

  const Chart = chartType === 'line' ? LineChart : BarChart;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={granularity === 'hour' ? 'default' : 'outline'}
            onClick={() => setGranularity('hour')}
          >
            小时
          </Button>
          <Button
            size="sm"
            variant={granularity === 'day' ? 'default' : 'outline'}
            onClick={() => setGranularity('day')}
          >
            日
          </Button>
          <Button
            size="sm"
            variant={granularity === 'week' ? 'default' : 'outline'}
            onClick={() => setGranularity('week')}
          >
            周
          </Button>
          <Button
            size="sm"
            variant={granularity === 'month' ? 'default' : 'outline'}
            onClick={() => setGranularity('month')}
          >
            月
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={chartType === 'line' ? 'default' : 'outline'}
            onClick={() => setChartType('line')}
          >
            📈 折线图
          </Button>
          <Button
            size="sm"
            variant={= 'bar' ? 'default' : 'outline'}
            onClick={() => setChartType('bar')}
          >
            📊 柱状图
          </Button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <Chart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis
            dataKey="date"
            className="text-xs text-slate-600 dark:text-slate-400"
          />
          <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          />
          <Legend />
          {environments.map((env) => {
            const color = COLORS[env as keyof typeof COLORS] || '#6b7280';
            return chartType === 'line' ? (
              <Line
                key={env}
                type="monotone"
                dataKey={env}
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            ) : (
              <Bar key={env} dataKey={env} fill={color} />
            );
          })}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/desktop/src/components/analytics/TokenChart.tsx
git commit -m "feat(desktop): add TokenChart component with line/bar views"
```

---

### Task 10: Create ModelDistribution Component

**Files:**
- Create: `apps/desktop/src/components/analytics/ModelDistribution.tsx`

**Step 1: Create ModelDistribution component**

```typescript
// apps/desktop/src/components/analytics/ModelDistribution.tsx
import type { TokenUsageWithCost } from '@/types/analytics';

interface ModelDistributionProps {
  byModel: Record<string, TokenUsageWithCost>;
}

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
];

export function ModelDistribution({ byModel }: ModelDistributionProps) {
  const models = Object.entries(byModel);
  const totalTokens = models.reduce(
    (sum, [, usage]) => sum + usage.inputTokens + usage.outputTokens,
    0
  );

  const modelsWithPercentage = models
    .map(([name, usage]) => {
      const tokens = usage.inputTokens + usage.outputTokens;
      const percentage = (tokens / totalTokens) * 100;
      return { name, usage, tokens, percentage };
    })
    .sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="space-y-3">
      {modelsWithPercentage.map(({ name, usage, percentage }, index) => (
        <div key={name} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-900 dark:text-white">
              {name}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-slate-600 dark:text-slate-400">
                {percentage.toFixed(1)}%
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ${usage.cost.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${COLORS[index % COLORS.length]} transition-all duration-500`}
              style={{ width: `${percentage}%` }}
            />
          </div>div>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/desktop/src/components/analytics/ModelDistribution.tsx
git commit -m "feat(desktop): add ModelDistribution component"
```

---


### Task 11: Create HeatmapCalendar Component

**Files:**
- Create: `apps/desktop/src/components/analytics/HeatmapCalendar.tsx`

**Step 1: Create HeatmapCalendar component**

```typescript
// apps/desktop/src/components/analytics/HeatmapCalendar.tsx
import type { DailyActivity } from '@/types/analytics';

interface HeatmapCalendarProps {
  activities: DailyActivity[];
}

const LEVEL_COLORS = {
  0: 'bg-slate-100 dark:bg-slate-800',
  1: 'bg-green-200 dark:bg-green-900/40',
  2: 'bg-green-400 dark:bg-green-700/60',
  3: 'bg-green-600 dark:bg-green-600/80',
  4: 'bg-green-800 dark:bg-green-500',
};

export function HeatmapCalendar({ activities }: HeatmapCalendarProps) {
  // Group activities by week
  const weeks: DailyActivity[][] = [];
  let currentWeek: DailyActivity[] = [];

  activities.forEach((activity, index) => {
    currentWeek.push(activity);
    if (currentWeek.length === 7 || index === activities.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  // Get month labels
  const getMonthLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short' });
  };

  const months = Array.from(
    new Set(activities.map((a) => getMonthLabel(a.date)))
  );

  return (
    <div className="space-y-4">
      {/* Month Labels */}
      <div className="flex gap-1 text-xs text-slate-600 dark:text-slate-400 pl-12">
        {months.map((month, i) => (
          <div key={i} className="flex-1 text-center">
            {month}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex gap-1">
        {/* Day Labels */}
        <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400 justify-around">
          <div>Mon</div>
          <div>Wed</div>
          <div>Fri</div>
        </div>

        {/* Heatmap */}
        <div className="flex gap-1 flex-1 overflow-x-auto">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map => (
                <div
                  key={activity.date}
                  className={`w-3 h-3 rounded-sm ${
                    LEVEL_COLORS[activity.level]
                  } hover:ring-2 hover:ring-slate-400 dark:hover:ring-slate-500 cursor-pointer transition-all`}
                  title={`${activity.date}: ${activity.tokens.toLocaleString()} tokens, $${activity.cost.toFixed(3)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span>少量</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-3 h-3 rounded-sm ${
              LEVEL_COLORS[level as keyof typeof LEVEL_COLORS]
            }`}
          />
        ))}
        <span>大量</span>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/desktop/src/components/analytics/HeatmapCalendar.tsx
git commit -m "feat(desktop): add Heatmendar component"
```

---

### Task 12: Create MilestoneCard Component

**Files:**
- Create: `apps/desktop/src/components/analytics/MilestoneCard.tsx`

**Step 1: Create MilestoneCard component**

```typescript
// apps/desktop/src/components/analytics/MilestoneCard.tsx
import { Check } from 'lucide-react';
import type { Milestone } from '@/types/analytics';

interface MilestoneCardProps {
  milestone: Milestone;
}

const MILESTONE_ICONS = {
  tokens: '📊',
  cost: '💰',
  streak: '🔥',
  savings: '💎',
};

export function MilestoneCard({ milestone }: MilestoneCardProps) {
  const progress = (milestone.current / milestone.target) * 100;
  const clampedProgress = Math.min(progress, 100);

  return (
    <div
      className={`relative p-4 rounded-lg border ${
        milestone.achieved
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50'
      }`}
    >
      {milestone.achieved && (
        <div className="absolute top-2 right-2">
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" /       </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="text-2xl">{MILESTONE_ICONS[milestone.type]}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
            {milestone.title}
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            {milestone.description}
          </p>

          {!milestone.achieved && (
            <>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${clampedProgress}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {milestone.current.toLocaleString()} / {milestone.target.toLocaleString()}
                {' '}({clampedProgress.toFixed(1)}%)
              </div>
            </>
          )}

          {milestone.achieved && milestone.achievedAt && (
            <div className="text-xs text-green-600 dark:text-green-400">
              达成于 {new Date(milestone.achievedAt).toLocaleDateString('zh-CN')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create index file**

Create `apps/desktop/src/components/analytics/index.ts`:

```typescript
export { TokenChart } from './TokenChart';
export { ModelDistribution } from './ModelDistribution';
export { HeatmapCalendar } from './HeatmapCalendar';
export { MilestoneCard } from './MilestoneCard';
```

**Step 3: Commit**

```bash
git add apps/desktop/src/components/analytics/
git commit -m "feat(desktop): add MilestoneCard component and analytics index"
```

---

### Task 13: Create Analytics Page

**Files:**
- Create: `apps/desktop/srytics.tsx`

**Step 1: Create Analytics page**

```typescript
// apps/desktop/src/pages/Analytics.tsx
import { useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  TokenChart,
  ModelDistribution,
  HeatmapCalendar,
  MilestoneCard,
} from '@/components/analytics';
import { useAppStore } from '@/store';
import {
  generateMockUsageStats,
  generateMockMilestones,
  generateMockDailyActivity,
} from '@/lib/mockAnalytics';
import type { ChartDataPoint } from '@/types/analytics';

export function Analytics() {
  const { usageStats, milestones, continuousUsageDays, setUsageStats, setMilestones, setContinuousUsageDays } =
    useAppStore();

  // Load mock data on mount (TODO: Replace with real Tauri commands)
  useEffect(() => {
    if (!usageStats) {
      setUsageStats(generateMockUsageStats());
      setMilestones(generateMockMilestones());
      setContinuousUsageDays(42);
    }
  }, [usageStats, setUsageStats, setMilestones, setContinuousUsageDays]);

  if (!usageStats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500 dark:text-slate-400">加载中...</div>
      </div>
    );
  }

  // Prepare ca from daily history
  const chartData: ChartDataPoint[] = Object.entries(usageStats.dailyHistory)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7) // Last 7 days
    .map(([date, usage]) => ({
      date: new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      official: Math.floor((usage.inputTokens + usage.outputTokens) * 0.6),
      'GLM-4': Math.floor((usage.inputTokens + usage.outputTokens) * 0.25),
      DeepSeek: Math.floor((usage.inputTokens + usage.outputTokens) * 0.15),
    }));

  const environments = ['official', 'GLM-4', 'DeepSeek'];

  // Calculate week-over-week change
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const tokenChange = calculateChange(
    usageStats.week.inputTokens + usageStats.week.outputTokens,
    (usageStats.week.inputTokens + usageStats.week.outputTokens) * 0.85 // Mock previous week
  );

  const costChange = calculateChange(usageStats.week.cost, usageStats.week.cost * 0.87);

  const dailyActivities = generateMockDailyActivity();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Analytics
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Token 使用统计和成本分析
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">
            本周)
            </div>
            <div
              className={`flex items-center gap-1 text-xs ${
                tokenChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {tokenChange >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(tokenChange).toFixed(1)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {((usageStats.week.inputTokens + usageStats.week.outTokens) / 1000).toFixed(1)}K
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            较上周
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              费用 (本周)
            </div>
            <div
              className={`flex items-center gap-1 text-xs ${
                costChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
             tChange >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(costChange).toFixed(1)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            ${usageStats.week.cost.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            较上周
          </div>
        </Card>

        <Card className="p-6">
          <div className="-sm text-slate-600 dark:text-slate-400 mb-2">
            连续使用
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            🔥 {continuousUsageDays} 天
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">
            🎉 新纪录!
          </div>
        </Card>
      </div>

      {/* Token Consumption Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Token 消耗分布
        </h3>
        <TokenChart data={chartData} environments={environments} />
      </Card>

      {/* Model Distribution */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          模型分布
        </h3>
        <ModelDistribution byModel={usageStats.byModel} />
      </Card>

      {/* Activity Heatmap */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          活跃热力图 (按日历)
        </h3>
        <HeatmapCalendar activities={dailyActivities} />
      </Card>

      {/* Milestones */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          里程碑
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {milestones.map((milestone) => (
            <MilestoneCard key={milestone.id} milestone={milestone} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Export from pages index**

Add to `apps/desktop/src/pages/index.ts`:

```typescript
export { Analytics } from './Analytics';
```

**Step 3: Commit**

```bash
git add apps/desktop/src/pages/Analytics.tsx apps/desktop/src/pages/index.ts
git commit -m "feat(desktop): add Analytics page with charts and milestones"
```

---


## Phase 5: Update Existing Pages

### Task 14: Merge Permissions into Environments Page

**Files:**
- Modify: `apps/desktop/src/pages/Environments.tsx`

**Step 1: Read current Environments page**

Run: `cat apps/desktop/src/pages/Environments.tsx`
Expected: See current implementation

**Step 2: Add permission mode section**

Add after the environments list section:

```typescript
// Add to imports
import { PERMISSION_PRESETS } from '@ccem/core/browser';
import type { PermissionModeName } from '@ccem/core/browser';

// Add to component body, after environments section:
<div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
    权限模式
  </h3>
  
  <div className="space-y-4">
    {/* Default Permission Setting */}
    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div>
        <div className="font-medium text-slate-900 dark:text-white mb-1">
          默认权限
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          用户级别，所有环境通用
        </div>
      </div>
      <select
        value={defaultMode || permissionMode}
        onChange={(e) => {
          const mode = e.target.value as PermissionModeName;
          setDefaultMode(mode);
          setPermissionMode(mode);
        }}
        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
      >
        {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
          <option key={key} value={key}>
            {key} - {preset.description}
          </option>
        ))}
      </select>
    </div>

    {/* Quick Switch (Temporary) */}
    <div>
      <div className="text-sm font-medium text-slate-900 dark:text-white mb-2">
        快速切换 (临时)
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.keys(PERMISSION_PRESETS).map((mode) => (
          <Button
            key={mode}
            size="sm"
            variant={permissionMode === mode ? 'default' : 'outline'}
            onClick={() => setPermissionMode(mode as Permisme)}
          >
            {mode}
          </Button>
        ))}
      </div>
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        💡 临时权限仅对下次启动生效，不改变默认设置
      </div>
    </div>
  </div>
</div>
```

**Step 3: Verify page compiles**

Run: `cd apps/desktop && pnpm build`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/desktop/src/pages/Environments.tsx
git commit -m "feat(desktop): merge permission modes into Environments page"
```

---

### Task 15: Refactor Dashboard to Home (Launch Center)

**Files:**
- Modify: `apps/desktop/src/pages/Dashboard.tsx`

**Step 1: Simplify Dashboard to focus on launch**

Replace the Dashboard content with a simplified version:

```typescript
// apps/desktop/src/pages/Dashboard.tsx
import { useState } from 'react';
import { Rocket, FolderOpen, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProjectList } from '@/components/projects';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onLaunch: () => void;
  onLaunchWithDir: (dir: string) => void;
}

export function Dashboard({ onNavigate, onLaunch, onLaunchWithDir }: DashboardProps) {
  const {
    currentEnv,
    permissionMode,
    selectedWorkingDir,
    sessions,
    usageStats,
    setSelectedWorkingDir,
  } = useAppStore();

  const { openDirectoryDialog } = useTauriCommands();

  const handleSelectDirectory = async () => {
    try {
      const dir = await openDirectoryDialog();
      if (dir) {
        setSelectedWorkingDir(dir);
      }
    } catch (err) {
      console.error('Failed to open directory dialog:', err);
    }
  };

  const handleLaunchClick = () => {
    if (selectedWorkingDir) {
      onLaunchWithDir(selectedWorkingDir);
    } else {
      onLaunch();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Status Bar */}
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span>当前环境</span>
        <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
          {currentEnv}
        </span>
        <span>·</span>
        <span>权限</span>
        <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
          {permissionMode}
        </span>
        <span>·</span>
        <span>{sessions.length} 个会话运行中</span>
      </div>

      {/* Launch Center */}
      <div className="flex flex-col items-center justify-center py-12">
        <Button
          size="lg"
          onClick={handleLaunchClick}
          className="h-16 px-12 text-lg"
        >
          <Rocket className="w-6 h-6 mr-3" />
          启动 Claude Code
        </Button>

        {/* Quick Actions */}
        <div className="flex items-center gap-4 mt-6">
          <select
            value={currentEnv}
            onChange={(e) => {
              // TODO: Call setCurrentEnv Tauri command
              console.log('Switch to:', e.target.value);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="official">Official</option>
            <option value="GLM-4">GLM-4</option>
            <option value="DeepSeek">DeepSeek</option>
          </select>

          <select
            value={permissionMode}
            onChange={(e) => {
              // TODO: Update permission mode
              console.log('Switch permission:', e.target.value);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="yolo">yolo</option>
            <option value="dev">dev</option>
            <option value="safe">safe</option>
            <option value="readonly">readonly</option>
          </select>

          <Button variant="outline" onClick={handleSelectDirectory}>
            <FolderOpen className="w-4 h-4 mr-2" />
            {selectedWorkingDir ? '更改目录' : '选择目录'}
          </Button>
        </div>

        {selectedWorkingDir && (
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            工作目录: {selectedWorkingDir}
          </div>
        )}
      </div>

      {/* Today's Usage Summary */}
      {usageStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate('sessions')}
          >
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              运行中会话
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              💬 {sessions.length}
            </div>
          </Card>

          <Card
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate('analytics')}
          >
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              今日 Tokens
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              📊 {((usageStats.today.inputTokens + usageStats.today.outputTokens) / 1000).toFixed(1)}K
            </div>
          </Card>

          <Card
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate('analytics')}
          >
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              今日消费
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              💰 ${usageStats.today.cost.toFixed(2)}
            </div>
          </Card>
        </div>
      )}

      {/* Recent Projects */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          最近项目
        </h3>
        <ProjectList onLaunch={onLaunchWithDir} />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/desktop/src/pages/Dashboard.tsx
git commit -m "refactor(desktop): simplify Dashboard to launch center (Home)"
```

---

### Task 16: Update TabNav Component

**Files:**
- Modify: `apps/desktop/src/components/layout/TabNav.tsx`

**Step 1: Update tab configuration**

Replace the tabs array with the new 6-tab structure:

```typescript
const tabs = [
  { id: 'dashboard', label: '🏠 Home', icon: Home },
  { id: 'sessions', label: '💬 Sessions', icon: Terminal },
  { id: 'environments', label: '🌐 Environments', icon: Globe },
  { id: 'analytics', label: '📊 Analytics', icon: BarChart3 },
  { id: 'skills', label: '✦ Skills', icon: Sparkles },
  { id: 'settings', label: '⚙️ Settings', icon: Settings },
];
```

**Step 2: Add missing imports**

```typescript
import { Home, Terminal, Globe, BarChart3, Sparkles, Settings } from 'lucide-react';
```

**Step 3: Commit**

```bash
git add apps/desktop/src/components/layout/TabNav.tsx
git commit -m "feat(desktop): update TabNav to 6-tab architecture"
```

---

## Phase 6: Integration and Routing

### Task 17: Update App.tsx Routing

**Files:**
- Modify: `apps/desktop/src/App.tsx`

**Step 1: Import new pages**

Add to imports:

```typescript
import { Sessions, Analytics } from '@/pages';
```

**Step 2: Add new routes to renderPage()**

Add cases for sessions and analytics:

```typescript
case 'sessions':
  return <Sessions onLaunch={handleLaunch} />;

case 'analytics':
  return <Analytics />;
```

**Step 3: Update skills placeholder**

Keep the existing skills placeholder as-is (already in the code).

**Step 4: Verify routing works**

Run: `cd apps/desktop && pnpm dev`
Expected: App compiles and all tabs are accessible

**Step 5: Commit**

```bash
git add apps/desktop/src/App.tsx
git commit -m "feat(desktop): integrate Sessions and Analytics into routing"
```

---

### Task 18: Add Tauri Commands Hook Extensions

**Files:**
- Modify: `apps/desktop/src/hooks/useTauriCommands.ts`

**Step 1: Add session management commands**

Add to the hook:

```typescript
const focusSession = async (sessionId: string) => {
  try {
    await invoke('focus_session', { sessionId });
    toast.success('会话已聚焦');
  } catch (err) {
    toast.error('聚焦失败: ' + String(err));
    throw err;
  }
};

const minimizeSession = async (sessionId: string) => {
  try {
    await invoke('minimize_session', { sessionId });
    toast.success('会话已最小化');
  } catch (err) {
    toast.error('最小化失败: ' + String(err));
    throw err;
  }
};

const closeSession = async (sessionId: string) => {
  try {
    await invoke('close_session', { sessionId });
    removeSession(sessionId);
    toast.success('会话已关闭');
  } catch (err) {
    toast.error('关闭失败: ' + String(err));
    throw err;
  }
};
```

**Step 2: Export new commands**

Add to return statement:

```typescript
return {
  // ... existing exports
  focusSession,
  minimizeSession,
  closeSession,
};
```

**Step 3: Commit**

```bash
git add apps/desktop/src/hooks/useTauriCommands.ts
git commit -m "feat(desktop): add session control commands to Tauri hook"
```

---

### Task 19: Test All Pages

**Files:**
- None (manual testing)

**Step 1: Start dev server**

Run: `cd apps/desktop && pnpm dev`
Expected: App starts without errors

**Step 2: Test each tab**

Navigate through all 6 tabs:
- ✅ Home: Launch button, quick actions, recent projects
- ✅ Sessions: Card/list view toggle, session controls
- ✅ Environments: Environment list, permission modes
- ✅ Analytics: Charts, heatmap, milestones
- ✅ Skills: Placeholder message
- ✅ Settings: Existing settings

**Step 3: Test interactions**

- Launch Claude Code from Home
- Switch between card/list view in Sessions
- Toggle chart types in Analytics
- Switch permission modes in Environments

**Step 4: Document any issues**

Create a list of bugs or improvements needed.

**Step 5: Commit test results**

```bash
git add -A
git commit -m "test(desktop): verify all 6 tabs functionality"
```

---

## Phase 7: Backend Integration (Future Work)

### Task 20: Add Rust Backend for Analytics

**Files:**
- Create: `apps/desktop/src-tauri/src/analytics.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`

**Note:** This task is marked as future work. The current implementation uses mock data.

**Step 1: Create analytics module stub**

```rust
// apps/desktop/src-tauri/src/analytics.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UsageStats {
    // TODO: Implement real usage tracking
    // Parse Claude's JSONL logs from ~/.claude/projects/
    // Calculate token usage and costs
}

#[tauri::command]
pub fn get_usage_stats() -> Result<UsageStats, String> {
    // TODO: Implement
    Err("Not implemented yet".to_string())
}
```

**Step 2: Document implementation plan**

Create `docs/analytics-backend-plan.md` with:
- Log file parsing strategy
- Token counting logic
- Cost calculation with model prices
- Caching strategy

**Step 3: Commit**

```bash
git add apps/desktop/src-tauri/src/analytics.rs docs/analytics-backend-plan.md
git commit -m "feat(desktop): add analytics backend stub (future work)"
```

---

## Summary

### Completed Features

✅ **Phase 1:** Preparation & Cleanup
- Installed recharts dependency
- Created analytics type definitions
- Deleted Permissions page

✅ **Phase 2:** Store Updates
- Extended Zustand store with analytics state

✅ **Phase 3:** Sessions Tab
- SessionCard component (card view)
- SessionList component (list view)
- Sessions page with view toggle

✅ **Phase 4:** Analytics Tab
- TokenChart with line/bar toggle
- ModelDistribution bar chart
- HeatmapCalendar (GitHub-style)
- MilestoneCard component
- Analytics page with mock data

✅ **Phase 5:** Page Updates
- Merged permissions into Environments
- Refactored Dashboard to Home (launnter)
- Updated TabNav to 6-tab architecture

✅ **Phase 6:** Integration
- Updated App.tsx routing
- Extended Tauri comds hook
- Manual testing of all tabs

### Remaining Work

🔲 **Analytics Backend** (Phase 7)
- Parse Claude JSONL logs
- Calculate real token usage
- Implement cost tracking
- Add caching layer

🔲 **Skills Tab** (Future)
- Implement skill management UI
- Integrate with CLI skill commands

🔲 **Advanced Features** (Future)
- 4-pane layout for sessions
- Batch session operations
- Export analytics reports

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-02-07-desktop-app-implementation.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**


---

## Phase 8: Tray Menu Implementation

### Task 21: Update Tray Menu Structure

**Files:**
- Modify: `apps/desktop/src-tauri/src/tray.rs`

**Step 1: Read current tray implementation**

Run: `cat apps/desktop/src-tauri/src/tray.rs`
Expected: See current tray menu structure

**Step 2: Add environment switching submenu**

Add to tray menu builder:

```rust
use tauri::menu::{Menu, MenuItem, Submenu, PredefinedMenuItem};
use tauri::{AppHandle, Manager};
use crate::config;

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let cfg = config::read_config().unwrap_or_default();
    let current_env = cfg.current.unwrap_or_else(|| "official".to_string());
    
    // Get current permission mode from app config
    let app_cfg = config::read_app_config().unwrap_or_default();
    let current_perm = app_cfg.default_permission_mode.unwrap_or_else(|| "dev".to_string());

    // Environment submenu
    let env_submenu = {
        let mut menu = Menu::new(app)?;
        for (name, _) in cfg.registries.iter() {
            let is_current = name == &current_env;
            let item = MenuItem::with_id(
                app,
                format!("env:{}", name),
                name,
                true,
                None::<&str>,
            )?;
            if is_current {
                // TODO: Add checkmark indicator
            }
            menu = menu.append(&item)?;
        }
        Submenu::with_id_and_menu(app, "switch_env", "切换环境 ▶", true, menu)?
    };

    // Permission mode submenu
    let perm_submenu = {
        let mut menu = Menu::new(app)?;
        let modes = vec!["yolo", "dev", "safe", "readonly", "ci", "audit"];
        for mode in modes {
            let is_current = mode == current_perm;
            let item = MenuItem::with_id(
                app,
                format!("perm:{}", mode),
                mode,
                true,
                None::<&str>,
            )?;
            if is_current {
                // TODO: Add checkmark indicator
            }
            menu = menu.append(&item)?;
        }
        Submenu::with_id_and_menu(app, "switch_perm", "权限模式 ▶", true, menu)?
    };

    // Sessions submenu
    let sessions_submenu = {
        let session_manager = app.state::<Arc<crate::session::SessionManager>>();
        let sessions = session_manager.list_sessions();
        let running_count = sessions.iter().filter(|s| s.status == "running").count();

        let mut menu = Menu::new(app)?;
        
        if sessions.is_empty() {
            let item = MenuItem::with_id(app, "no_sessions", "无运行中会话", false, None::<&str>)?;
            menu = menu.append(&item)?;
        } else {
            for session in sessions.iter().take(5) {
                let project_name = session.working_dir
                    .split('/')
                    .last()
                    .unwrap_or(&session.working_dir);
                let item = MenuItem::with_id(
                    app,
                    format!("session:{}", session.id),
                    format!("{} [Focus]", project_name),
                    true,
                    None::<&str>,
                )?;
                menu = menu.append(&item)?;
            }
        }

        Submenu::with_id_and_menu(
            app,
            "sessions",
            format!("会话 ({} 运行中) ▶", running_count),
            true,
            menu,
        )?
    };

    // Build main menu
    let menu = Menu::with_items(
        app,
        &[
            // Status header (non-clickable)
            &MenuItem::with_id(
                app,
                "status",
                format!("CCEM · {} · {}", current_env, current_perm),
                false,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            
            // Launch button
            &MenuItem::with_id(app, "launch", "🚀 启动 Claude Code", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            
            // Submenus
            &env_submenu,
            &perm_submenu,
            &sessions_submenu,
            &PredefinedMenuItem::separator(app)?,
            
            // Today's stats (non-clickable)
            &MenuItem::with_id(
                app,
                "stats",
                "📊 今日: 0K tokens · $0.00",
                false,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            
            // Actions
            &MenuItem::with_id(app, "show_window", "🏠 打开主窗口", true, None::<&str>)?,
            &MenuItem::with_id(app, "settings", "⚙️ 设置", true, None::<&str>)?,
            &MenuItem::with_id(app, "quit", "❌ 退出", true, None::<&str>)?,
        ],
    )?;

    let tray = app.tray_by_id("main").expect("Tray not found");
    tray.set_menu(Some(menu))?;

    // Set initial icon (green = has sessions, white = no sessions)
    update_tray_icon(app, false)?;

    Ok(())
}

pub fn update_tray_icon(app: &AppHandle, has_error: bool) -> tauri::Result<()> {
    let tray = app.tray_by_id("main").expect("Tray not found");
    let session_manager = app.state::<Arc<crate::session::SessionManager>>();
    let sessions = session_manager.list_sessions();
    
    let icon_name = if has_error {
        "tray-icon-red"
    } else if sessions.iter().any(|s| s.status == "running") {
        "tray-icon-green"
    } else {
        "tray-icon-white"
    };

    // TODO: Set icon based on icon_name
    // tray.set_icon(Some(icon))?;
    
    Ok(())
}

pub fn update_tray_stats(app: &AppHandle, tokens: u64, cost: f64) -> tauri::Result<()> {
    // TODO: Update the stats menu item text
    // This requires rebuilding the menu or using a mutable menu item
    Ok(())
}
```

**Step 3: Add tray event handler**

Add event handler in `main.rs`:

```rust
// In main.rs setup function
tray.on_menu_event(move |app, event| {
    let id = event.id().as_ref();
    
    if id.starts_with("env:") {
        let env_name = id.strip_prefix("env:").unwrap();
        let _ = crate::config::set_current_env(env_name.to_string());
        // Rebuild tray menu to update checkmark
        let _ = create_tray(app);
    } else if id.starts_with("perm:") {
        let perm_mode = id.strip_prefix("perm:").unwrap();
        // TODO: Update permission mode in app config
        let _ = create_tray(app);
    } else if id.starts_with("session:") {
        let session_id = id.strip_prefix("session:").unwrap();
        let session_manager = app.state::<Arc<SessionManager>>();
        if let Some(session) = session_manager.get_session(session_id) {
            let _ = crate::terminal::focus_terminal_window(
                match session.terminal_type.as_deref() {
                    Some("iterm2") => crate::terminal::TerminalType::ITerm2,
                    _ => crate::terminal::TerminalType::TerminalApp,
             },
                session.window_id.as_deref().unwrap_or(""),
            );
        }
    } else {
        match id {
            "launch" => {
                // TODO: Trigger launch with current env/perm
            }
            "show_window" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "settings" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    // TODO: Emit event to switch to settings tab
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        }
    }
});
```

**Step 4: Commit**

```bash
git add apps/desktop/src-tauri/src/tray.rs apps/desktop/src-tauri/src/main.rs
git commit -m "feat(desktop): implement comprehensive tray menu with env/perm/session controls"
```

---

### Task 22: Add Tray Icon Assets

**Files:**
- Create: `apps/desktop/src-tauri/icons/tray-icon-green.png`
- Create: `apps/desktop/src-tauri/icons/tray-icon-white.png`
- Create: `apps/desktop/src-tauri/icons/tray-icon-red.png`

**Step 1: Create icon variants**

Create three 32x32 PNG icons:
- Green: 🟢 Has running sessions
- White: ⚪ No sessions
- Red: 🔴 Has error sessions

**Step 2: Add icons to Tauri config**

Update `apps/desktop/src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "resources": [
      "icons/tray-icon-*.png"
    ]
  }
}
```

**Step 3: Commit**

```bash
git add apps/desktop/src-tauri/icons/ apps/desktop/src-tauri/tauri.conf.json
git commit -m "feat(desktop): add tray icon variants for different states"
```

---


## Phase 9: Settings Tab Enhancement

### Task 23: Update Settings Tab with Required Configuration Items

**Files:**
- Modify: `apps/desktop/src/pages/Settings.tsx`

**Step 1: Read current Settings page**

Run: `cat apps/desktop/src/pages/Settings.tsx`
Expected: See current settings implementation

**Step 2: Add missing configuration items**

Ensure Settings page includes all 5 required items from design:

```typescript
// apps/desktop/src/pages/Settings.tsx
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { useTauriCommands } from '@/hooks/useTauriCommands';
import type { PermissionModeName } from '@ccem/core/browser';

export function Settings() {
  const { defaultMode, setDefaultMode } = useAppStore();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [autoStart, setAutoStart] = useState(false);
  const [startMinimized, setStartMinimized] = useState(false);
  const [closeToTray, setCloseToTray] = useState(true);

  // Load settings on mount
  useEffect(() => {
    // TODO: Load from Tauri app config
  }, []);

  const handleSaveSettings = async () => {
    // TODO: Save to Tauri app config
    console.log('Saving settings:', {
      theme,
      autoStart,
      startMinimized,
      closeToTray,
      defaultMode,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Settings
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          应用配置和偏好设置
        </p>
      </div>

      {/* Appearance */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          外观
        </h3>
        <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              主题
            </label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => setTheme('dark')}
              >
                ⚫ 深色
              </Button>
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => setTheme('light')}
              >
                ⚪ 浅色
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                onClick={() => setTheme('system')}
              >
                🖥️ 跟随系统
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Application */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          应用
        </h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                开机自动启动
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                系统启动时自动运              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={startMinimized}
              onChange={(e) => setStartMinimized(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                启动时最小化到托盘
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                应用启动时不显示主窗口
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={closeToTray}
              onChange={(e) => setCloseToTray(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                关闭窗口时最小化（而非退出）
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                点击关闭按钮时保持应用在后台运行
              </div>
            </div>
          </label>
        </div>
      </Card>

      {/* Default Permission */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          默认权限
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              默认权限模式
            </label>
            <select
              value={defaultMode || 'dev'}
              onChange={(e) => setDefaultMode(e.target.value as PermissionModeName)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="yolo">yolo - 完全开放，无限制</option>
              <option value="dev">dev - 标准开发权限</option>
              <option value="safe">safe - 保守权限</option>
              <option value="readonly">readonly - 只读访问</option>
              <option value="ci">ci - CI/CD 流水线权限</option>
              <option value="audit">audit - 安全审计</option>
            </select>
            <p className="mt-2 text-xs telate-500 dark:text-slate-400">
              💡 启动 Claude 时默认使用此权限，可在 Home 页临时覆盖
            </p>
          </div>
        </div>
      </Card>

      {/* About */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          关于
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              版本
            </span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              v2.0.0
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              检查更新
            </Button>
            <Button variant="outline" size="sm">
              GitHub
            </Button>
            <Button variant="outline" size="sm">
              反馈问题
            </Button>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings}>
          保存设置
        </Button>
      </div>
    </div>
  );
}
```

**Step 3: Verify page compiles**

Run: `cd apps/desktop && pnpm build`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/desktop/src/pages/Settings.tsx
git commit -m "feat(desktop): enhance Settings page with all 5 required config items"
```

---

## Phase 10: Backend Commands Enhancement

### Task 24: Add get_usage_history Tauri Command

**Files:**
- Create: `apps/desktop/src-tauri/src/analytics.rs` (if not exists)
- Modify: `apps/desktop/src-tauri/src/main.rs`

**Step 1: Create analytics module**

```rust
// apps/desktop/src-tauri/src/analytics.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenUsage {
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_tokens: u64,
    pub cache_creation_tokens: u64,
    pub cost: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UsageHistory {
    pub daily: HashMap<String, TokenUsage>, // key: YYYY-MM-DD
    pub by_model: HashMap<String, TokenUsage>,
    pub by_environment: HashMap<String, TokenUsage>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UsageStats {
    pub today: TokenUsage,
    pub week: TokenUsage,
    pub month: TokenUsage,
    pub total: TokenUsage,
    pub daily_history: HashMap<String, TokenUsage>,
    pub by_model: HashMap<String, TokenUsage>,
    pub by_environment: HashMap<String, TokenUsage>,
    pub last_updated: String,
}

/// Get usage statistics (aggregated)
#[tauri::command]
pub fn get_usage_stats() -> Result<UsageStats, String> {
    // TODO: Implement real usage tracking
    // 1. Parse Claude's JSONL logs from ~/.claude/projects/
    // 2. Calculate token usage and costs
    // 3. Aggregate by time periods
    
    Err("Not implemented yet - using mock data in frontend".to_string())
}

/// Get usage history with time granularity
#[tauri::command]
pub fn get_usage_history(
    granularity: String, // "hour" | "day" | "week" | "month"
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<UsageHistory, String> {
    // TODO: Implement
    // 1. Parse logs within date range
    // 2. Group by specified granularity
    // 3. Return time-series data
    
    Err("Not implemented yet - using mock data in frontend".to_string())
}

/// Calculate continuous usage days (streak)
#[tauri::command]
pub fn get_continuous_usage_days() -> Result<u32, String> {
    // TODO: Implement
    // 1. Check daily activity from logs
    // 2. Calculate longest streak ending today
    
    Ok(0)
}
```

**Step 2: Register commands in main.rs**

Add to `invoke_handler`:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    get_usage_stats,
    get_usage_history,
    get_continuous_usage_days,
])
```

Add module declaration:

```rust
mod analytics;
use analytics::{get_usage_stats, get_usage_history, get_continuous_usage_days};
```

**Step 3: Commit**

```bash
git add apps/desktop/src-tauri/src/analytics.rs apps/desktop/src-tauri/src/main.rs
git commit -m "feat(desktop): add analytics backend commands (stubs for future implementation)"
```

---

## Phase 11: Data Refinements

### Task 25: Complete Milestone Data

**Files:**
- Modify: `apps/desktop/src/lib/mockAnalytics.ts`

**Step 1: Add missing milestones**

Update `generateMockMilestones()` to include all milestones from design:

```typescript
export function generateMockMilestones(): Milestone[] {
  return [
    // Token Milestones
    {
      id: '1',
      type: 'tokens',
      title: '100K Tokens',
      description: '累计使用 100K tokens',
      target: 100000,
      current: 2480000,
      achieved: true,
      achievedAt: '2025-12-15T10:30:00Z',
    },
    {
      id: '2',
      type: 'tokens',
      title: '500K Tokens',
      description: '累计使用 500K tokens',
      target: 500000,
      current: 2480000,
      achieved: true,
      achievedAt: '2026-01-10T14:20:00Z',
    },
    {
      id: '3',
      type: 'tokens',
      title: '1M Tokens',
      description: '累计使用 1M tokens',
      target: 1000000,
      current: 2480000,
      achieved: true,
      achievedAt: '2026-01-20T14:20:00Z',
    },
    {
      id: '4',
      type: 'tokens',
      title: '5M Tokens',
      description: '累计使用 5M tokens',
      target: 5000000,
      current: 2480000,
      achieved: false,
    },
    {
      id: '5',
      type: 'tokens',
      title: '10M Tokens',
      description: '累计使用 10M tokens',
      target: 10000000,
      current: 2480000,
      achieved: false,
    },
    
    // Cost Milestones
    {
      id: '6',
      type: 'cost',
     个 $10',
      description: '累计消费 $10',
      target: 10,
      current: 24.80,
      achieved: true,
      achievedAt: '2025-12-20T09:15:00Z',
    },
    {
      id: '7',
      type: 'cost',
      title: '$50',
      description: '累计消费 $50',
      target: 50,
      current: 24.80,
      achieved: false,
    },
    {
      id: '8',
      type: 'cost',
      title: '$100',
      description: '累计消费 $100',
      target: 100,
      current: 24.80,
      achieved: false,
    },
    {
      id: '9',
      type: 'cost',
      title: '$500',
      description: '累计消费 $500',
      target: 500,
      current: 24.80,
      achieved: false,
    },
    
    // Streak Milestones
    {
      id: '10',
      type: 'streak',
      title: '7天连续',
      description: '连续使用 7 天',
      target: 7,
      current: 42,
      achieved: true,
      achievedAt: '2025-12-25T00:00:00Z',
    },
    {
      id: '11',
      type: 'streak',
      title: '30天连续',
      description: '连续使用 30 天',
      target: 30,
      current: 42,
      achieved: true,
      achievedAt: '2026-01-18T00:00:00Z',
    },
    {
      id: '12',
      type: 'streak',
      title: '100天连续',
      description: '连续使用 100 天',
      target: 100,
      current: 42,
      achieved: false,
    },
    {
      id: '13',
      type: 'streak',
      title: '365天连续',
      description: '连续使用 365 天',
      target: 365,
      current: 42,
      achieved: false,
    },
    
    // Savings Milestones (optional, based on using cheaper models)
    {
      id: '14',
      type: 'savings',
      title: '节省 $10',
      description: '相比官方价格节省 $10',
      target: 10,
      current: 5.60,
      achieved: false,
    },
    {
      id: '15',
      type: 'savings',
      title: '节省 $50',
      description: '相比官方价格节省 $50',
      target: 50,
      current: 5.60,
      achieved: false,
    },
    {
      id: '16',
      type: 'savings',
      title: '节省 $100',
      description: '相比官方价格节省 $100',
      target: 100,
      current: 5.60,
      achieved: false,
    },
  ];
}
```

**Step 2: Commit**

```bash
git add apps/desktop/src/lib/mockAnalytics.ts
git commit -m "feat(desktop): complete milestone data with all design requirements"
```

---

