# CCEM Desktop Dashboard v2 — Implementation Spec

> Created: 2026-02-09
> Based on: Agent Team Report (`2026-02-09-dashboard-redesign-team.md`)
> Status: Ready for implementation
> All Challenger conditions resolved ✅

---

## 0. Challenger Resolutions

Before the spec begins, here are the explicit resolutions for each Challenger issue:

### P0-1: 最小窗口 880×640 垂直溢出

**Resolution:** Recent Projects 默认显示 4 个（2×2），当内容区高度 ≥ 520px 时扩展为 6 个（2×3）。Pulse Bar 在最小窗口下需要滚动，这是可接受的——它是次要信息。

**垂直空间预算 (640px 窗口):**

| 区域 | 高度 |
|------|------|
| PageHeader | 48px |
| py-6 上间距 | 24px |
| Launch Strip | 56px (h-14) |
| gap | 24px |
| "最近项目" 标题行 | 28px |
| 2 行项目卡片 (2×2) | 2 × 72px + 16px gap = 160px |
| gap | 24px |
| Pulse Bar | 40px |
| py-6 下间距 | 24px |
| **总计** | **428px** ✅ (首屏完整可见) |

剩余 640 - 48 - 428 = 164px 的安全余量。

### P0-2: Recent Projects 点击启动的环境/权限歧义

**Resolution:** 采用"直接启动"方案。项目卡片点击后**始终使用当前 Launch Strip 中显示的环境和权限**直接启动 Claude Code。理由：

1. `launchClaudeCode()` 已有的实现就是用 `currentEnv` + `permissionMode` + `workingDir` 启动
2. 用户在 Launch Strip 中已经能看到当前环境和权限，这是确认过的上下文
3. "智能填充"方案增加了一次确认点击，违背了"1 次点击启动"的核心承诺

如果用户想换环境，先在 Launch Strip 中切换环境，再点击项目卡片——这是 2 步，与当前方案的 3-4 步相比仍然是显著改进。

### P1-1: Launch Strip 认知负荷

**Resolution:** 保持单行方案，但做以下调整降低认知负荷：

1. 环境和权限使用 compact badge 样式（不是原生 select），视觉上更像"标签"而非"表单控件"
2. 工作目录只显示最后一级文件夹名（如 `ccem`），hover 显示完整路径 tooltip
3. 启动按钮使用 primary 填充色 + `Rocket` 图标，是整行唯一的强视觉元素
4. 四个元素之间用 `|` 分隔线视觉分组：`[环境 | 权限 | 目录] ———— [启动]`

### P1-2: 视觉焦点引力

**Resolution:** 第一个项目卡片（"上次使用"）采用 `col-span-2` 占满两列宽度，内部展示更丰富的信息（项目名 + 路径 + 上次时间 + 上次环境/权限 + 大启动按钮）。这样 Recent Projects 区域的第一个元素就是视觉焦点，与"1 次点击继续上次"的目标完全对齐。

### P2: 环境身份过度简化

**Resolution:** Launch Strip 左侧添加 3px 宽的环境色条（使用 `chart-{N}` 颜色），不同环境对应不同颜色。这给 Launch Strip 一个微妙但可感知的"当前环境身份"视觉线索。

---

## 1. Final Layout

```
+--+--------------------------------------------------------------+
|  | PageHeader: "Dashboard"                                [48px] |
|S |--------------------------------------------------------------|
|i |                                                              |
|d | LAUNCH STRIP  (h-14, rounded-xl, env color left border)       |
|e | ┌────────────────────────────────────────────────────────────┐|
|R | │▌ [official ▾] │ [dev ▾] │ 📁 ccem           [🚀 启动]   │|
|a | └────────────────────────────────────────────────────────────┘|
|i |                                                              |
|l | 最近项目                                      [查看全部 >]    |
|  | ┌────────────────────────────────────────────────────────────┐|
|6 | │  ★ HERO CARD (col-span-2)                                 │|
|4 | │  claude-code-env-manager         上次: official · dev      │|
|p | │  ~/G/Github/ccem · 2 小时前               [▶ 继续工作]    │|
|x | └────────────────────────────────────────────────────────────┘|
|  | ┌───────────────────────┐  ┌───────────────────────┐         |
|  | │ my-website            │  │ api-server            │         |
|  | │ ~/Projects/web · 3天前 │  │ ~/Projects/api · 5天前│         |
|  | │                  [▶]  │  │                  [▶]  │         |
|  | └───────────────────────┘  └───────────────────────┘         |
|  |                                                              |
|  | PULSE BAR (text-sm, bg-muted/30)                              |
|  | ┌────────────────────────────────────────────────────────────┐|
|  | │  12.4K tokens · $1.23 today · 2 sessions active    详情 > │|
|  | └────────────────────────────────────────────────────────────┘|
|  |                                                              |
+--+--------------------------------------------------------------+
```

