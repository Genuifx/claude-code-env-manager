# Taste Spec Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Implement the product design taste specification — i18n, information density, state matrix, FTUE, delight moments, keyboard shortcuts, and cleanup.

**Architecture:** Lightweight i18n with `useLocale()` hook + JSON dictionaries. All UI changes are CSS/React, no Rust backend changes needed. Each task is self-contained and testable via Tauri MCP Server screenshot/snapshot.

**Tech Stack:** React, Tailwind CSS, Zustand, Tauri v2, Lucide icons, localStorage for i18n + FTUE flags.

**Source specs:**
- `docs/plans/2026-02-08-product-design-taste-spec.md` (taste spec, 896 lines)
- `docs/plans/2026-02-08-visual-redesign-spec.md` (visual spec, 1279 lines)

---

## Audit Summary (2026-02-09)

| Category | Count | Details |
|----------|-------|---------|
| Chinese strings to migrate | 101 | Dashboard(13), Sessions(8), Environments(15), Analytics(27), Skills(14), Settings(24) |
| Emoji to replace | 6 | Skills(3 unicode emoji), Sessions(3 symbol chars) |
| Hardcoded colors | ~40 | slate-*, emerald-*, blue-*, purple-*, teal-* across 6 pages |
| Keyboard shortcuts | 0 | None implemented anywhere |
| Loading/skeleton states | 1 | Only Analytics has loading (Chinese text) |
| Empty states | 1 | Only Sessions has proper empty state |
| Error states | 0 | All pages use console.error only |
| FTUE elements | 0 | No ghost cards, amber dots, or tracking flags |
| Delight moments | 0 | No launch button feel, count-up, or heatmap glow |
| Legacy files | 1 | TabNav.tsx (old horizontal tabs, unused) |

---

## Task 1: i18n Infrastructure

**Files:**
- Create: `apps/desktop/src/locales/zh.json`
- Create: `apps/desktop/src/locales/en.json`
- Create: `apps/desktop/src/locales/index.ts`

**What to build:**

1. Create `src/locales/index.ts` with:
   - `LocaleProvider` React context
   - `useLocale()` hook returning `{ t, lang, setLang }`
   - `t(key)` function that reads from active locale JSON
   - Locale persisted in `localStorage` under key `ccem-locale`
   - Default: `'zh'`

2. Create `src/locales/zh.json` with ALL 101 Chinese strings organized by page:
   ```json
   {
     "common": { "cancel": "取消", "delete": "删除", "edit": "编辑", "save": "保存" },
     "dashboard": { "currentEnv": "当前环境", "permissions": "权限", ... },
     "sessions": { ... },
     "environments": { ... },
     "analytics": { ... },
     "skills": { ... },
     "settings": { ... }
   }
   ```

3. Create `src/locales/en.json` with English translations for all 101 strings.

4. Wrap `<App>` in `<LocaleProvider>` in `App.tsx`.

**Technical terms that stay English in BOTH locales:** Token, API Key, Session, Claude Code, yolo/dev/safe/readonly/ci/audit, GLM, Kimi, DeepSeek, MiniMax.

**Test:** App renders without errors. `useLocale()` returns `t` function. Switching `localStorage('ccem-locale')` to `'en'` and reloading shows English.

---

## Task 2: Dashboard.tsx i18n + Color Cleanup

**Files:**
- Modify: `apps/desktop/src/pages/Dashboard.tsx`

**Changes:**

1. Replace all 13 Chinese hardcoded strings with `t()` calls
2. Replace hardcoded colors:
   - `blue-100/700/900/300` → `bg-chart-2/15 text-chart-2` (or semantic tokens)
   - `purple-100/700/900/300` → `bg-chart-4/15 text-chart-4`
   - All `text-slate-*` → `text-foreground` / `text-muted-foreground`
3. Remove Rocket icon from launch button (taste spec: text "启动"/"Launch" alone is sufficient)

