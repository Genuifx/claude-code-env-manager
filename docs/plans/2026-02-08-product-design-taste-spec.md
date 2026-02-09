# CCEM Desktop Product Design Taste Specification

> Unified specification produced by 4-agent design taste team
>
> Created: 2026-02-08
> Builds on: visual-redesign-spec.md (visual system) + desktop-app-design.md (6 Tab architecture)
> Scope: Interaction details, information density, states, personality — everything that makes the app go from "functionally correct" to "feels right"

---

## 1. Product Personality Definition

### One Sentence

CCEM Desktop is **competent, warm, and quiet** — a flight engineer's amber instrument panel, not a gaming dashboard or a social app.

### Three Keywords

1. **Competent** — The app knows what it is doing. Every element communicates mastery of the domain. No hand-holding, no exclamation marks, no "wow you did it!" moments. The user is a professional; the app treats them as one.

2. **Warm** — Not cold-clinical like Linear, not bubbly like Arc. CCEM has the warmth of a well-maintained workshop: amber indicator lights, materials that feel physical (warm brown-gray neutrals), a sense that someone who cares built this.

3. **Quiet** — The app defaults to silence. It surfaces information when asked, confirms actions without celebration, and recedes when not needed. Like a well-made mechanical watch: precisely, without drawing attention to itself.

### The Metaphor

**"Like a flight engineer's instrument panel at night."**

Not a cockpit (too dramatic, too many controls). Not a barista's workstation (too casual). A flight engineer's panel: amber indicators on dark surfaces, each light meaning something specific, the overall impression being one of calm competence during complex operations. The user is running 8 parallel Claude sessions — they are orchestrating, not browsing.

### Benchmark Position

| Benchmark | Personality | Fit for CCEM |
|-----------|------------|--------------|
| **Linear** | Cool, precise, speed-focused | Close but too cold. Linear is for team collaboration; CCEM is a solo operator's tool. |
| **Raycast** | Geeky, efficiency-first, keyboard-primary | Closest match in spirit — respects user intelligence. But Raycast is ephemeral; CCEM is persistent. |
| **Arc** | Warm, playful, boldly experimental | Too playful. Heavy developers want predictability, not UI experiments. |
| **Warp** | Modern, AI-native, collaborative | Wrong domain. Warp reinvents the terminal; CCEM manages what runs inside terminals. |

**CCEM's formula: Raycast's intelligence + the material warmth of a Teenage Engineering product.** A developer tool that feels like a physical instrument, not a web app.

### How Personality Manifests in 5 UI Details

1. **The launch button is heavy, not flashy.** `h-13 px-8 text-lg font-semibold shadow-lg shadow-primary/20`. Feels like pressing a physical switch. No Rocket icon — text "Launch" alone is sufficient. A rocket emoji belongs in a consumer app, not an instrument panel.

2. **Numbers stand alone.** `248.6K` in `text-2xl font-bold`, not `📊 248.6K`. The label provides context; the number IS the information. Emoji in data values is like putting a smiley face on a voltmeter.

3. **Status dots are semantic, not decorative.** Green pulsing = running. Amber static = idle. Red blinking = error. Gray static = stopped. Each color-animation combination encodes a specific state — these are instrument panel indicator lights.

4. **The side rail uses spatial memory.** Home = always top, Settings = always bottom. Labels are `text-2xs` (10px) — present for initial learning, invisible to muscle memory. No emoji in navigation.

5. **Milestones light up; they do not announce.** When achieved, the card transitions from `border-dashed text-muted-foreground` to `bg-primary/10 border-primary/30` with a single spring-scale animation. No toast. No "New record!" text. The state change IS the celebration.

---

## 2. Operation Weight Map

Every user operation classified into 4 weight levels with specific interaction feedback.

### Weight Level Definitions

| Weight | Meaning | Interaction Quality | Timing |
|--------|---------|-------------------|--------|
| **Instant** | Zero thought, zero wait | No confirmation, in-place feedback | <100ms |
| **Quick** | Low cognitive load | No confirmation, brief feedback | <300ms |
| **Considered** | User makes a decision | Confirmation or form, reversible | Variable |
| **Irreversible** | Destructive operation | Double confirmation + consequence description | Variable |

### Home Tab

| Operation | Weight | Feedback |
|---|---|---|
| Click Launch button | **Quick** | Button depresses (`translateY(0)`), terminal spawns <300ms. No confirmation — launching is non-destructive. |
| Change Environment dropdown | **Quick** | Native `<select>` change. Status bar badge updates instantly. Dropdown value IS the feedback. |
| Change Permission dropdown | **Quick** | Badge in status bar updates. Temporary permission = low consequence. |
| Click "Select Directory" | **Considered** | OS file dialog opens. On selection: dir path appears below quick actions. |
| Click Recent Project | **Quick** | Brief `bg-primary/10` flash (150ms), auto-launches with that directory. Intent is unambiguous. |
| Click Stat Card | **Instant** | Tab switches with page-enter animation (220ms). No data to load — already in Zustand. |

### Sessions Tab

| Operation | Weight | Feedback |
|---|---|---|
| Click Focus | **Instant** | Target terminal comes to foreground via AppleScript. No visual feedback in CCEM needed — the terminal appearing IS the feedback. |
| Click Minimize | **Instant** | Status dot transitions to idle (amber). Terminal minimizes. Non-destructive, instantly reversible. |
| Click Terminate (X) | **Irreversible** | Inline confirmation replaces action row: "Terminate this session? [Cancel] [Terminate]" in destructive red. Card fades out on confirm. |
| Toggle Card/List view | **Instant** | View switches. Preference persists in localStorage. |
| Click "New Session" (+) | **Quick** | Same as Home launch. Uses current env + perm + last directory. |
| Click "Minimize All" | **Quick** | All cards transition to idle state. All terminals minimize. Brief toast: "All sessions minimized". |
| Click "Close All" | **Irreversible** | Modal: "Close all {N} sessions? This will terminate all running Claude Code processes." [Cancel] [Close All]. |
| Click "Tile 4-up" | **Considered** | Selection UI — user clicks 4 cards (selected get `ring-2 ring-primary`), then "Tile Selected" button appears. |

### Environments Tab

| Operation | Weight | Feedback |
|---|---|---|
| Click "Switch to this env" | **Quick** | Previous card loses `ring-1`. Clicked card gains `ring-1 ring-primary/40` + "Active" badge with spring animation. No toast — the ring IS the feedback. |
| Click "Edit" | **Considered** | Modal with pre-filled form. [Cancel] [Save]. On save: card updates in-place. Toast: "Environment updated". |
| Click "+ Add" | **Considered** | Modal with preset selector + form fields. Preset auto-fills URL/model. Toast: "Environment added". |
| Click "Delete" | **Irreversible** | Inline confirmation: "Delete '{name}'? API key will be permanently removed. [Cancel] [Delete]". Card fades out. |
| Click permission quick-switch badge | **Quick** | Badge fills (outline → filled). Previous unfills. Helper text confirms. No toast. |
| Change default permission select | **Considered** | Native `<select>`. Toast: "Default permission set to {mode}". Persists to disk. |

### Analytics Tab

| Operation | Weight | Feedback |
|---|---|---|
| Switch time range | **Quick** | Segmented control updates. Chart re-renders with animation. Stat cards count-up (800ms). |
| Toggle chart type (Line/Bar) | **Instant** | Chart re-renders with new animation. No data fetch — same data, different viz. |
| Hover heatmap cell | **Instant** | Tooltip: "Feb 7, 2026 — 12.4K tokens — $0.18". |
| Click heatmap cell | **Quick** | Drills down to that day's hourly breakdown. Back-arrow appears to return. |
| Milestone unlocked (passive) | **Quick** | Card transitions with `milestone-pop` spring. No toast, no text. |

