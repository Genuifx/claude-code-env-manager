# Dashboard V3 Command Center — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite Dashboard as a Command Center with Launch Strip, 5-card Metrics Row, Quick Launch Grid, and Live Sessions panel — all fitting in one screen.

**Architecture:** Replace current 4-zone Dashboard (status header + action bar + bento grid + project list) with a compact 4-zone layout (Launch Strip 48px + Metrics Row 88px + Quick Launch Grid ~200px + conditional Live Sessions ~160px). Total ~500px, no scrolling needed.

**Tech Stack:** React 18, Zustand, Tailwind CSS, Lucide icons, glassmorphism design system, i18n via `t()`.

**Worktree:** `.worktrees/dashboard-v3` (branch `feat/dashboard-v3-command-center`)

---

## Task 1: Add i18n keys for new Dashboard

**Files:**
- Modify: `apps/desktop/src/locales/zh.json` (dashboard section)
- Modify: `apps/desktop/src/locales/en.json` (dashboard section)

Add new keys for: Cron status card, Live Sessions panel, Quick Launch Grid, All Projects modal.

**Commit:** `feat(i18n): add dashboard v3 locale keys`

---

## Task 2: Rewrite LaunchStrip component

**Files:**
- Rewrite: `apps/desktop/src/components/dashboard/LaunchStrip.tsx`

Compact 48px strip: env color bar + env select + perm select + recent dirs dropdown + Launch button.

**Commit:** `feat(dashboard): rewrite LaunchStrip as compact command bar`

---

## Task 3: Create MetricCard component + Metrics Row

**Files:**
- Create: `apps/desktop/src/components/dashboard/MetricCard.tsx`
- Create: `apps/desktop/src/components/dashboard/MetricsRow.tsx`

5 equal-width cards: Sessions, Tokens, Cost, Streak, Cron. Each with icon + label + animated value + sublabel. Click navigates to relevant page.

**Commit:** `feat(dashboard): add MetricCard and MetricsRow components`

---

## Task 4: Create QuickLaunchGrid component

**Files:**
- Create: `apps/desktop/src/components/dashboard/QuickLaunchGrid.tsx`

3-column grid of favorite projects + inline recent projects row + "View All" link.

**Commit:** `feat(dashboard): add QuickLaunchGrid component`

---

## Task 5: Create AllProjectsModal component

**Files:**
- Create: `apps/desktop/src/components/dashboard/AllProjectsModal.tsx`

Dialog with 4 tabs (Favorites / Recent / VS Code / JetBrains). VS Code and JetBrains tabs have sync refresh buttons.

**Commit:** `feat(dashboard): add AllProjectsModal with tabbed project list`

--Task 6: Create LiveSessions component

**Files:**
- Create: `apps/desktop/src/components/dashboard/LiveSessions.tsx`

Conditional panel showing running sessions with Focus/Close actions and Arrange button.

**Commit:** `feat(dashboard): add LiveSessions panel component`

---

## Task 7: Rewrite Dashboard page + update skeleton + update exports

**Files:**
- Rewrite: `apps/desktop/src/pages/Dashboard.tsx`
- Modify: `apps/desktop/src/components/dashboard/index.ts`
- Modify: `apps/desktop/src/components/ui/skeleton-states.tsx` (DashboardSkeleton)

Wire all new components together. Update skeleton to match new layout. Update barrel exports.

**Commit:** `feat(dashboard): rewrite Dashboard page as Command Center v3`

---

## Task 8: Visual QA with Tauri dev server

Start `tauri dev`, screenshot, verify all zones render correctly in dark/light mode.