**Chinese strings to replace:**
- `当前环境` → `t('dashboard.currentEnv')`
- `权限` → `t('dashboard.permissions')`
- `个会话运行中` → `t('dashboard.sessionsRunning')`
- `启动 Claude Code` → `t('dashboard.launch')`
- `环境` → `t('dashboard.environment')`
- `更改目录` / `选择目录` → `t('dashboard.changeDir')` / `t('dashboard.selectDir')`
- `工作目录:` → `t('dashboard.workingDir')`
- `运行中会话` → `t('dashboard.runningSessions')`
- `今日 Tokens` → `t('dashboard.todayTokens')`
- `今日消费` → `t('dashboard.todayCost')`
- `最近项目` → `t('dashboard.recentProjects')`

**Test:** Screenshot Dashboard in zh and en. No Chinese visible when locale=en. No hardcoded colors (no blue/purple/slate in source).

---

## Task 3: Sessions.tsx i18n + Custom Dialogs + Cleanup

**Files:**
- Modify: `apps/desktop/src/pages/Sessions.tsx`

**Changes:**

1. Replace all 8 Chinese strings with `t()` calls
2. Replace `confirm()` browser dialogs with inline confirmation (per taste spec operation weight: Irreversible → inline confirmation)
   - Single session terminate: inline confirmation replaces action row
   - Close all: custom modal with consequence description
3. Replace symbol characters with Lucide icons:
   - `⊞` → `<LayoutGrid />` icon
   - `—` → `<Minimize2 />` icon
   - `✕` → `<X />` icon
4. Replace hardcoded `slate-*` colors with semantic tokens

**Chinese strings to replace:**
- `确定要关闭此会话吗？` → inline confirmation UI
- `确定要关闭所有会话吗？` → modal with `t('sessions.closeAllConfirm')`
- `新会话` → `t('sessions.newSession')`
- `布局控制:` → `t('sessions.layoutControls')`
- `4分屏` → `t('sessions.tile4up')`
- `全部最小化` → `t('sessions.minimizeAll')`
- `全部关闭` → `t('sessions.closeAll')`
- `(4分屏: 未来功能)` → `t('sessions.tile4upFuture')`

**Test:** Screenshot Sessions page. Test inline confirmation for terminate. Test close-all modal. No Chinese when locale=en.

---

## Task 4: Environments.tsx i18n + Color Cleanup

**Files:**
- Modify: `apps/desktop/src/pages/Environments.tsx`

**Changes:**

1. Replace all 15 Chinese strings with `t()` calls
2. Replace hardcoded colors:
   - `emerald-*`, `teal-*` gradient buttons → `bg-primary` / `bg-primary/15`
   - `slate-*` → `text-foreground` / `text-muted-foreground`
3. Add active environment ring: `ring-1 ring-primary/40` on current env card
4. Simplify preset grid (taste spec: "over-designed for a 4-item selection")

**Chinese strings to replace:**
- `环境管理` → `t('environments.title')`
- `配置和管理你的 API 环境` → `t('environments.subtitle')`
- `添加环境` → `t('environments.add')`
- `已配置的环境` → `t('environments.configured')`
- `权限模式` → `t('environments.permissionMode')`
- `默认权限` → `t('environments.defaultPerm')`
- `用户级别，所有环境通用` → `t('environments.userLevel')`
- `快速切换 (临时)` → `t('environments.quickSwitch')`
- `临时权限仅对下次启动生效...` → `t('environments.tempPermHint')`
- `从预设添加` → `t('environments.addFromPreset')`
- Preset descriptions (GLM, Kimi, MiniMax, DeepSeek) → `t('environments.preset.*')`
- `API 配置` → `t('environments.apiConfig')`

**Test:** Screenshot Environments page. Active env has amber ring. No emerald/teal/slate colors. No Chinese when locale=en.

---

## Task 5: Analytics.tsx i18n + Color Cleanup

**Files:**
- Modify: `apps/desktop/src/pages/Analytics.tsx`

**Changes:**