### Skills Tab

| Operation | Weight | Feedback |
|---|---|---|
| Click "+ Add Skill" | **Considered** | Modal: preset list / GitHub URL / marketplace (future). Progress indicator during install. Toast on success. |
| Click "Remove" | **Irreversible** | Inline confirmation: "Remove skill '{name}'? [Cancel] [Remove]". Card fades out. |
| Click "View" | **Instant** | Opens skill directory in Finder or shows content in read-only modal. |

### Settings Tab

| Operation | Weight | Feedback |
|---|---|---|
| Change theme | **Instant** | Entire app re-renders instantly. No animation on theme switch. Radio button IS confirmation. |
| Toggle auto-start | **Quick** | Switch flips. Backend writes to OS login items. No toast. |
| Toggle minimize-to-tray | **Quick** | Switch flips. Preference saved. |
| Toggle minimize-on-close | **Quick** | Switch flips. Preference saved. |
| Change default permission | **Considered** | Same behavior as Environments tab's selector — they control the same setting. |
| Click "Check for Updates" | **Quick** | Inline spinner → "Up to date (v2.0.0)" or "Update available: v2.1.0 [Download]". |

### Why: Every operation has a weight because treating all clicks as equal creates a flat, unconfident interface. Heavy actions should feel heavy; light actions should feel instant. This is how physical controls work — a light switch responds differently from a circuit breaker.

### How: Implement via consistent patterns — Quick actions use in-place feedback, Irreversible uses inline confirmation (never modals except for batch destructive), Instant uses CSS transitions only.

### Golden Path Journeys

Three canonical user journeys with timing constraints and operation weight classifications. These paths define the performance contract between the app and the user — every millisecond of app-owned time is budgeted.

#### Path 1: First Launch

The new user's journey from opening the app to a running session with a custom environment.

```
  [App Opens]       [Home]            [Environments]       [Home]             [Running]
      |                |                    |                  |                   |
      |-- <500ms ----->|-- Instant -------->|                  |                   |
      |  App init:     |  Click "Add more   |-- Considered --->|                   |
      |  load all data |  environments -->" |  Fill form +     |-- Quick --------->|
      |                |  Tab switch <100ms |  preset auto-    |  Click Launch     |
      |                |                    |  fills 3 fields  |  <300ms           |
      |                |                    |  [Cancel] [Save] |                   |
      |                |                    |                  |  Button depresses |
      |                |                    |  Auto-nav back   |  "Launched" 1s    |
      |                |                    |  Instant <100ms  |  Session appears  |
```

**Timing budget:**

| Step | Owner | Duration | Weight |
|---|---|---|---|
| App initialization (all data) | App | <500ms | -- |
| Tab switch to Environments | App | <100ms | **Instant** |
| Fill add-environment form | User | Unbounded (guided by presets) | **Considered** |
| Auto-navigate back to Home | App | <100ms | **Instant** |
| Click Launch, terminal spawns | App | <300ms | **Quick** |
| **Total app-owned time** | | **<1s** | |

User time is unbounded but guided: presets auto-fill base URL, model, and small model — the user enters only the API key. The form has Cancel and Save, making the operation reversible until the final commit.

#### Path 2: Power User Multi-Session

The experienced user launching four sessions and arranging them for parallel work.

```
  [Home]           [Home]           [Sessions]        [Tile 4-up]        [Terminal]
      |                |                |                  |                  |
      |-- Quick x4 --->|-- Instant ---->|                  |                  |
      |  Cmd+Enter x4  |  Cmd+2         |-- Considered --->|-- Instant ------>|
      |  <300ms each   |  Tab switch    |  Click 4 cards   |  Click Focus    |
      |                |  <100ms        |  ring-2 on each  |  AppleScript    |
      |  Button shows  |               |  selected card   |  foregrounds    |
      |  "Launched"    |  4 cards with  |                  |  target terminal|
      |  after each    |  status dots   |  "Tile Selected" |  <100ms         |
      |                |  visible       |  button appears  |                  |
      |  Stat card     |               |                  |                  |
      |  count updates |               |                  |                  |
      |  instantly     |               |                  |                  |
```

**Timing budget:**

| Step | Owner | Duration | Weight |
|---|---|---|---|
| Launch x4 via Cmd+Enter | App | 4 x <300ms = <1.2s | **Quick** x4 |
| Switch to Sessions via Cmd+2 | App | <100ms | **Instant** |
| Select 4 cards for tiling | User | Unbounded (4 clicks) | **Considered** |
| Tile action executes | App | <300ms | **Quick** |
| Focus a terminal | App | <100ms | **Instant** |
| **Total app-owned time** | | **<1.7s** | |

A power user can go from zero to four tiled Claude sessions in under 10 seconds including their own click time. Each launch is independent — if the third launch fails, sessions one and two are unaffected. The Considered weight on card selection is correct: the user decides which four of potentially eight sessions to tile, and the ring feedback per selection confirms their choices before the batch action.

#### Path 3: Environment Switch Mid-Work

Switching to a different AI provider without disrupting running sessions.

```
  [Working]        [Tray / Env Tab]   [Switched]          [Launch]          [New Session]
      |                |                  |                   |                  |
      |-- Instant ---->|-- Quick -------->|-- Instant ------->|-- Quick -------->|
      |  Click tray    |  Select env      |  Ring moves       |  Cmd+Enter      |
      |  OR Cmd+3      |  from list       |  Badge updates    |  or click       |
      |  <100ms        |  <300ms          |  <50ms            |  Launch         |
      |                |                  |                   |  <300ms         |
      |  Menu renders  |  No confirmation |  Tray checkmark   |                  |
      |  or tab switch |  needed — env    |  updates via      |  New terminal   |
      |                |  switch is       |  Tauri event      |  inherits new   |
      |                |  non-destructive |                   |  env vars       |
      |                |  and reversible  |                   |                  |
```

**Timing budget:**

| Step | Owner | Duration | Weight |
|---|---|---|---|
| Open tray or switch to Environments tab | App | <100ms | **Instant** |
| Select new environment | User + App | Click (user) + <300ms (app) | **Quick** |
| Environment propagation (Zustand + tray) | App | <50ms | **Instant** |
| Launch session with new environment | App | <300ms | **Quick** |
| **Total app-owned time** | | **<450ms** | |

Critical constraint: switching environments never affects running sessions. Each session inherits its environment variables at spawn time and retains them for its lifetime. This is correct behavior, not a limitation. Existing sessions on the old provider continue working; the new session picks up the new provider. A flight engineer does not change fuel type on running engines.

The tray path and the Environments tab path converge at the same Zustand write (`switchEnvironment()`). Both produce identical results — the tray is faster for users already working in terminals; the tab is faster for users already in the CCEM window.

#### Why: Individual operations may each meet their weight-class timing, yet the end-to-end journey can still feel sluggish if transitions between steps introduce gaps. Golden paths define the performance contract at the journey level, not the click level. These three paths — first use, power use, mid-work reconfiguration — cover the three modes of a developer who orchestrates 8 parallel Claude sessions.

#### How: Measure each path end-to-end during development using Tauri's performance tracing. The app-owned time targets (1s, 1.7s, 450ms) are hard constraints, not aspirational goals. If any step exceeds its budget, optimize that step — do not add a loading indicator as a substitute for speed.

---

## 3. Cross-Tab Information Flow

### Source of Truth Table