---

## 2. Component Spec

### 2.1 Dashboard.tsx (Page Container)

**File:** `apps/desktop/src/pages/Dashboard.tsx`

**Action:** Rewrite

**Props (unchanged):**
```ts
interface DashboardProps {
  onNavigate: (tab: string) => void;
  onLaunch: () => void;
  onLaunchWithDir: (dir: string) => void;
}
```

**Structure:**
```tsx
<div className="page-transition-enter space-y-6">
  <LaunchStrip
    currentEnv={currentEnv}
    environments={environments}
    permissionMode={permissionMode}
    selectedWorkingDir={selectedWorkingDir}
    onSwitchEnv={switchEnvironment}
    onSetPermMode={setPermissionMode}
    onSelectDir={handleSelectDirectory}
    onLaunch={handleLaunchClick}
  />

  <RecentProjects
    favorites={favorites}
    recent={recent}
    sessions={sessions}
    onLaunch={onLaunchWithDir}
    onNavigate={onNavigate}
  />

  <PulseBar
    usageStats={usageStats}
    sessionCount={sessions.filter(s => s.status === 'running').length}
    onNavigate={onNavigate}
  />
</div>
```

**Removed from current Dashboard:**
- Status bar (当前环境 + 权限 + 会话数) — absorbed into Launch Strip
- py-12 大按钮启动中心 — replaced by Launch Strip
- 原生 `<select>` 环境/权限选择器 — replaced by BadgeDropdown
- 三张统计 Card — replaced by Pulse Bar
- `<ProjectList />` 组件引用 — replaced by RecentProjects

---

### 2.2 LaunchStrip.tsx

**File:** `apps/desktop/src/components/dashboard/LaunchStrip.tsx`

**Props:**
```ts
interface LaunchStripProps {
  currentEnv: string;
  environments: Environment[];
  permissionMode: PermissionModeName;
  selectedWorkingDir: string | null;
  onSwitchEnv: (name: string) => void;
  onSetPermMode: (mode: PermissionModeName) => void;
  onSelectDir: () => void;
  onLaunch: () => void;
}
```

**Layout (single row, h-14):**
```
┌──────────────────────────────────────────────────────────┐
│▌ [official ▾]  │  [dev ▾]  │  📁 ccem          [🚀 启动] │
│                                                          │
│ 3px env        separator    separator          primary   │
│ color bar      border-r     border-r           button    │
└──────────────────────────────────────────────────────────┘
```

**CSS classes:**
```
Container:
  h-14 flex items-center gap-0 rounded-xl
  bg-card border border-border
  overflow-hidden

Env color bar (leftmost):
  w-[3px] h-full self-stretch
  bg-chart-{N}  (mapped by env name)

Env badge section:
  flex items-center gap-2 px-4
  border-r border-border/50

Perm badge section:
  flex items-center gap-2 px-4
  border-r border-border/50

Dir section:
  flex-1 flex items-center gap-2 px-4 min-w-0
  truncate

Launch button:
  h-14 px-6 rounded-none rounded-r-xl
  bg-primary text-primary-foreground
  hover:bg-primary/90
  flex items-center gap-2
  font-medium
```

**Environment color mapping:**
```ts
const ENV_COLORS: Record<string, string> = {
  official: 'bg-chart-1',  // amber
  glm:      'bg-chart-2',  // steel blue
  deepseek: 'bg-chart-3',  // green
  kimi:     'bg-chart-4',  // purple
  minimax:  'bg-chart-5',  // burnt sienna
};
// Fallback: bg-primary for unknown envs
```

**BadgeDropdown (inline, not a separate component file — kept simple):**
```tsx
// Env badge: clickable, opens native <select> overlaid
<div className="relative">
  <button
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
      text-xs font-medium bg-primary/10 text-primary
      hover:bg-primary/15 transition-colors"
    onClick={() => selectRef.current?.click()}
  >
    <Globe className="w-3.5 h-3.5" />
    {currentEnv}
    <ChevronDown className="w-3 h-3 opacity-60" />
  </button>
  <select
    ref={selectRef}
    className="absolute inset-0 opacity-0 cursor-pointer"
    value={currentEnv}
    onChange={(e) => onSwitchEnv(e.target.value)}
  >
    {environments.map(env => (
      <option key={env.name} value={env.name}>{env.name}</option>
    ))}
  </select>
</div>

// Perm badge: same pattern, purple color
<div className="relative">
  <button
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
      text-xs font-medium bg-purple-500/10 text-purple-600
      dark:text-purple-400 hover:bg-purple-500/15 transition-colors"
  >
    <Shield className="w-3.5 h-3.5" />
    {permissionMode}
    <ChevronDown className="w-3 h-3 opacity-60" />
  </button>
  <select ...>{/* permission options */}</select>
</div>
```