1. Replace all 27 Chinese strings with `t()` calls (largest page)
2. Replace date locale: `'zh-CN'` → dynamic based on `lang` from `useLocale()`
3. Replace hardcoded colors with semantic tokens
4. Change milestone labels to use `t()`:
   - `累计使用 100K tokens` → `t('analytics.milestone100k')`
   - `第一个 $10` → `t('analytics.milestoneFirst10')`
   - etc.
5. Remove `新纪录!` and `继续保持!` text (taste spec: milestones are silent state changes)
6. Change `加载中...` to skeleton screen (taste spec: "skeleton screens, never spinners")
7. Change `Demo 数据` banner text to use `t()`, gate behind `import.meta.env.DEV`

**Test:** Screenshot Analytics page. Milestones have no celebratory text. Loading shows skeleton. No Chinese when locale=en. Date formatting follows locale.

---

## Task 6: Skills.tsx i18n + Emoji Removal + Real Data

**Files:**
- Modify: `apps/desktop/src/pages/Skills.tsx`

**Changes:**

1. Replace all 14 Chinese strings with `t()` calls
2. Replace 3 unicode emoji with Lucide icons:
   - `\u{1F4E6}` (Package) → `<Package />` from lucide-react
   - `\u{1F527}` (Wrench) → `<Wrench />` from lucide-react
   - `\u{1F4A1}` (Lightbulb) → `<Lightbulb />` from lucide-react
3. Replace hardcoded `violet-*`, `purple-*`, `slate-*` with semantic tokens
4. Replace `mockSkills` with real data from Tauri backend (or show actual empty state)
5. Fix unreachable empty state (currently gated by always-truthy mock data)

**Test:** Screenshot Skills page. No emoji visible. No purple/violet/slate colors. Empty state works if no skills installed. No Chinese when locale=en.

---

## Task 7: Settings.tsx i18n + Language Switcher + Auto-Save

**Files:**
- Modify: `apps/desktop/src/pages/Settings.tsx`

**Changes:**

1. Replace all 24 Chinese strings with `t()` calls
2. Replace hardcoded `slate-*`, `blue-600` colors with semantic tokens
3. Add **Language switcher** to Appearance section:
   - Radio buttons: `● 中文  ○ English`
   - Label is bilingual: `语言 / Language`
   - Uses `setLang()` from `useLocale()`
   - Takes effect instantly (no restart)
4. Convert from manual save button to **auto-save** (taste spec: "A save button at page bottom is a dead zone nobody finds"):
   - Each toggle/select change auto-saves
   - Remove "保存设置" button
   - Brief inline confirmation per setting (switch animates, done)
5. Keep `max-w-lg` content width constraint (already present)

**Test:** Screenshot Settings in zh. Switch language to en, verify all text changes. Change theme, verify auto-saves. No save button visible.

---

## Task 8: Information Density Adjustments

**Files:**
- Modify: `apps/desktop/src/pages/Dashboard.tsx`
- Modify: `apps/desktop/src/pages/Analytics.tsx`
- Modify: `apps/desktop/src/pages/Skills.tsx`
- Modify: `apps/desktop/src/pages/Environments.tsx`

**Changes per taste spec Section 4:**

**Dashboard (3→5):**
- Reduce launch button area from `py-12` to `py-6` (if applicable)
- Force stat cards to `grid-cols-3` (remove responsive `md:` breakpoint)
- Reduce section gaps from `space-y-6` to `space-y-5`

**Analytics (7→5):**
- Reduce chart card padding from `p-6` to `p-4`
- Place Model Distribution + Heatmap side-by-side: `grid grid-cols-2 gap-4` on ≥1024px
- Change milestones from `grid-cols-4` to horizontal flex: `flex gap-3 overflow-x-auto`
- Unify stat card values to `text-2xl` (not `text-3xl`)

**Skills (2→5):**
- Change layout from `space-y-8` vertical to `grid grid-cols-1 lg:grid-cols-3` (skills 2 cols, CLI hint 1 col)
- Compact empty state: `py-8` instead of large gradient box

**Environments:**
- Reduce `space-y-8` page spacing to match dashboard pattern
- Simplify presets grid