| Data | Source | Zustand Key | Consumers | Sync Strategy |
|---|---|---|---|---|
| `currentEnv` | CLI config via Tauri `get_current_env` | `useAppStore.currentEnv` | Home dropdown, Env tab ring, Tray checkmark | Write: `switchEnvironment()` → Tauri → CLI config → Zustand. On window focus: re-sync from backend. |
| `permissionMode` | Zustand only (temporary) | `useAppStore.permissionMode` | Home dropdown, Env tab badges, Tray checkmark | Write: `setPermissionMode()` Zustand only. Not persisted between restarts. Resets to `defaultMode` on launch. |
| `defaultMode` | Tauri backend (persisted) | `useAppStore.defaultMode` | Settings select, Env tab select, Home initial perm | Write: Tauri `set_default_mode` → CLI config → Zustand. |
| `environments[]` | CLI config via Tauri | `useAppStore.environments` | Home dropdown, Env tab list, Analytics legend, Tray submenu | Write: add/update/delete → Tauri → re-read full list → Zustand. On window focus: re-sync. |
| `sessions[]` | Tauri process monitor | `useAppStore.sessions` | Home stat card, Sessions tab, Tray submenu | Write: launch adds, backend monitors status. Poll every 5s + immediate sync on window focus. |
| `usageStats` | Tauri JSONL parser | `useAppStore.usageStats` | Home stat cards, Analytics charts/milestones | Fetch on init. Re-fetch on Analytics mount if stale (>60s). Poll every 60s while Analytics active. Stop polling on navigate away. |

### Specific Flow Answers

**Home "Today Stats" → Analytics:** Navigates to Analytics with `timeRange=day, date=today`. Implementation: set `analyticsInitialRange` in Zustand as a "navigation intent" that Analytics reads on mount and then clears.

**Sessions close → Home count:** Immediate via Zustand. `removeSession(id)` decrements `sessions.length`. Home stat card is a derived read — React re-renders automatically. No polling needed.

**Environments switch → Home + Tray:** Home dropdown: immediate (both read `currentEnv` from Zustand). Tray: event-driven — Tauri backend emits `tray-update` event, tray handler rebuilds menu. <50ms latency.

**Analytics refresh strategy:** Cached with smart invalidation. NOT re-fetched on every tab switch. Re-fetch if stale (>60s) or on window focus while on Analytics. Add `usageStatsLastFetched: number` timestamp to Zustand.

### Anti-Pattern: Never derive `currentEnv` from `environments[]`. They are separate concerns — an env could be deleted while current, and the backend handles fallback to 'official' gracefully.

```
                    Tauri Backend (Rust)
                    ┌─────────────────────────────────┐
                    │ CLI Config (conf)  ←── ccem CLI  │
                    │ Process Monitor    ←── OS procs  │
                    │ JSONL Log Parser   ←── ~/.claude/ │
                    │ Tray Menu Builder  ←── events    │
                    └───────────┬─────────────────────┘
                                │ invoke() / listen()
                    ┌───────────▼─────────────────────┐
                    │        Zustand Store              │
                    │ currentEnv ──► Home, Envs, Tray   │
                    │ permMode   ──► Home, Envs, Tray   │
                    │ sessions[] ──► Home, Sessions,Tray│
                    │ usageStats ──► Home, Analytics    │
                    │ envs[]     ──► Home, Envs, Tray   │
                    └───────────┬─────────────────────┘
                                │ React selectors
                    ┌───────────▼─────────────────────┐
                    │     6 Tab Pages (React)           │
                    └──────────────────────────────────┘
```

### Sync Timing Summary

| Event | Data Refreshed | Latency |
|---|---|---|
| App init | All (envs, current, sessions, stats) | <500ms |
| Window focus | envs, currentEnv, sessions | <200ms |
| Tab switch to Analytics | usageStats (if stale >60s) | <1s |
| Environment switch | currentEnv + tray event | <50ms |
| Session launched/terminated | sessions[] + tray event | <100ms |
| CLI `ccem use/add/del` | Synced on next window focus | Deferred |

### Why: Without explicit source-of-truth mapping, the same data displayed in 3 places will inevitably show 3 different values. The Zustand-as-single-store pattern with explicit sync triggers prevents stale reads.

### How: Zustand store with selectors. Tauri `invoke()` for writes, `listen()` for backend-initiated events. Window `focus` listener triggers re-sync.

---

## 4. Information Density Tuning by Tab

### Density Ratings

| Tab | Current | Target | Key Issue |
|---|---|---|---|
| **Home** | 3/10 (too sparse) | 5/10 | `py-12` = 96px void around launch button; double-padding from AppLayout |
| **Sessions** | 5/10 (good) | 5/10 | Correct when sessions exist; empty state needs work |
| **Environments** | 6/10 (slightly dense) | 5/10 | Presets grid over-designed for a 4-item selection |
| **Analytics** | 7/10 (too dense) | 5/10 | 5 stacked sections = ~1400px tall, 50%+ below fold |
| **Skills** | 2/10 (too sparse) | 5/10 | Only 2-3 items; `space-y-8` too generous |
| **Settings** | 4/10 (slightly sparse) | 5/10 | No `max-w-lg` constraint; save button dead zone |

### F-Scan Path Design (What Users See)

**Home — 1-second glance:** Status bar (env badge + perm badge + session count) → launch button. **Takeaway:** "I'm on GLM-4, dev mode, 3 sessions, ready to launch."

**Sessions — 1-second glance:** Tab header with count → first 2 session cards (status dot + project name). **Takeaway:** "I have N sessions, first two are running."

**Analytics — 1-second glance:** 3 stat cards with large numbers (tokens, cost, streak). **Takeaway:** "This week: X tokens, $Y cost, Z-day streak."

**Environments — 1-second glance:** Header + first env card with "Active" badge. **Takeaway:** "My current environment is GLM-4."

### Specific Adjustments

#### Home (3 → 5)

| Change | Before | After | Why |
|---|---|---|---|
| Launch button area | `py-12` (96px void) | `py-6` (48px) | Button is prominent through size/color, not whitespace isolation |
| Stat cards grid | `grid-cols-1 md:grid-cols-3` | Fixed `grid-cols-3` | Min window 880px is always wide enough for 3-up |
| Working dir display | Standalone `text-sm` line below selectors | Inline as directory button label | Eliminates a dead line |
| Section gaps | `space-y-6` (24px) | `space-y-5` (20px) | Status bar, launch, stats, projects are related context |
| Double-padding | AppLayout `px-6 py-8` + page `p-6` | Single `px-8 py-6` on content area only | Spec's app shell fix — reduces 48px H to 32px H |

#### Analytics (7 → 5)

| Change | Before | After | Why |
|---|---|---|---|
| Chart cards padding | `p-6` (24px) | `p-4` (16px) | Charts have internal margins; saves 16px/card = 64px total |
| Mid-page layout | All 5 sections stacked vertically | Model Distribution + Heatmap side-by-side in `grid-cols-2` | Eliminates ~250px of vertical space |
| Milestones | `grid-cols-4` wrapping | Horizontal flex row: `flex gap-3 overflow-x-auto` | Collapses to single row |
| Stat card values | `text-3xl` on Analytics, `text-2xl` on Home | Unified `text-2xl` everywhere | Consistency across pages |

#### Settings (4 → 5)

| Change | Before | After | Why |
|---|---|---|---|
| Content width | Full-width stretches to 1200px | `max-w-lg` (512px), left-aligned | Settings should not stretch |
| Section gaps | `space-y-6` (24px) | `space-y-4` (16px) | Tighter grouping for related items |
| Save button | Standalone at page bottom (dead zone) | Auto-save on each toggle/select change | Eliminates forgotten saves |

#### Skills (2 → 5)