**Dir section:**
```tsx
<div className="flex-1 flex items-center gap-2 px-4 min-w-0">
  <button
    onClick={onSelectDir}
    className="flex items-center gap-2 min-w-0 text-sm text-muted-foreground
      hover:text-foreground transition-colors"
    title={selectedWorkingDir || '选择工作目录'}
  >
    <FolderOpen className="w-4 h-4 flex-shrink-0" />
    <span className="truncate">
      {selectedWorkingDir
        ? getBasename(selectedWorkingDir)
        : '选择目录...'}
    </span>
  </button>
</div>
```

**Launch button:**
```tsx
<Button
  onClick={onLaunch}
  className="h-14 px-6 rounded-none rounded-r-xl gap-2 font-medium text-sm
    shadow-none hover:shadow-none"
>
  <Rocket className="w-4 h-4" />
  启动
</Button>
```

**Helper function:**
```ts
function getBasename(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
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
```

---

### 2.3 RecentProjects.tsx

**File:** `apps/desktop/src/components/dashboard/RecentProjects.tsx`

**Props:**
```ts
interface RecentProjectsProps {
  favorites: FavoriteProject[];
  recent: RecentProject[];
  sessions: Session[];
  onLaunch: (workingDir: string) => void;
  onNavigate: (tab: string) => void;
}
```

**Smart merge logic (收藏 + 最近合并为一个列表):**
```ts
interface MergedProject {
  path: string;
  name: string;
  lastUsed: string | null;
  isFavorite: boolean;
  hasActiveSession: boolean;
}

function mergeProjects(
  favorites: FavoriteProject[],
  recent: RecentProject[],
  sessions: Session[]
): MergedProject[] {
  const merged = new Map<string, MergedProject>();
  const activePaths = new Set(
    sessions.filter(s => s.status === 'running').map(s => s.workingDir)
  );

  // Add favorites first (they get priority in dedup)
  for (const fav of favorites) {
    merged.set(fav.path, {
      path: fav.path,
      name: fav.name,
      lastUsed: null,
      isFavorite: true,
      hasActiveSession: activePaths.has(fav.path),
    });
  }

  // Add/update with recent data
  for (const rec of recent) {
    const existing = merged.get(rec.path);
    if (existing) {
      existing.lastUsed = rec.lastUsed;
    } else {
      merged.set(rec.path, {
        path: rec.path,
        name: getBasename(rec.path),
        lastUsed: rec.lastUsed,
        isFavorite: false,
        hasActiveSession: activePaths.has(rec.path),
      });
    }
  }

  // Sort: most recently used first
  return Array.from(merged.values())
    .sort((a, b) => {
      if (!a.lastUsed && !b.lastUsed) return 0;
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    })
    .slice(0, 6); // Max 6 projects (P0-1 resolution: show 4 on small window)
}
```

**Layout:**
```tsx
<div>
  {/* Header row */}
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
      最近项目
    </h3>
    {mergedProjects.length > 0 && (
      <button
        onClick={() => onNavigate('environments')}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        查看全部 →
      </button>
    )}
  </div>

  {/* Project grid */}
  <div className="grid grid-cols-2 gap-3">
    {mergedProjects.length === 0 ? (
      <EmptyState onSelectDir={...} />
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
```

---

### 2.4 HeroProjectCard.tsx

**File:** `apps/desktop/src/components/dashboard/HeroProjectCard.tsx`

The first project card — col-span-2, richer info, prominent launch button.

**Props:**
```ts
interface HeroProjectCardProps {
  project: MergedProject;
  onLaunch: (workingDir: string) => void;
}
```

**Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│  ★ claude-code-env-manager                                     │
│  ~/G/Github/claude-code-env-manager · 2 小时前                  │
│                                                                │
│  ● 运行中 1 个会话                         [▶ 继续工作]         │
└────────────────────────────────────────────────────────────────┘
```

**CSS:**
```
col-span-2
bg-card border border-border rounded-xl p-4
border-l-[3px] border-l-primary
hover:border-primary/30 transition-colors
cursor-pointer
```

**Content:**
```tsx
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
        <div className="flex items-center gap-1.5 mt-2 text-xs text-success">
          <span className="w-1.5 h-1.5 rounded-full bg-success status-running" />
          运行中会话
        </div>
      )}
    </div>
    <Button
      size="sm"
      className="opacity-80 group-hover:opacity-100 transition-opacity"
      onClick={(e) => { e.stopPropagation(); onLaunch(project.path); }}
    >
      <Play className="w-3.5 h-3.5 mr-1.5" />
      继续工作
    </Button>
  </div>
</div>
```

---

### 2.5 ProjectCard.tsx

**File:** `apps/desktop/src/components/dashboard/ProjectCard.tsx`

Regular project card — single column width, compact.

**Props:**
```ts
interface ProjectCardProps {
  project: MergedProject;
  onLaunch: (workingDir: string) => void;
}
```

**Layout:**
```
┌───────────────────────────┐
│ my-website                │
│ ~/Projects/web · 3天前     │
│                      [▶]  │
└───────────────────────────┘
```

**CSS:**
```
bg-card border border-border rounded-xl p-3
hover:border-primary/30 transition-colors
cursor-pointer group
```

**Content:**
```tsx
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
          <span className="w-1.5 h-1.5 rounded-full bg-success status-running flex-shrink-0" />
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
```

---

### 2.6 PulseBar.tsx

**File:** `apps/desktop/src/components/dashboard/PulseBar.tsx`

Bottom info strip — single row, secondary importance.

**Props:**
```ts
interface PulseBarProps {
  usageStats: UsageStats | null;
  sessionCount: number;
  onNavigate: (tab: string) => void;
}
```

**Layout:**
```
┌────────────────────────────────────────────────────────────┐
│  12.4K tokens · $1.23 today · 2 sessions active    详情 > │
└────────────────────────────────────────────────────────────┘
```

**CSS:**
```
flex items-center justify-between
px-4 py-2.5 rounded-lg
bg-muted/30
text-sm text-muted-foreground
```

**Content:**
```tsx
<div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-muted/30">
  <div className="flex items-center gap-3 text-sm text-muted-foreground">
    <span>
      {formatTokens(totalTokens)} tokens
    </span>
    <span className="text-border">·</span>
    <span>
      ${todayCost.toFixed(2)} today
    </span>
    <span className="text-border">·</span>
    <span className="flex items-center gap-1.5">
      {sessionCount > 0 && (
        <span className="w-1.5 h-1.5 rounded-full bg-success status-running" />
      )}
      {sessionCount} sessions active
    </span>
  </div>
  <button
    onClick={() => onNavigate('analytics')}
    className="text-xs text-muted-foreground hover:text-primary transition-colors"
  >
    详情 →
  </button>
</div>
```

**Helper:**
```ts
function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}
```

---

### 2.7 Empty State

When there are no recent projects and no favorites:

```tsx
<div className="col-span-2 flex flex-col items-center justify-center py-12 text-center">
  <FolderOpen className="w-12 h-12 text-muted-foreground/20 mb-4" />
  <p className="text-sm text-muted-foreground mb-4">
    还没有项目记录
  </p>
  <Button variant="outline" size="sm" onClick={onSelectDir}>
    <FolderOpen className="w-4 h-4 mr-2" />
    选择一个目录开始
  </Button>
</div>
```

---

## 3. File Change Summary

### Files to CREATE:

| File | Description |
|------|-------------|
| `src/components/dashboard/LaunchStrip.tsx` | 核心：环境+权限+目录+启动，水平一行 |
| `src/components/dashboard/RecentProjects.tsx` | 智能合并列表 + 2 列 grid |
| `src/components/dashboard/HeroProjectCard.tsx` | 首个项目卡片，col-span-2 |
| `src/components/dashboard/ProjectCard.tsx` | 普通项目卡片 |
| `src/components/dashboard/PulseBar.tsx` | 底部信息条 |
| `src/components/dashboard/index.ts` | Barrel export |

### Files to MODIFY:

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Rewrite — 用新组件替代旧的启动中心/统计卡片/ProjectList |

### Files to DELETE (or stop importing):

| File | Reason |
|------|--------|
| `src/components/projects/ProjectList.tsx` | Replaced by RecentProjects — but keep the file, other pages may use it |

### Files UNCHANGED:

- `src/components/layout/AppLayout.tsx` — no changes needed
- `src/components/layout/PageHeader.tsx` — no changes needed (pageActions slot available if needed later)
- `src/components/layout/SideRail.tsx` — no changes needed
- `src/store/index.ts` — no new state needed, existing state sufficient
- `src/hooks/useTauriCommands.ts` — no changes needed
- `src/App.tsx` — no changes needed (Dashboard props unchanged)
- `src/index.css` — no changes needed (all needed tokens already present)
- `tailwind.config.js` — no changes needed (chart-* colors already mapped)

---

## 4. Data Flow

```
Store (Zustand)
  ├── currentEnv ──────────────────> LaunchStrip (env badge)
  ├── environments ────────────────> LaunchStrip (env dropdown options)
  ├── permissionMode ──────────────> LaunchStrip (perm badge)
  ├── selectedWorkingDir ──────────> LaunchStrip (dir display)
  ├── favorites ───────────────────> RecentProjects (merged list)
  ├── recent ──────────────────────> RecentProjects (merged list)
  ├── sessions ────────────────────> RecentProjects (active indicators)
  │                                  PulseBar (session count)
  └── usageStats ──────────────────> PulseBar (tokens + cost)