**Test:** Screenshot each page. Compare information density visually — should feel like "instrument panel" not "toy" or "spreadsheet."

---

## Task 9: State Matrix — Skeleton Loading States

**Files:**
- Create: `apps/desktop/src/components/ui/skeleton-states.tsx`
- Modify: `apps/desktop/src/pages/Dashboard.tsx`
- Modify: `apps/desktop/src/pages/Sessions.tsx`
- Modify: `apps/desktop/src/pages/Environments.tsx`
- Modify: `apps/desktop/src/pages/Analytics.tsx`
- Modify: `apps/desktop/src/pages/Skills.tsx`
- Modify: `apps/desktop/src/pages/Settings.tsx`
- Modify: `apps/desktop/src/store/index.ts` (add per-domain loading flags)

**Changes per taste spec Section 5:**

1. Add per-domain loading flags to Zustand store:
   ```ts
   isLoadingEnvs: boolean
   isLoadingSessions: boolean
   isLoadingStats: boolean
   isLoadingSkills: boolean
   isLoadingSettings: boolean
   ```

2. Create skeleton components matching each page's layout:
   - Environment skeletons: 3 cards, ~120px each, shimmer name/URL/key blocks
   - Session skeletons: 4 cards in 2x2 grid, shimmer dot/name/badges/buttons
   - Analytics skeletons: 3 stat cards + chart + distribution + heatmap + milestones (all load as one unit)
   - Skills skeletons: 2 compact cards
   - Settings: delayed skeleton (200ms threshold)

3. Use `.skeleton-shimmer` CSS class (already in index.css)

**Test:** Temporarily set loading flags to true. Screenshot each page — should show shimmer skeletons matching the layout shape. No spinners anywhere.

---

## Task 10: State Matrix — Empty States + Error States

**Files:**
- Create: `apps/desktop/src/components/ui/EmptyState.tsx`
- Modify: All 6 page files

**Changes per taste spec Section 5:**

1. Create shared `<EmptyState>` component:
   ```tsx
   <EmptyState
     icon={Terminal}
     message="No active sessions"
     action="Launch Claude Code"
     onAction={handleLaunch}
   />
   ```
   Pattern: muted icon (48px, `text-muted-foreground/20`) + factual text (`text-sm text-muted-foreground`) + action button (`variant="outline" size="sm"`)

2. Per-page empty states:
   - Dashboard: stat cards show `0` / `$0.00` / `0 days` (real zeros, not N/A)
   - Sessions: already has empty state — verify it matches spec pattern
   - Environments: impossible (official always exists) — add error recovery banner for corrupt config
   - Analytics (zero): stat cards show zeros, empty chart with guidance text, blank heatmap grid
   - Skills (zero): Sparkles icon + "No skills installed" + [Add Skill]
   - Settings: N/A (always has defaults)

3. Per-page error states (inline banners, never full-page):
   - Use inline `bg-destructive/10 border border-destructive/20 rounded-lg p-4`
   - Include [Retry] button
   - Technical details → console.log only

**Test:** Screenshot empty states for Sessions, Skills, Analytics. Screenshot error banner appearance.

---

## Task 11: FTUE System

**Files:**
- Modify: `apps/desktop/src/pages/Dashboard.tsx`
- Modify: `apps/desktop/src/pages/Environments.tsx`
- Modify: `apps/desktop/src/pages/Analytics.tsx`

**Changes per taste spec Section 6:**

1. **FTUE localStorage flags:**
   - `ccem-ftue-launched`: set after first successful launch
   - `ccem-ftue-envs-added`: set after adding first custom environment
   - `ccem-ftue-analytics-seen`: set after first Analytics tab visit

2. **"Add more environments →" link on Dashboard:**
   - Below quick actions area
   - `text-sm text-primary hover:underline`
   - Navigates to Environments tab
   - Disappears when `ccem-ftue-envs-added` is true