| Change | Before | After | Why |
|---|---|---|---|
| Layout | Vertical stack with `space-y-8` | `grid grid-cols-1 lg:grid-cols-3` — skills take 2 cols, CLI hint takes 1 | Fills visual gap |
| Empty state | Large gradient box with 4xl emoji | Compact `py-8` with muted icon + text | Less dramatic, more useful |

### Progressive Information Disclosure

| Element | Default | On Interaction | Rationale |
|---|---|---|---|
| API Key in env cards | Masked: `glm-***abc` | Click reveal icon → full key (auto-hides after 5s) | Security hygiene |
| Base URL in env cards | Truncated at ~40 chars | Full URL on hover tooltip | Users identify by name, not URL |
| Session full path | Hidden | Tooltip on project name hover | Project name already conveys key info; saves ~20px per card |
| Session PID | Hidden entirely from cards | Only in detail panel or tooltip | Debugging-level detail, never scanned |
| Exact chart values | Hidden | Hover tooltip on data points | Charts show trends, not precise data |
| Distant milestones | Hidden (show only achieved + next 2) | "Show all milestones" link | Showing "5M Tokens" to a 50K user creates impossibility, not motivation |
| Action buttons on cards | Always visible | — | Never hide primary actions behind hover — power users click rapidly across cards |

### Why: Information density is the single biggest determinant of whether an app feels "professional" or "toy." Too sparse = toy. Too dense = spreadsheet. The target is "instrument panel" — everything visible serves a purpose.

### How: Implement via the specific CSS class changes listed above. Double-padding fix is the highest-impact single change.

---

## 5. Complete State Matrix

### Overview Table

| Data | Loading | Empty | Normal | Error | Stale |
|------|---------|-------|--------|-------|-------|
| **Environment list** | 3 skeleton cards | Impossible (official always exists) | Card list + active ring | Inline error banner + [Retry] | Silent sync + info toast |
| **Session list** | 4 skeleton cards (2x2) | Terminal icon + "No active sessions" + [Launch] | Card grid with status dots | Subtle note below empty state | Silent update on poll/focus |
| **Usage stats (Home)** | 3 skeleton stat cards | Values show `0` / `$0.00` / `0 days` | Numbers + trend indicators | Show zero state, log to console | Refresh on focus, animate delta |
| **Analytics charts** | Skeleton matching chart aspect ratio | Blank chart structure + guidance text | Charts with data + animations | Inline banner in chart card + [Retry] | Re-fetch if >60s old |
| **Skill list** | 2 skeleton cards | Sparkles icon + "No skills installed" + [Add] | Compact card list | Subtle note + CLI hint as fallback | Refresh on focus |
| **Settings** | Delayed skeleton (200ms threshold) | N/A — always has defaults | Form with current values | Per-section inline error | `defaultMode` refreshed on focus |

### Detailed State Treatments

#### Environment List

| State | Specific UI |
|---|---|
| **Loading** | 3 skeleton cards stacked vertically, each matching L1 env card dimensions (~120px height). Each shows: shimmer name block (w-1/4 h-5 top-left), horizontal divider, three shimmer lines for URL/Model/Key (w-2/3, w-1/3, w-1/2 spaced 8px apart), two shimmer button shapes at bottom (w-16 h-8). Render exactly 3 because typical users have 2-4 environments. |
| **Empty** | Effectively impossible — `official` is always present and cannot be deleted. If config is corrupted and returns zero: inline error banner with "No environments found — The configuration file may be corrupted. The default 'official' environment will be restored." + [Restore Defaults] button. |
| **Normal (1 env)** | FTUE state. Single "official" card with active ring. Below: guidance row in `text-sm text-muted-foreground`: "Add more environments to switch between different AI providers" + secondary [Add Environment] button. Row disappears when `environments.length > 1`. |
| **Normal (2+)** | Vertical card stack with `gap-4`. Active card gets `ring-1 ring-primary/40` + "Active" badge. Permission section below with `mt-8`. |
| **Error** | Replace env list area (not full page) with inline banner: `bg-destructive/10 border border-destructive/20 rounded-lg p-4`. Title: "Failed to load environments". Description: "Could not read the configuration file. It may be locked by another process." + [Retry]. Permission section still renders from cache/defaults. |
| **Stale** | On window focus, if `loadEnvironments()` returns data differing from store: silently update list + info toast: "Environments updated from CLI changes". If active env was deleted externally: warning toast: "Environment '{name}' was removed externally. Switched to 'official'." + auto-switch. |

#### Session List

| State | Specific UI |
|---|---|
| **Loading** | Card view: 4 skeleton cards in `grid grid-cols-2 gap-4`. Each ~160px height: shimmer dot (w-2 h-2 rounded-full), shimmer project name (w-1/2 h-4), two shimmer badges (w-12 h-5 inline), shimmer duration (w-1/4 h-3), three shimmer icon-buttons (w-8 h-8). Show 4 to represent typical active state. List view: 4 shimmer rows matching table columns. |
| **Empty** | Center-aligned `py-16`: Terminal icon (w-12 h-12, `text-muted-foreground/20`) + "No active sessions" (`text-sm text-muted-foreground mb-4`) + [Launch Claude Code] button (`variant="outline" size="sm"`). No emoji, no gradient. "New Session" button in header remains visible. Bulk actions bar hidden. |
| **Normal** | Card view for ≤8 (default). Auto-suggest list view at >12. Status dots animate per spec. Cards show project name, badges, duration, action buttons. |
| **Error** | Do NOT show error banner (sessions are transient). Show empty state with subtle note: `text-xs text-muted-foreground` "Could not detect running sessions. Sessions started outside this app may not appear." |
| **Stale** | Polled on window focus. Sessions that disappear are silently removed from grid — no toast (sessions ending is normal workflow, not an anomaly). |

#### Analytics Data

| State | Specific UI |
|---|---|
| **Loading** | 3 stat card skeletons (grid-cols-3) + 1 large chart skeleton (280px) + 1 model distribution skeleton (200px) + 1 heatmap skeleton (180px) + 4 inline milestone skeletons. Total: 10 shimmer blocks loading as one unit (no "loading parade"). |
| **Empty (zero)** | Critical FTUE state. Stat cards show real zeros: "0" / "$0.00" / "0 days" (honest baseline, not "N/A"). Token chart: empty area + centered "Start using Claude Code to see your usage trends here." Model distribution: "Model usage breakdown will appear after your first session." Heatmap: render full calendar grid with all cells `bg-transparent` (creates visual anticipation like a blank GitHub graph). Milestones: all pending with 0% progress bars. |
| **Normal** | Full charts, animations on first render, trend arrows, milestone progress. |
| **Error** | In production: show empty state (zeros) + inline error banner: "Could not load usage statistics. Ensure Claude Code log files exist in ~/.claude/projects/." + [Retry]. Mock data only in development builds (gate behind `import.meta.env.DEV`). |
| **Stale** | Re-fetches on tab visit if >60s old. No staleness indicator needed. On re-fetch, stat values animate from old to new via `useCountUp`. |

#### Settings

| State | Specific UI |
|---|---|
| **Loading** | Structure renders immediately with defaults. Subtle shimmer overlay per Card section — but only shows if load takes >200ms (delayed show pattern: `setTimeout(() => setShowSkeleton(true), 200)`). Prevents flash-of-skeleton for fast local reads. |
| **Empty** | Not meaningful. Always has defaults: `{ theme: 'system', autoStart: false, startMinimized: false, closeToTray: true, defaultMode: 'dev' }`. |
| **Error (read)** | Use defaults silently. No error banner. Log to console. User sees functioning settings. |
| **Error (write)** | Destructive toast: "Failed to save settings. Check disk permissions." Settings remain in modified state (not reverted) for retry. |
| **Stale** | `defaultMode` refreshed on window focus (shared with CLI via config file). If changed externally, select dropdown silently updates. |