useTauriCommands
  ├── switchEnvironment ───────────> LaunchStrip.onSwitchEnv
  ├── openDirectoryPicker ─────────> LaunchStrip.onSelectDir
  └── launchClaudeCode ────────────> Dashboard.handleLaunchClick
                                     HeroProjectCard.onLaunch
                                     ProjectCard.onLaunch
```

---

## 5. Interaction Flows

### Flow A: Continue last project (most common, 1 click)

```
User opens app
  → LaunchStrip shows: [official ▾] [dev ▾] ccem
  → HeroProjectCard shows: "claude-code-env-manager, 2h ago"
  → User clicks HeroProjectCard
  → onLaunch("~/G/Github/claude-code-env-manager")
  → launchClaudeCode(dir) with currentEnv + permissionMode
  → Claude Code terminal opens
```

### Flow B: Launch different project (2 clicks)

```
User opens app
  → Sees project cards below hero
  → Clicks "my-website" ProjectCard
  → onLaunch("~/Projects/my-website")
  → Claude Code opens in that directory
```

### Flow C: Change environment first (2 clicks)

```
User opens app
  → Clicks env badge "official" in LaunchStrip
  → Selects "deepseek" from dropdown
  → switchEnvironment("deepseek") called
  → LaunchStrip env color bar changes to green
  → Clicks HeroProjectCard or any ProjectCard
  → Claude Code opens with deepseek env
```

### Flow D: New directory (2 clicks)

```
User opens app
  → Clicks folder icon in LaunchStrip dir section
  → System directory picker opens
  → Selects ~/Projects/new-project
  → selectedWorkingDir updates in store
  → Clicks 启动 button in LaunchStrip
  → Claude Code opens in new directory
```

### Flow E: Check stats (1 click)

```
User opens app
  → Glances at PulseBar: "12.4K tokens · $1.23 · 2 sessions"
  → Clicks "详情 →"
  → onNavigate('analytics')
  → Analytics page opens
```

---

## 6. Responsive Behavior

| Window Width | Adjustment |
|-------------|------------|
| 880-1023px | grid-cols-2, hero card col-span-2, max 4 projects |
| ≥ 1024px | grid-cols-2, hero card col-span-2, max 6 projects |
| ≥ 1200px | Consider grid-cols-3 for regular cards (hero stays col-span-2) |

| Window Height | Adjustment |
|--------------|------------|
| 640-719px | Show max 4 projects (2×2), Pulse Bar may scroll |
| ≥ 720px | Show max 6 projects (hero + 2×2 or 2×3), everything fits |

---

## 7. Lucide Icons Used

| Icon | Usage |
|------|-------|
| `Rocket` | Launch button in LaunchStrip |
| `Globe` | Environment badge indicator |
| `Shield` | Permission badge indicator |
| `FolderOpen` | Directory selector, empty state |
| `ChevronDown` | Badge dropdown arrows |
| `Play` | Project card launch buttons |
| `Star` | Favorite project indicator (filled) |

---

## 8. Implementation Order

1. **Create `src/components/dashboard/` directory** and `index.ts` barrel
2. **LaunchStrip.tsx** — core innovation, build first
3. **ProjectCard.tsx** — simple, reusable
4. **HeroProjectCard.tsx** — extends ProjectCard concept
5. **RecentProjects.tsx** — merge logic + grid layout
6. **PulseBar.tsx** — simplest component
7. **Rewrite Dashboard.tsx** — assemble all components
8. **Test at 880×640** — verify vertical space budget
9. **Test at 1440×900** — verify wide screen behavior