3. **Ghost card on Environments tab:**
   - Dashed border card with `+` icon and "Add Environment" text
   - Preset hints: `GLM-4 · Kimi · DeepSeek · MiniMax` in `text-xs text-muted-foreground/40`
   - Hover brightens to `/60`
   - Only shows when `environments.length <= 1`

4. **Amber dot indicators on Dashboard stat cards:**
   - 4px amber dot next to zero values
   - Conditional: `value === 0 && !localStorage.getItem('ccem-ftue-launched')`
   - Disappears after first launch

5. **Analytics FTUE:**
   - Set flag on first visit
   - Show "Start using Claude Code to see your usage trends here." when zero data

**Test:** Clear all `ccem-ftue-*` from localStorage. Screenshot Dashboard (should show amber dots + "Add more environments" link). Screenshot Environments (should show ghost card). Add env, launch session — verify indicators disappear.

---

## Task 12: Delight Moment #1 — Launch Button Physical Response

**Files:**
- Modify: `apps/desktop/src/pages/Dashboard.tsx`

**Changes per taste spec Section 10:**

1. Launch button press effect:
   - `active:translate-y-0.5 active:shadow-md` (CSS press-in)
   - Hover: `hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30`
   - After launch succeeds: text briefly shows "已启动 ✓" / "Launched ✓" (1s), then returns to normal

2. Implementation:
   ```tsx
   const [launched, setLaunched] = useState(false);
   // After successful launch:
   setLaunched(true);
   setTimeout(() => setLaunched(false), 1000);
   ```

**Test:** Screenshot button at rest, during hover (if possible via MCP), and after launch (should show "Launched ✓" text briefly).

---

## Task 13: Delight Moment #2 — Number Count-Up

**Files:**
- Create: `apps/desktop/src/hooks/useCountUp.ts`
- Modify: `apps/desktop/src/pages/Dashboard.tsx`
- Modify: `apps/desktop/src/pages/Analytics.tsx`

**Changes per taste spec Section 10:**

1. Create `useCountUp` hook:
   ```ts
   function useCountUp(target: number, duration = 800) {
     const [value, setValue] = useState(0);
     useEffect(() => {
       const start = value;
       const delta = target - start;
       const startTime = performance.now();
       function tick(now: number) {
         const elapsed = now - startTime;
         const progress = Math.min(elapsed / duration, 1);
         const eased = 1 - Math.pow(1 - progress, 3); // decelerate
         setValue(Math.round(start + delta * eased));
         if (progress < 1) requestAnimationFrame(tick);
       }
       requestAnimationFrame(tick);
     }, [target]);
     return value;
   }
   ```

2. Apply to stat card values on Dashboard and Analytics:
   - Token count: `useCountUp(totalTokens)`
   - Cost: `useCountUp(totalCost * 100) / 100` (for 2 decimal places)
   - Streak days: `useCountUp(streakDays)`

3. Count-up happens once per page load, not on every re-render.

**Test:** Navigate to Dashboard — numbers should count up from 0 to target over 800ms. Navigate away and back — should count up again.

---

## Task 14: Delight Moment #3 — Heatmap Amber Glow

**Files:**
- Modify: `apps/desktop/src/components/analytics/HeatmapCalendar.tsx`

**Changes per taste spec Section 10:**

1. Use amber intensity scale (5 levels):
   - Empty: `bg-transparent`
   - Low: `bg-primary/15`
   - Medium: `bg-primary/40`
   - High: `bg-primary/70`
   - Max: `bg-primary`

2. Fade-in: add `.heatmap-enter` class to container (already defined in index.css)

3. Hover effect: `hover:brightness-110 transition-[filter] duration-150`

4. Tooltip on hover: "Feb 7, 2026 — 12.4K tokens — $0.18" (date + tokens + cost)

**Test:** Screenshot heatmap in dark mode — should show amber cells on dark background. Verify the 5 intensity levels are visually distinct.

---

## Task 15: Keyboard Shortcuts