### Empty State Design Principles

1. **Every empty state has 3 elements:** muted icon (Lucide, 48px, `text-muted-foreground/20`) + factual text (`text-sm text-muted-foreground`) + action button (`variant="outline" size="sm"`).
2. **No emoji in empty states.** No chatty copy. "No active sessions" not "Looks like you haven't started anything yet!"
3. **The action button is the most important element** — it tells the user what to do next.
4. **Skeleton screens, never spinners.** Skeleton communicates what WILL appear; spinners communicate nothing.
5. **Replace single `isLoading` boolean** with per-domain flags (`isLoadingEnvs`, `isLoadingSessions`, `isLoadingStats`, `isLoadingSkills`, `isLoadingSettings`) so each section shows its own skeleton independently.

### Why: A user hitting an empty state is at maximum confusion. The UI must immediately answer three questions: "Is this broken?" (no, icon says this is the right place), "What goes here?" (text describes it), "What do I do?" (button gives the action).

### How: Implement as a shared `<EmptyState icon={Terminal} message="No active sessions" action="Launch Claude Code" onAction={handleLaunch} />` component. Per-domain loading flags in Zustand store.

---

## 6. First-Time User Experience (FTUE)

### Design Principle: No Onboarding Tour

No guided walkthrough. No pulsing dots. No "Let me show you around!" overlay. A developer who installs a CLI environment manager does not need a tooltip explaining what "Environments" means.

### The 3-Step Path from Empty to Productive

```
Step 1: Home shows "official" environment pre-selected
        + prominent CTA below launch: "Add more environments →"
        CTA is a text link, not a button. It navigates to Environments tab.
        ↓
Step 2: Environments tab shows official card + "Add your first custom environment"
        ghost card (dashed border, + icon, muted text)
        User clicks → Add Environment modal with preset selector
        User picks GLM/Kimi/DeepSeek → form auto-fills → enters API key → Save
        ↓
Step 3: Back on Home (auto-navigated), new env is selected in dropdown
        User clicks Launch → Claude Code starts
        Session appears in Home stat card (count: 1)
        ↓
Done.  The user now has a custom env + running session.
       All tabs have content. FTUE is complete.
```

### FTUE Details by Tab

| Tab | First-Time Appearance | Guidance Element |
|---|---|---|
| **Home** | Fully functional with "official" env. Stat cards show zeros. Recent projects empty. | Text link below quick actions: "Add more environments →" |
| **Sessions** | Empty state (Terminal icon + "No active sessions" + [Launch]) | The [Launch] button is the guide |
| **Environments** | Official card + ghost card with dashed border and "+ Add Environment" | Ghost card is the guide |
| **Analytics** | Flat-line charts + zero values + "No usage data yet. Launch a session to start tracking." | Explanatory text under charts |
| **Skills** | Empty state (Sparkles icon + "No skills installed" + [Add Skill]) | The [Add Skill] button is the guide |
| **Settings** | Fully functional with defaults. No guidance needed. | — |

### Why: Forced onboarding tours have a 90%+ skip rate. Contextual guidance embedded in the natural UI (empty states, ghost cards, text links) teaches through the interface itself.

### How: Ghost card = a `<div>` with `border-dashed border-border/50 rounded-xl p-4 flex items-center justify-center cursor-pointer hover:border-primary/30`. Appears only when env count <= 1.

### FTUE Completion Tracking

The app tracks three milestones via `localStorage` persistence flags. Each flag is a simple boolean string (`"true"`) written once and never cleared unless the user resets the app. These flags govern the lifecycle of guidance elements — once a flag is set, the corresponding hint disappears permanently.

| Flag | Trigger Condition | UI Elements Controlled |
|---|---|---|
| `ccem-ftue-launched` | Set to `"true"` after the user's first successful session launch (terminal process spawns without error) | Amber dots on Home stat cards disappear. Status bar stops showing the introductory state. |
| `ccem-ftue-envs-added` | Set to `"true"` after the user adds their first custom environment (any environment beyond `official`) | "Add more environments" link on Home disappears. Ghost card in Environments disappears. |
| `ccem-ftue-analytics-seen` | Set to `"true"` after the user's first visit to the Analytics tab | "No usage data yet" text in Analytics changes to the normal empty state when this flag is true AND `usageStats.totalTokens > 0`. If the flag is true but data is still zero, the empty state persists honestly. |

Flag reads happen synchronously at component mount via `localStorage.getItem()`. Flag writes happen as side effects inside the relevant action handlers — `launchSession()`, `addEnvironment()`, and the Analytics tab's `useEffect` mount hook. No Zustand involvement; these are pure view-layer concerns that do not need to survive across tabs or sync with the backend.

### Opening State Analysis

What the user sees on the very first app open, before any interaction has occurred. This is the moment of highest judgment — the user decides within seconds whether the app is competent.

| Element | Initial Value | Visual Treatment |
|---|---|---|
| Active tab | Home | Side rail shows Home icon with active indicator (amber left border) |
| Environment dropdown | `official` | Pre-selected, the only option. Dropdown is functional but contains a single entry. |
| Permission dropdown | `dev` | Pre-selected from `defaultMode`. Functional with all 6 options available. |
| Launch button | "Launch" | Full prominence: `h-13 px-8 text-lg font-semibold shadow-lg shadow-primary/20`. Ready to press. |
| Stat card: Sessions | `0` | `text-2xl font-bold` displaying the numeral zero. Amber dot indicator visible (see Visual Indicators below). |
| Stat card: Tokens | `0` | Same treatment. Amber dot visible. |
| Stat card: Cost | `$0.00` | Same treatment. Amber dot visible. |
| Recent projects | Empty (absent) | Section does not render at all — no ghost card, no placeholder. The area simply does not exist yet. This is correct: an empty list of recent projects needs no explanation. |
| Status bar | `Environment: official` | `Permission: dev` | `0 sessions running` | All values are real data, not placeholders. The status bar is fully functional from first render. |
| "Add more environments" link | Visible | `text-sm text-primary hover:underline` below quick actions area. Navigates to Environments tab on click. |

App initialization completes in <500ms (per Section 2 golden path). All data loads in a single batch — there is no staggered loading parade. The user sees the complete Home state as one unit.

### FTUE Visual Indicators

During the initial period before the user's first launch, Home stat cards display a small amber dot next to their zero values. The dot is a 4px circle (`w-1 h-1 bg-primary rounded-full inline-block ml-1.5 align-middle`) rendered inline after the number.

The dot communicates "this value is alive and waiting for input" without explanation. It creates anticipation through presence alone — the user does not need to understand what the dot means. When real data arrives (the stat value becomes greater than zero), the dot disappears. The transition is silent: one render the dot is there, the next it is not.

**Conditional render logic:**

```tsx
{value === 0 && !localStorage.getItem('ccem-ftue-launched') && (
  <span className="w-1 h-1 bg-primary rounded-full inline-block ml-1.5 align-middle" />
)}
```

The dot appears only when both conditions are true: the stat value is zero AND the user has never successfully launched a session. After the first launch sets `ccem-ftue-launched`, all dots disappear even if some stats remain at zero — because at that point, the zeros are honest data, not an unstarted state.

Three dots maximum (one per stat card). No animation on the dots — they are static indicators, not attention-seekers. The amber color ties them to the product's identity palette without introducing a new semantic.

### Ghost Card Enhancement

The Environments ghost card (described above in the FTUE tab table) renders when `environments.length <= 1`. Beyond the dashed border and `+` icon already specified, the card includes preset provider hints as muted placeholder text.

The hint text reads: `GLM-4  ·  Kimi  ·  DeepSeek  ·  MiniMax`

These four names tell the user exactly what is available without requiring them to click through to discover it. The text sits centered inside the dashed-border card, below the `+` icon, styled as:

```
text-xs text-muted-foreground/40
```

On hover, the text brightens to `text-muted-foreground/60`, matching the border's own hover transition (`hover:border-primary/30`). The brightening is a CSS transition (`transition-colors duration-150`), not a state change.

The full ghost card implementation:

```tsx
<div className="border-dashed border-border/50 rounded-xl p-4 flex flex-col items-center
  justify-center cursor-pointer hover:border-primary/30 gap-2 min-h-[120px]
  transition-colors duration-150 group">
  <Plus className="w-5 h-5 text-muted-foreground/40 group-hover:text-muted-foreground/60" />
  <span className="text-sm text-muted-foreground">Add Environment</span>
  <span className="text-xs text-muted-foreground/40 group-hover:text-muted-foreground/60
    transition-colors duration-150">
    GLM-4  ·  Kimi  ·  DeepSeek  ·  MiniMax
  </span>
</div>
```

When `ccem-ftue-envs-added` is set to `"true"`, the ghost card stops rendering entirely. Users who have already added a custom environment do not need the hint — the `+` button in the section header handles further additions.

### Why (FTUE Enrichment):

FTUE tracking exists to prevent "abandoned first use" — the most common failure mode for developer tools. A user who opens the app, sees zeros everywhere, and closes it without taking action may never return. The flags, the amber dots, and the ghost card hints all serve the same purpose: they make the empty app feel like it is waiting for the user, not broken or unfinished.

The tracking is deliberately minimal. Three flags. Three dots. One ghost card with four words. There is no onboarding wizard, no step counter, no progress bar toward "setup complete." The user is a professional installing a tool they chose; the app's job is to make the first five minutes productive, not to hold their hand through them.

### How (FTUE Enrichment):

`localStorage` for all three persistence flags — no backend involvement, no Zustand state, no config file writes. Flags are read synchronously at component mount and written as fire-and-forget side effects. Conditional CSS classes handle all visual transitions: `inline-block` vs `hidden` for amber dots, `group-hover:text-muted-foreground/60` for ghost card hover states, conditional rendering (`&&` guards) for entire elements. No JavaScript animations are involved in FTUE indicators — they appear or disappear between renders.

---

## 7. Tone of Voice Guide + Language Strategy

### Language Decision: Default Chinese + Switchable English

**Default language is Chinese. Users can switch to English in Settings > Appearance.**

The primary user base is Chinese developers. A pure-English interface would alienate them. However, mixed-language text ("权限 dev", "Token 消耗分布") is still the worst option — it signals a product that doesn't know its own identity. The solution is complete i18n with two fully maintained language packs.

Reasoning:
1. **Primary users are Chinese.** The tool manages Chinese AI providers (GLM, Kimi, DeepSeek, MiniMax) alongside Anthropic. The user base is predominantly Chinese developers.
2. **Mixed-language is still the enemy.** Every UI element must be fully in one language — never half-translated. "权限 dev" becomes "权限模式: dev" (zh) or "Permission: dev" (en). The mode name `dev` stays English in both languages because it is a code identifier, not a word.
3. **Technical terms stay English in both languages.** "Token", "API Key", "yolo", "dev", "readonly", "Session" — these are code-native vocabulary that Chinese developers already use in English. Do not translate them to "令牌", "接口密钥", etc.
4. **The app has <200 user-facing strings.** Full i18n is lightweight — no need for heavy frameworks.

### Technical Terms: Never Translate

| Term | Chinese UI | English UI | Why |
|------|-----------|------------|-----|
| Token | Token | Token | Universal in developer context |
| API Key | API Key | API Key | Standard term |
| Session | Session | Session | Process-level concept |
| yolo / dev / safe / readonly / ci / audit | yolo / dev / safe / readonly / ci / audit | Same | Permission mode identifiers, not words |
| Claude Code | Claude Code | Claude Code | Product name |

### i18n Architecture

```
src/
├── locales/
│   ├── zh.json          # Chinese (default)
│   ├── en.json          # English
│   └── index.ts         # useLocale() hook + locale context
```

**Implementation approach:**

```ts
// src/locales/index.ts
const locale = localStorage.getItem('ccem-locale') || 'zh';

export function useLocale() {
  const [lang, setLang] = useState(locale);
  const t = (key: string) => messages[lang][key] || key;
  return { t, lang, setLang };
}
```

No `react-i18next`. No ICU message format. A plain JSON dictionary + a `t()` function is sufficient for <200 strings. The locale persists in `localStorage` under key `ccem-locale`.

### Copy Standards (Bilingual)

#### Buttons

| Context | Chinese | English | Principle |
|---------|---------|---------|-----------|
| Main launch | **启动** | **Launch** | Single verb. Carries weight. |
| Edit action | **编辑** | **Edit** | Direct, scannable. |
| Add action | **添加环境** | **Add Environment** | Include the noun for clarity. |
| Delete action | **删除** | **Delete** | Match the dialog title. Never use "确定" or "OK" for destructive actions. |
| Cancel | **取消** | **Cancel** | Universal. |

#### Empty States

| Context | Chinese | English |
|---------|---------|---------|
| No sessions | **暂无活跃 Session** | **No active sessions** |
| No envs | **暂无已配置环境** | **No environments configured** |
| No skills | **暂无已安装技能** | **No skills installed** |

Note: Empty state text is factual in both languages. No chatty copy ("来试试吧?" / "Why not add one?").

#### Errors

| Context | Chinese | English |
|---------|---------|---------|
| Data load failure | **数据加载失败。** 请检查网络连接后重试。[重试] | **Failed to load data.** Check your network connection and try again. [Retry] |
| Backend unavailable | **后端不可用。** 使用演示数据运行。 | **Backend not available.** Running with demo data. |

#### Milestones

| Context | Treatment |
|---------|-----------|
| Milestone reached | **Silent state change** (card lights up with spring animation). No toast in either language. |
| Milestone labels | **100K Tokens** / **$10 达成** (zh) or **First $10** (en) / **连续 7 天** (zh) or **7-Day Streak** (en) |

#### Confirmation Dialogs

| Context | Chinese | English |
|---------|---------|---------|
| Delete env | **删除 "GLM-4"？** 此环境及其 API Key 将被永久移除。[取消] [删除] | **Delete "GLM-4"?** This environment and its API key will be permanently removed. [Cancel] [Delete] |
| Close all | **关闭所有 Session？** 将终止 {N} 个运行中的 Claude Code 进程。[取消] [全部关闭] | **Close all sessions?** This will terminate {N} running Claude Code processes. [Cancel] [Close All] |

### Copy Principles

1. **One language per render.** Every visible string comes from the active locale. No mixing.
2. **Technical terms stay English in both locales.** Token, API Key, Session, permission mode names.
3. **Labels are nouns. Buttons are verbs.** "本周 Token" / "Tokens (this week)" is a label. "启动" / "Launch" is a button.
4. **Numbers need no decoration.** `248.6K` not `📊 248.6K`. `$12.34` not `💰 $12.34`.
5. **Errors name the failure.** "数据加载失败" / "Failed to load usage data" — direct, factual.
6. **Confirmations name the target and state the consequence.** Never "确定吗？" / "Are you sure?"
7. **No exclamation marks.** Ever. In either language. Use a period or no punctuation.
8. **No "Are you sure?" / "确定吗？"** — it trains users to click through. Name the action and its consequence instead.