**Files:**
- Create: `apps/desktop/src/hooks/useKeyboardShortcuts.ts`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/pages/Dashboard.tsx`
- Modify: `apps/desktop/src/pages/Sessions.tsx`
- Modify: `apps/desktop/src/components/layout/SideRail.tsx` (add tooltips with shortcut hints)

**Changes per taste spec Section 9:**

1. **Global shortcuts** (registered in App.tsx):
   - `Cmd+1` through `Cmd+6`: switch tabs
   - `Cmd+Enter`: launch Claude Code
   - `Cmd+N`: new session (= launch)
   - `Cmd+,`: open Settings
   - `Cmd+W`: minimize to tray or close

2. **Home tab shortcuts:**
   - `Cmd+O`: open directory picker
   - `Cmd+E` / `Cmd+Shift+E`: cycle environment
   - `Cmd+P`: cycle permission mode

3. **Sessions tab shortcuts:**
   - `Cmd+Shift+1-8`: focus Nth session terminal
   - `Cmd+L`: toggle card/list view
   - `Cmd+Shift+M`: minimize all

4. **Tooltip updates on SideRail:** "Home (⌘1)", "Sessions (⌘2)", etc.

5. **Button tooltips:** "Launch (⌘Enter)" on launch button.

**Test:** Press Cmd+2 — should switch to Sessions tab. Press Cmd+Enter — should launch. Hover SideRail items — tooltips should show shortcuts.

---

## Task 16: Cleanup — Remove Legacy + Final Polish

**Files:**
- Delete: `apps/desktop/src/components/layout/TabNav.tsx`
- Modify: Any remaining hardcoded color references
- Verify: All `page-transition-enter` classes on page root divs

**Changes:**

1. Delete `TabNav.tsx` (legacy horizontal tabs, unused since SideRail)
2. Grep for any remaining `slate-`, `emerald-`, `teal-`, `blue-600`, `purple-` hardcoded colors and replace with semantic tokens
3. Verify every page root div has `page-transition-enter` class
4. Verify `prefers-reduced-motion` media query works
5. Verify minimum window size is 880x640 in tauri.conf.json

**Test:** Full app screenshot in both themes (dark/light). No legacy colors. Page transitions work. Reduced motion respected.

---

## Execution Order & Dependencies

```
Task 1 (i18n infra) ──────────────────────────────────────┐
    │                                                      │
    ├── Task 2 (Dashboard i18n)                            │
    ├── Task 3 (Sessions i18n)                             │
    ├── Task 4 (Environments i18n)                         │
    ├── Task 5 (Analytics i18n)          All depend on     │
    ├── Task 6 (Skills i18n)             Task 1            │
    ├── Task 7 (Settings i18n + lang)                      │
    │                                                      │
    ├── Task 8 (Density adjustments)     Independent       │
    ├── Task 9 (Skeleton loading)        Independent       │
    ├── Task 10 (Empty/Error states)     After Task 9      │
    │                                                      │
    ├── Task 11 (FTUE system)            After Tasks 2,4   │
    ├── Task 12 (Launch button delight)  After Task 2      │
    ├── Task 13 (Count-up delight)       After Tasks 2,5   │
    ├── Task 14 (Heatmap glow)           Independent       │
    ├── Task 15 (Keyboard shortcuts)     Independent       │
    └── Task 16 (Cleanup + polish)       LAST              │
```

**Parallelizable groups (after Task 1):**
- Group A: Tasks 2-7 (i18n, sequential per file)
- Group B: Tasks 8-10 (density + states, semi-parallel)
- Group C: Tasks 11-15 (features, semi-parallel)
- Task 16: always last

---

## Self-Test Protocol

After EACH task, the implementer MUST:

1. Run `pnpm run build` in `apps/desktop/` to verify no TypeScript errors
2. Connect to running Tauri app via `driver_session` (start action)
3. Take screenshot via `webview_screenshot` to verify visual changes
4. Take DOM snapshot via `webview_dom_snapshot` (type: accessibility) to verify text content
5. If i18n task: switch locale and re-screenshot to verify both languages
6. Disconnect session

If the app is not running, start it with `cd apps/desktop && pnpm tauri dev` first.