### Settings Integration

Add a **Language** option to Settings > Appearance section, below the theme toggle:

```
语言 / Language:  ● 中文   ○ English
```

Radio buttons, same pattern as theme selection. Change takes effect instantly (no restart needed). The label itself is bilingual ("语言 / Language") so users can find it regardless of current language.

### Why: A product whose primary users are Chinese developers should speak Chinese by default. But maintaining two complete language packs (rather than mixing languages) is what separates a professional tool from a half-translated one. The key insight: technical terms like Token, API Key, and permission mode names stay English in both locales — Chinese developers already use these terms in English daily.

### How: Create `src/locales/zh.json` and `src/locales/en.json` with all user-facing strings. Implement a `useLocale()` hook that reads from `localStorage('ccem-locale')`. Wrap all hardcoded strings with `t('key')` calls. Add language radio buttons to Settings. Approximately 200 strings total — a single developer can complete the migration in one session.

---

## 8. Data Synchronization Scheme

### The Problem

CCEM Desktop and CLI share the same config file (via the `conf` package's JSON in the OS config directory). Both can modify `currentEnv`, `environments[]`, and `defaultMode` simultaneously.

### Detection Strategy

**Use `fs.watch` (via Tauri) on the config file, with debounce.**

| Event | Detection | Latency |
|---|---|---|
| CLI runs `ccem use xxx` | `fs.watch` fires on config file change | <100ms |
| CLI runs `ccem add/del` | `fs.watch` fires | <100ms |
| Desktop modifies config | No detection needed — Desktop initiated it | 0ms |
| Window regains focus | Force re-read from config file (backup check) | On focus event |

### UI Treatment for External Changes

**Invisible sync for non-conflicting changes.** If the CLI changes `currentEnv` while the user is on the Analytics tab (not looking at env), just update Zustand silently. The next time they visit Home or Environments, the correct state is already shown.

**Subtle notification for potentially confusing changes.** If the user is actively looking at the Environments tab and the CLI changes `currentEnv`:
- The active ring silently moves to the new environment.
- A small `text-xs text-muted-foreground` inline note appears at the top: "Environment changed externally" — auto-dismisses after 5s.
- No toast. No modal. No disruption.

### Conflict Resolution

| Scenario | Strategy |
|---|---|
| Desktop and CLI write different `currentEnv` simultaneously | Last-write-wins. `fs.watch` detects the CLI's write and updates Zustand. The CLI's write came after Desktop's, so CLI wins. Desktop re-reads on next focus. |
| Config file corrupted (partial write during race) | Tauri backend wraps config reads in try-catch. On parse failure: log error, wait 500ms, retry once. If still corrupt: show inline error "Configuration file corrupted — please restart the app." |
| Desktop shows stale env list | Window focus triggers full re-read. `fs.watch` catches mid-session changes. Belt-and-suspenders approach. |

### Implementation

```rust
// Tauri backend: watch config file
use notify::{Watcher, RecursiveMode, watcher};
// Emit 'config-changed' event to frontend on file change
// Frontend listens via tauri::event::listen()
// Debounce at 200ms to avoid rapid-fire during multi-key writes
```

### Why: Without sync, a user who runs `ccem use deepseek` in their terminal will see the Desktop still showing "official" — breaking trust in the tool's accuracy.

### How: `fs.watch` via Tauri's filesystem API + debounced Zustand update + full re-read on window focus as fallback.

---

## 9. Keyboard Shortcut Scheme

### Design Philosophy

1. **Convention over invention.** Patterns from VS Code, Chrome, iTerm2.
2. **Modifier consistency.** `Cmd` for app-level. `Cmd+Shift` for less frequent. No `Ctrl` on macOS.
3. **Discoverability.** Every shortcut displayed in tooltips and menu bar.

### Global Shortcuts

| Shortcut | Action | Convention |
|---|---|---|
| `Cmd+1` through `Cmd+6` | Switch to tab by position | Chrome, VS Code, Figma tab switching |
| `Cmd+Enter` | Launch Claude Code | VS Code "Run" / Jupyter "Execute Cell" |
| `Cmd+N` | New session (= Launch) | Universal "new" shortcut |
| `Cmd+,` | Open Settings | macOS universal convention |
| `Cmd+W` | Minimize to tray or close window | macOS convention (respects user preference) |
| `Cmd+Q` | Quit app | macOS convention |

### Sessions Tab Shortcuts (active only on Sessions tab)

| Shortcut | Action | Convention |
|---|---|---|
| `Cmd+Shift+1` through `Cmd+Shift+8` | Focus Nth session's terminal | iTerm2 tab switching + Shift to avoid conflict with Cmd+1-6 |
| `Cmd+L` | Toggle Card/List view | L = List (mnemonic) |
| `Cmd+Shift+M` | Minimize all sessions | Cmd+M = macOS minimize + Shift = batch |

### Home Tab Shortcuts

| Shortcut | Action | Convention |
|---|---|---|
| `Cmd+O` | Open directory picker | macOS "Open" |
| `Cmd+E` | Cycle to next environment | E = Environment (mnemonic) |
| `Cmd+Shift+E` | Cycle to previous environment | Shift = reverse direction |
| `Cmd+P` | Cycle to next permission mode | P = Permission (mnemonic) |

### Command Palette: NOT in v1

The app has <30 actionable items. A `Cmd+K` palette adds complexity without reducing friction at this scale. Revisit if sessions regularly exceed 12 or environments exceed 8.

### Shortcut Disclosure

1. **Side rail tooltips:** "Home (⌘1)" on hover with 500ms delay.
2. **Button tooltips:** "Launch (⌘Enter)" on hover.
3. **Menu bar integration:** All shortcuts in macOS menu bar (File, View, Window).
4. **No dedicated shortcuts page.** A shortcuts page is a sign you have too many.

### Why: Developers already have `Cmd+1-6` in muscle memory from Chrome/VS Code. `Cmd+Enter` for "execute" is universal in dev tools. The scheme requires zero new learning.

### How: Register shortcuts via Tauri's `tauri::GlobalShortcut` for truly global ones, and React `useEffect` with `keydown` listener for in-app ones. Menu bar via Tauri's menu API.

---

## 10. Three "Delight Moment" Details

These three details cost <100 lines of code total but define the product's character. **Maximum three. Taste is subtraction.**

### Delight #1: The Launch Button's Physical Response

When clicked, the button responds physically:
- `mousedown`: `translate-y-0.5` + `shadow-md` (presses in, shadow shrinks — like a physical switch)
- Release: returns to rest state
- After process spawns: button text briefly shows "Launched ✓" (1s), then returns to "Launch"

Total: 150ms. No spinner, no progress bar. The physical sensation of pressing a switch and seeing it take effect.

**Implementation:** `active:translate-y-0.5 active:shadow-md` (CSS) + 1-second text state swap (React `useState`).

**Why this one:** Used multiple times daily. Making it feel tactile transforms a mundane click into a satisfying moment. Same principle as Teenage Engineering's OP-1 buttons.

### Delight #2: Number Count-Up on Data Arrival

When Analytics loads and stat values arrive, numbers count from 0 to target over 800ms with decelerate easing:
- `248.6K` counts from `0.0K`
- `$12.34` counts from `$0.00`
- `42 days` counts from `0`

Happens once per page load, not on every re-render. Subconsciously, data feels alive — it arrived, it is real. Static numbers feel like a screenshot; counting numbers feel like a live readout.

**Implementation:** The `useCountUp` hook (15 lines of `requestAnimationFrame`). Already specified in visual-redesign-spec.md.

**Why this one:** Data visualization is CCEM's emotional core. Count-up makes "growth" literal. Zero dependencies.

### Delight #3: The Amber Heatmap Glow

In dark mode, the heatmap creates a distinctive signature: amber cells on near-black background. When loaded, the entire heatmap fades in as one unit (400ms, decelerate). The effect resembles amber LEDs illuminating on a dark instrument surface.

On hover, each cell brightens (`brightness-110`) with minimal tooltip. A full year of amber cells is the most screenshot-worthy element in the app.

**Implementation:** `bg-primary/15` through `bg-primary` at 5 levels + `.heatmap-enter` class (single fade-in). `hover:brightness-110 transition-[filter] duration-150`.

**Why this one:** This is the "tweet-worthy" moment. The amber heatmap on dark background IS the brand. Immediately recognizable, distinctive from GitHub's green grid.

---

## 11. Anti-Pattern Checklist

### Visual: Never Do

| Anti-Pattern | Why It's Wrong for CCEM |
|---|---|
| **Gradient blobs as decoration** | "Nothing glows without purpose." Current codebase has 3 blur-3xl gradient divs. All must go. |
| **Emoji in data displays** (📊, 💰, 🔥, 💎) | A voltmeter doesn't have a lightning bolt emoji next to the reading. Numbers are data, not decoration. |
| **Rainbow/multi-color nav icons** | Navigation should be monochrome. Colored icons compete with content for attention. |
| **Gradient text or gradient icons** | Gradients say "I'm trying to look premium." Solid amber says "I am." |
| **Green for achievements** | Green = "success" semantic (session running, safe mode). Achievements use amber — the product's identity color. |
| **Blue as default accent** | Multiple places use blue badges by default. CCEM's identity is amber. Blue is reserved for "info" semantic and "readonly" mode. |

### Interaction: Never Do

| Anti-Pattern | Why It's Wrong for CCEM |
|---|---|
| **Confirmation after confirmation** | One dialog respects user intent; two signals distrust. The user running 8 Claude sessions doesn't click Delete by accident. |
| **Auto-playing animations > 220ms on tab switch** | Current 500ms slide-in on every tab switch makes the app feel slow. Users switch tabs dozens of times per session. |
| **Forced onboarding tours** | No pulsing dots, no overlay guides. The app has 6 self-explanatory tabs. |
| **Auto-dismiss toasts for important info** | With 8 Claude sessions, the user is always looking at another window. Use inline banners for persistent state. |
| **Hover-dependent critical information** | Supplementary info (path, PID) in tooltips is fine. Error messages and connection status must never be hover-only. |
| **Modal dialogs for non-blocking operations** | Env switching, perm changes, dir selection = inline controls. Modals are for destructive actions and complex forms only. |

### Copy: Never Do

| Anti-Pattern | Why It's Wrong for CCEM |
|---|---|
| **Over-enthusiastic praise** ("Amazing! You hit 100K tokens!") | User is a professional, not a child on a reading challenge. |
| **Hedging language** ("Something might have gone wrong") | Instrument panels don't hedge. "Backend not available" — direct, factual. |
| **Mixed Chinese and English** in the same element | "权限 dev" is neither language. "Token 消耗分布" forces a language switch. Use the i18n system — every string comes from the active locale. No mixing. |
| **Chatty empty states** ("Why not add one?") | Factual: "No environments configured." + action button. The app is an instrument, not a conversation partner. |
| **"Are you sure?" prompts** | Non-question that trains click-through. Instead: name the action and consequence. |
| **Technical jargon in user-facing errors** ("ECONNREFUSED") | Describe user-facing consequence: "Backend not available." Technical details go to console.log. |
| **"session(s)" pluralization** | "1 session" / "3 sessions". Never "session(s)". This is developer-written text, not product design. |

---

## 12. Conflicts & Supplements to visual-redesign-spec.md

### Confirmed Alignments

| Topic | This Spec | visual-redesign-spec.md | Status |
|---|---|---|---|
| Design philosophy | "Flight engineer's instrument panel" | "A lit instrument panel in a dark room" | ✅ Aligned |
| No emoji in data | Specified for all tabs | "Remove all emoji from stat values" | ✅ Aligned |
| Side rail navigation | 64px, icon + tiny label | 64px, icon + text-2xs label | ✅ Aligned |
| Skeleton loading | Skeleton screens, never spinners | "Use skeleton screens, never spinners" | ✅ Aligned |
| Motion principles | "Motion communicates state, never decorates" | Same 4 principles | ✅ Aligned |
| Milestone celebration | Single spring-scale pop, no sparkles | Same — "no particles, no sparkles, no golden rings" | ✅ Aligned |

### Supplements (New in This Spec)

| Topic | What This Spec Adds |
|---|---|
| **Operation weight map** | Classifies every operation by weight level. Not covered in visual spec. |
| **Cross-tab data flow** | Explicit source-of-truth table and sync timing. Not covered. |
| **Golden paths** | 3 user journey state diagrams with timing constraints. Not covered. |
| **Keyboard shortcuts** | Full shortcut scheme with convention analysis. Not covered. |
| **F-scan path analysis** | Per-tab gaze sequence analysis. Not covered. |
| **Information density ratings** | Numeric density scores + specific adjustments. Not covered. |
| **Progressive disclosure rules** | Per-element hide/show decisions. Not covered. |
| **State matrix** | Complete loading/empty/normal/error/stale × every data type. Not covered. |
| **FTUE path** | 3-step first-use guide without onboarding tour. Not covered. |
| **Data sync scheme** | fs.watch + debounce + conflict resolution. Not covered. |
| **Language decision** | English-only with explicit Chinese removal plan. Not covered. |
| **Product personality** | 3 adjectives + metaphor + benchmark analysis. Not covered. |
| **Anti-pattern checklist** | 19 specific never-do items with CCEM-specific reasoning. Not covered. |

### Adjustments to Visual Spec

| Topic | visual-redesign-spec.md Says | This Spec Adjusts | Reasoning |
|---|---|---|---|
| **Launch button py** | `py-12` for "generous vertical space" (section 7.1 item 2) | Reduce to `py-6` | 96px void is density 3/10. Button is prominent through size/color, not whitespace. |
| **Milestone toast** | Not explicitly mentioned, but section 6 says milestone-pop animation only | **Confirmed: no toast** | Silent state change aligns with "quiet" personality. Toasts interrupt orchestration of 8 sessions. |
| **Theme switch animation** | Not specified | **No animation** | Instant swap feels more "setting-like." Theme is a toggle, not a transition. |
| **Settings auto-save** | Not specified (implies manual save) | **Auto-save on each change** | Desktop apps auto-save settings. A save button at page bottom is a dead zone nobody finds. |
| **Analytics layout** | All sections stacked vertically | **Model Distribution + Heatmap side-by-side** on ≥1024px | Reduces page height by ~250px, keeps 50%+ of content above fold. |
| **Ghost card in Sessions** | Empty state only has icon + text + button | **Add ghost card** when <3 sessions | Fills visual gap in the grid without being decorative. The dashed border says "something can go here." |

---

> This document is the product design taste layer over the visual and architectural specs.
> visual-redesign-spec.md defines HOW things look. This document defines HOW things feel.
> When in doubt: competent, warm, quiet. The instrument panel, not the dashboard.

---

> Produced by: 4-agent Product Design Taste Team
> - 🧭 Interaction Flow Designer — operation weights, golden paths, keyboard shortcuts
> - 📐 Information Density Tuner — F-scan paths, density ratings, space audit
> - 🎭 State & Edge Case Designer — state matrix, FTUE, data sync, extreme cases
> - 🔮 Product Personality Definer — persona, tone of voice, delight moments, anti-patterns
> Fused by: Team Lead
