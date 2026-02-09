# CCEM Desktop Visual Redesign Specification

> Unified specification produced by the Design Critic / Taste Gatekeeper
>
> Created: 2026-02-08
> Based on review and fusion of 3 teammate proposals

---

## Design Review & Scoring

### Scoring Rubric (1-10)

| Criterion | Teammate 1 (Visual Identity) | Teammate 2 (Layout) | Teammate 3 (Motion) |
|---|---|---|---|
| **Distinctiveness** | 9 | 5 | 6 |
| **Restraint** | 6 | 9 | 7 |
| **Consistency** | 8 | 9 | 8 |
| **Implementability** | 7 | 9 | 8 |
| **Tweet-worthy** | 8 | 6 | 7 |
| **Total** | **38** | **38** | **36** |

### Critique

**Teammate 1 -- Visual Identity Designer**

Strengths:
- Volcanic Amber is genuinely distinctive. In a sea of indigo/blue developer tools (VS Code, Linear, Vercel), amber carves an immediately recognizable identity. The "control panel with amber indicators" metaphor is apt for an environment manager.
- The warm brown-gray neutral scale with matching hue undertones shows real craft. Most dark themes use pure cool grays; warm neutrals create a sense of physical material that feels desktop-native.
- The "CC" monogram mark is simple, memorable, and scalable.

Taste issues:
- **Three font families is excess.** Geist Sans + Inter serve near-identical roles. Dieter Rams: "Good design is as little design as possible." Pick one sans-serif. Inter alone handles both headings and body beautifully at different weights.
- **8-color data visualization palette is premature specification.** The app has at most 4-5 environment colors to distinguish. Specifying 8 is designing for a spreadsheet app you do not have. Kenya Hara: let emptiness speak.
- **Arctic Indigo and Obsidian Rose are distractions.** Offering three schemes dilutes conviction. Ship one. If it is wrong, change it. Do not hedge.

**Teammate 2 -- Layout & Composition Master**

Strengths:
- The double-padding diagnosis (`AppLayout px-6 py-8` + page `p-6` = 48px+ wasted) is precisely correct and shows real codebase understanding.
- `h-screen overflow-hidden` with only `PageContent` scrolling is the single most impactful architectural change. The current `min-h-screen` model lets the header scroll away, which is fundamentally wrong for a desktop app.
- The 4-level container hierarchy (L0-L3) solves the "all cards look identical" problem with systematic thinking.
- The icon rail + contextual header pattern is well-suited for 6 navigation targets without crowding.

Taste issues:
- **The 56px icon rail is too utilitarian.** Pure icon-only navigation with no labels at all creates a learning curve. A 64px rail with tiny labels beneath icons (a la macOS Finder sidebar or Figma) is more humane. Naoto Fukasawa: design people use without thinking.
- **"Empty states: text-only with action button, no emoji heroes"** goes too far in the other direction. An empty state needs at least a muted icon to create visual hierarchy. Not emoji, but a 48px lucide icon at 20% opacity is not decoration -- it is wayfinding.
- **Grid breakpoints are underspecified.** Stating "grid-cols-1/2/3 based on width" without defining the breakpoints is incomplete for implementation.

**Teammate 3 -- Micro-interactions & Motion Designer**

Strengths:
- The four motion principles are excellent and show genuine restraint: "Motion communicates state, never decorates."
- The timing token system (80ms/150ms/220ms/400ms/800ms) is well-calibrated to human perception thresholds.
- CSS-only approach with zero dependencies is pragmatic engineering.
- The `prefers-reduced-motion` respect is non-negotiable for accessibility and correctly included.

Taste issues:
- **Sparkle particles for milestone celebrations violate Principle 1.** If motion "never decorates," then CSS sparkles are pure decoration. A subtle scale + opacity change on the badge is sufficient. The golden gradient ring for streak milestones is equally guilty.
- **40ms stagger delay for children risks feeling "waterfally"** on pages with many items (e.g., 8 session cards = 320ms total delay). Reduce to 30ms with a cap at 5 items (150ms max total stagger).
- **Button 4-layer state (rest/hover/active/disabled) with "lift" and scale** is over-choreographed for a utility app. Buttons should feel responsive, not theatrical. A background color shift + subtle translateY(-1px) on hover is enough.
- **Heatmap "paint-in" with 3ms per cell** would be 1.5 seconds for a 365-day + 7-row grid (~500 cells). This is a slideshow, not an interface. Fade the entire heatmap in as one unit.

### Taste Lens Analysis

**Dieter Rams -- "Less but better":**
- Current codebase has decorative gradient blobs (3 blur-3xl divs in AppLayout) that serve zero functional purpose. Remove entirely.
- Tab labels currently show emoji + lucide icon + text. That is three visual indicators for one piece of information. Use icon only in the side rail, with a tiny label.
- The emerald-to-teal gradient on the logo and active tab indicators is gratuitous. A solid color is more confident.

**Kenya Hara -- "The power of emptiness":**
- The current Dashboard packs status bar + launch button + dropdowns + stats cards + recent projects into one scroll. There is no breathing room. The redesign must create deliberate negative space around the launch action.
- Data visualization should use whitespace as a design element. Charts do not need borders, backgrounds, or decorative elements. Let the data shapes themselves create the visual interest.

**Naoto Fukasawa -- "Without Thought" design:**
- The current 6-tab horizontal pill bar requires scanning across 6 items with mixed emoji+icon+text. A vertical icon rail leverages spatial memory (Home = top, Settings = bottom) so users navigate by position, not reading.
- Environment switching on the Dashboard uses a raw `<select>` element. This works. Do not replace it with a fancy custom dropdown unless the custom one is equally fast to use.

---

## 1. Design Philosophy

**"A lit instrument panel in a dark room."**

The app should feel like a well-engineered control surface: warm amber indicators on dark, quiet backgrounds. Every illuminated element means something. Nothing glows without purpose.

### Core Principles

1. **Instrument, not ornament.** Every visual element communicates state. If it does not, remove it.
2. **Warm in a cold world.** Warm amber tones differentiate us from the blue/indigo uniformity of developer tools. The warmth is functional: it signals "active, configured, under your control."
3. **Desktop-native, not web-ported.** Fixed chrome, scrolling content, no page reloads, no layout shift. The window is the app; the app fills the window.
4. **Quiet until needed.** The default state is calm. Animation, color, and emphasis appear only in response to state changes or user action.

---

## 2. Color System

### Design Rationale

Volcanic Amber provides market differentiation and conceptual alignment (environment manager = control panel = amber indicators). The warm neutral scale creates a sense of physicality that cool grays lack.

### CSS Custom Properties

```css
@layer base {
  :root {
    /* --- Primary & Accent --- */
    --primary: 33 78% 54%;            /* #E5922E - amber */
    --primary-foreground: 33 10% 98%; /* white text on amber */
    --accent: 16 65% 53%;             /* #D4633B - burnt sienna */
    --accent-foreground: 16 10% 98%;

    /* --- Backgrounds (light mode) --- */
    --background: 33 20% 97%;         /* #FAF8F5 - warm off-white */
    --foreground: 33 15% 10%;         /* #1C1916 - warm near-black */
    --card: 0 0% 100%;                /* #FFFFFF */
    --card-foreground: 33 15% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 33 15% 10%;

    /* --- Surfaces (light) --- */
    --surface-raised: 33 15% 95%;     /* #F5F2EF - L1 cards bg */
    --surface-overlay: 33 10% 92%;    /* #EEEBE7 - L2 nested */
    --surface-sunken: 33 20% 97%;     /* same as bg, for inset areas */

    /* --- Secondary & Muted (light) --- */
    --secondary: 33 10% 94%;          /* #F0EDEA */
    --secondary-foreground: 33 15% 20%;
    --muted: 33 10% 94%;
    --muted-foreground: 33 8% 50%;    /* #888078 */

    /* --- Borders (light) --- */
    --border: 33 12% 88%;             /* #E3DDD6 */
    --input: 33 12% 88%;
    --ring: 33 78% 54%;               /* same as primary for focus rings */

    /* --- Semantic (light) --- */
    --success: 152 56% 42%;           /* #34B87A */
    --success-foreground: 0 0% 100%;
    --warning: 46 74% 58%;            /* #E5C542 */
    --warning-foreground: 33 15% 10%;
    --destructive: 358 70% 60%;       /* #E5484D */
    --destructive-foreground: 0 0% 100%;
    --info: 210 50% 60%;              /* #5B9FD6 */
    --info-foreground: 0 0% 100%;

    /* --- Radius --- */
    --radius: 0.5rem;
    --radius-sm: 0.375rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;

    /* --- Sidebar (light) --- */
    --sidebar: 33 15% 95%;
    --sidebar-foreground: 33 8% 50%;
    --sidebar-active: 33 78% 54%;
    --sidebar-active-foreground: 33 10% 98%;
    --sidebar-border: 33 12% 88%;
  }

  .dark {
    /* --- Primary & Accent (dark) --- */
    --primary: 33 78% 54%;            /* #E5922E - amber, unchanged */
    --primary-foreground: 33 10% 98%;
    --accent: 16 65% 53%;             /* #D4633B */
    --accent-foreground: 16 10% 98%;

    /* --- Backgrounds (dark) --- */
    --background: 30 20% 5%;          /* #12100E - warm near-black */
    --foreground: 33 10% 90%;         /* #E8E4DF - warm off-white */
    --card: 30 14% 10%;               /* #1C1916 - L1 surface */
    --card-foreground: 33 10% 90%;
    --popover: 30 14% 10%;
    --popover-foreground: 33 10% 90%;

    /* --- Surfaces (dark) --- */
    --surface-raised: 30 12% 13%;     /* #27231F - L1 cards */
    --surface-overlay: 30 10% 17%;    /* #302B26 - L2 elevated */
    --surface-sunken: 30 20% 5%;      /* same as bg */

    /* --- Secondary & Muted (dark) --- */
    --secondary: 30 10% 15%;          /* #282320 */
    --secondary-foreground: 33 10% 85%;
    --muted: 30 10% 15%;
    --muted-foreground: 33 8% 55%;    /* #918A82 */

    /* --- Borders (dark) --- */
    --border: 30 8% 20%;              /* #363026 */
    --input: 30 8% 20%;
    --ring: 33 78% 54%;

    /* --- Semantic (dark) --- */
    --success: 152 50% 45%;
    --success-foreground: 0 0% 100%;
    --warning: 46 70% 55%;
    --warning-foreground: 33 15% 10%;
    --destructive: 358 65% 55%;
    --destructive-foreground: 0 0% 100%;
    --info: 210 45% 55%;
    --info-foreground: 0 0% 100%;

    /* --- Sidebar (dark) --- */
    --sidebar: 30 14% 8%;             /* #1A1714 */
    --sidebar-foreground: 33 8% 55%;
    --sidebar-active: 33 78% 54%;
    --sidebar-active-foreground: 33 10% 98%;
    --sidebar-border: 30 8% 15%;
  }
}
```

### Data Visualization Palette

For charts, heatmaps, and environment-color coding. Limited to 5 colors (the actual number of distinct data series in the app).

```css
:root {
  --chart-1: 33 78% 54%;   /* Amber - primary / Official */
  --chart-2: 210 50% 60%;  /* Steel blue - GLM */
  --chart-3: 152 56% 42%;  /* Green - DeepSeek */
  --chart-4: 280 45% 60%;  /* Muted purple - KIMI */
  --chart-5: 16 65% 53%;   /* Burnt sienna - MiniMax */
}

.dark {
  --chart-1: 33 78% 58%;
  --chart-2: 210 50% 65%;
  --chart-3: 152 50% 50%;
  --chart-4: 280 40% 65%;
  --chart-5: 16 60% 58%;
}
```

### Heatmap Intensity Scale

Four levels using primary amber at varying opacity:

| Level | CSS | Meaning |
|---|---|---|
| Empty | `bg-transparent` | No usage |
| Low | `bg-primary/15` | Light usage |
| Medium | `bg-primary/40` | Moderate usage |
| High | `bg-primary/70` | Heavy usage |
| Max | `bg-primary` | Peak usage |

---

## 3. Typography System

### Font Stack

Two families only. Not three.

| Role | Font | Fallback | Rationale |
|---|---|---|---|
| **UI (headings + body)** | Inter | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | Variable font with optical sizing. One family for all UI text eliminates visual noise. |
| **Code / monospace** | JetBrains Mono | `'SF Mono', 'Cascadia Code', 'Fira Code', monospace` | Designed for developer tools, excellent legibility at small sizes. |

### Font Loading Strategy

```html
<!-- Preload critical fonts in index.html -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

For offline/Tauri: bundle Inter and JetBrains Mono woff2 files in `public/fonts/` and use `@font-face` declarations.

### Size Scale (1.2 minor third ratio, base 14px)

| Token | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `text-2xs` | 10px / 0.625rem | 14px | 400 | Captions, timestamps |
| `text-xs` | 11px / 0.6875rem | 16px | 400-500 | Badges, tiny labels |
| `text-sm` | 12px / 0.75rem | 18px | 400-500 | Secondary text, table cells |
| `text-base` | 14px / 0.875rem | 22px | 400 | Body text (default) |
| `text-lg` | 16px / 1rem | 24px | 500-600 | Card titles, section headers |
| `text-xl` | 20px / 1.25rem | 28px | 600 | Page titles |
| `text-2xl` | 24px / 1.5rem | 32px | 700 | Hero numbers (stat values) |
| `text-3xl` | 30px / 1.875rem | 36px | 700 | Launch button text |

### Tailwind Config Extension

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Cascadia Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
    },
  },
};
```

---

## 4. Spacing & Layout Grid

### Base Unit

**4px.** All spacing values are multiples of 4.

### Spacing Scale

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `space-0` | 0px | `p-0` / `gap-0` | -- |
| `space-1` | 4px | `p-1` / `gap-1` | Inline padding, icon-to-text gap |
| `space-2` | 8px | `p-2` / `gap-2` | Compact internal padding |
| `space-3` | 12px | `p-3` / `gap-3` | Default internal card padding |
| `space-4` | 16px | `p-4` / `gap-4` | Standard component spacing |
| `space-5` | 20px | `p-5` / `gap-5` | Section gaps |
| `space-6` | 24px | `p-6` / `gap-6` | Page content padding |
| `space-8` | 32px | `p-8` / `gap-8` | Large section gaps |
| `space-10` | 40px | `p-10` / `gap-10` | Major section breaks |
| `space-12` | 48px | `p-12` / `gap-12` | Page vertical padding |
| `space-16` | 64px | `p-16` / `gap-16` | Hero spacing |

### Canonical Spacing Rules

- **Component internal padding**: `p-4` (16px)
- **Gap between sibling cards**: `gap-4` (16px)
- **Gap between sections**: `gap-8` (32px)
- **Page content padding**: `px-8 py-6` (32px horizontal, 24px vertical)
- **Page header height**: 48px (`h-12`)
- **Side rail width**: 64px (`w-16`)

### App Shell Structure

```
+--+--------------------------------------------------+
|  |  PageHeader (48px, sticky)                        |
|  +--------------------------------------------------+
| S|                                                    |
| i|                                                    |
| d|  PageContent (overflow-y-auto)                     |
| e|  px-8 py-6                                         |
| R|                                                    |
| a|                                                    |
| i|                                                    |
| l|                                                    |
|  |                                                    |
|64|                                                    |
|px|                                                    |
+--+--------------------------------------------------+
```

```tsx
// Component structure
<div className="h-screen flex overflow-hidden bg-background">
  <SideRail />                          {/* w-16 fixed */}
  <div className="flex-1 flex flex-col min-w-0">
    <PageHeader />                      {/* h-12 sticky */}
    <main className="flex-1 overflow-y-auto px-8 py-6">
      {children}
    </main>
  </div>
</div>
```

### Container Hierarchy

| Level | Purpose | Background | Border | Border Radius | Shadow |
|---|---|---|---|---|---|
| **L0** | Page background | `bg-background` | none | none | none |
| **L1** | Primary cards | `bg-card` | `border border-border` | `rounded-xl` | none in dark, `shadow-sm` in light |
| **L2** | Nested sections inside cards | `bg-surface-raised` | `border border-border/50` | `rounded-lg` | none |
| **L3** | Inline elements (badges, tags) | `bg-muted` | none | `rounded-md` | none |

**Rule**: Never nest L1 inside L1. If you need hierarchy, use L2 inside L1.

### Responsive / Window Size

Minimum window size: **880 x 640px** (set via Tauri config).

| Breakpoint | Width | Grid | Usage |
|---|---|---|---|
| `compact` | 880-1024px | `grid-cols-1` or `grid-cols-2` | Side rail collapses to 48px, labels hidden |
| `default` | 1024-1440px | `grid-cols-2` or `grid-cols-3` | Full side rail with labels |
| `wide` | 1440px+ | `grid-cols-3` or `grid-cols-4` | Content max-width capped at 1200px |

Content max-width: `max-w-6xl` (1152px) centered within the content area.

---

## 5. Component Style Guide

### 5.1 Buttons

Four variants, each with clear visual hierarchy.

| Variant | Rest State | Hover | Active | Disabled |
|---|---|---|---|---|
| **Primary** | `bg-primary text-primary-foreground` | `brightness-110 -translate-y-px` | `brightness-95 translate-y-0` | `opacity-50 cursor-not-allowed` |
| **Secondary** | `bg-secondary text-secondary-foreground` | `bg-secondary/80` | `bg-secondary/60` | `opacity-50` |
| **Outline** | `border border-border bg-transparent` | `bg-muted` | `bg-muted/80` | `opacity-50` |
| **Ghost** | `bg-transparent` | `bg-muted` | `bg-muted/80` | `opacity-50` |
| **Destructive** | `bg-destructive text-destructive-foreground` | `brightness-110` | `brightness-95` | `opacity-50` |

**Sizes:**

| Size | Height | Padding | Font | Icon |
|---|---|---|---|---|
| `sm` | 32px / `h-8` | `px-3` | `text-sm` | 14px |
| `default` | 36px / `h-9` | `px-4` | `text-sm` | 16px |
| `lg` | 44px / `h-11` | `px-6` | `text-base` | 18px |
| `xl` (launch only) | 52px / `h-13` | `px-8` | `text-lg` | 22px |

**Launch Button (special):**
```
bg-primary text-primary-foreground h-13 px-8 text-lg font-semibold
rounded-xl shadow-lg shadow-primary/20
hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5
active:translate-y-0 active:shadow-md
transition-all duration-150
```

### 5.2 Cards

**Environment Card (L1):**
```
bg-card border border-border rounded-xl p-4
hover:border-primary/30 transition-colors duration-150
```
Active environment: add `ring-1 ring-primary/40 border-primary/40`

**Session Card (L1):**
```
bg-card border border-border rounded-xl p-4
```
Contains: status dot (top-left), project name (bold), env + perm badges (L3), duration (muted), action buttons (bottom).

Status dot colors:
- Running: `bg-success` with subtle pulse animation
- Idle: `bg-warning` static
- Error: `bg-destructive` with slow blink
- Stopped: `bg-muted-foreground/40` static

**Stat Card (L1, for Dashboard + Analytics overview):**
```
bg-card border border-border rounded-xl p-4
cursor-pointer hover:border-primary/30
transition-colors duration-150
```
Layout: label (text-sm muted) above, value (text-2xl font-bold) below, optional trend indicator (text-xs).

**Analytics Chart Card (L1):**
```
bg-card border border-border rounded-xl p-5
```
Contains: title row (text-lg font-semibold + controls right-aligned), chart area below with `mt-4`.

### 5.3 Inputs & Forms

```
h-9 px-3 rounded-lg text-sm
bg-background border border-input
focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary
placeholder:text-muted-foreground
transition-colors duration-150
```

**Select (native, not custom):**
Same styling as input. Use native `<select>` for environment and permission dropdowns. Native selects are faster to use and more accessible. Do not build a custom dropdown unless the native one cannot convey the needed information.

**Labels:**
```
text-sm font-medium text-foreground mb-1.5
```

### 5.4 Badges & Tags

**Environment badge:**
```
inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
bg-chart-{N}/15 text-chart-{N}
```
Where N corresponds to the environment's assigned chart color.

**Permission mode badge:**
```
inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
```
Colors by mode:
- `yolo`: `bg-destructive/15 text-destructive` (red = danger, intentionally alarming)
- `dev`: `bg-primary/15 text-primary` (amber = default working state)
- `safe`: `bg-success/15 text-success` (green = safe)
- `readonly`: `bg-info/15 text-info` (blue = informational)
- `ci`: `bg-muted text-muted-foreground` (neutral)
- `audit`: `bg-warning/15 text-warning` (yellow = caution)

**Status badge (for sessions):**
```
inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs
```
Contains a 6px status dot + text label.

### 5.5 Navigation

**Side Rail (64px):**
```tsx
<aside className="w-16 h-screen flex flex-col items-center py-4 gap-1
  bg-sidebar border-r border-sidebar-border">

  {/* Logo */}
  <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center mb-6">
    <span className="text-primary-foreground font-bold text-xs tracking-tight">CC</span>
  </div>

  {/* Nav items */}
  {navItems.map(item => (
    <button className={cn(
      "w-11 h-11 rounded-lg flex flex-col items-center justify-center gap-0.5",
      "transition-colors duration-150",
      isActive
        ? "bg-sidebar-active/15 text-sidebar-active"
        : "text-sidebar-foreground hover:text-foreground hover:bg-muted"
    )}>
      <item.icon className="w-5 h-5" />
      <span className="text-2xs leading-none">{item.label}</span>
    </button>
  ))}

  {/* Spacer */}
  <div className="flex-1" />

  {/* Settings at bottom */}
  <SettingsNavItem />
</aside>
```

**Nav items (top to bottom):**

| Position | Icon (Lucide) | Label | ID |
|---|---|---|---|
| 1 | `Home` | Home | `dashboard` |
| 2 | `Terminal` | Sessions | `sessions` |
| 3 | `Globe` | Envs | `environments` |
| 4 | `BarChart3` | Stats | `analytics` |
| 5 | `Sparkles` | Skills | `skills` |
| Bottom | `Settings` | Settings | `settings` |

No emoji anywhere in navigation. Lucide icons only, with tiny text labels.

**Page Header (48px):**
```tsx
<header className="h-12 flex items-center justify-between px-8
  border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
  <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
  <div className="flex items-center gap-3">
    {/* Page-specific actions: e.g., [+ Add] button, time range selector */}
  </div>
</header>
```

### 5.6 Dialogs & Modals

```
bg-card border border-border rounded-xl shadow-xl
p-6 w-full max-w-md
```

Overlay: `bg-background/60 backdrop-blur-sm`

Dialog title: `text-lg font-semibold text-foreground mb-4`
Dialog description: `text-sm text-muted-foreground mb-6`
Dialog footer: `flex justify-end gap-3 mt-6 pt-4 border-t border-border`

### 5.7 Empty / Loading / Error States

**Empty state:**
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <Icon className="w-12 h-12 text-muted-foreground/20 mb-4" />
  <p className="text-sm text-muted-foreground mb-4">{message}</p>
  <Button variant="outline" size="sm">{actionLabel}</Button>
</div>
```

A muted icon at 20% opacity provides visual anchoring without being decorative. This is wayfinding, not ornamentation.

**Loading state (skeleton):**
```tsx
<div className="animate-pulse">
  <div className="h-4 bg-muted rounded w-1/3 mb-3" />
  <div className="h-4 bg-muted rounded w-2/3 mb-3" />
  <div className="h-4 bg-muted rounded w-1/2" />
</div>
```

Use skeleton screens, never spinners. Skeleton communicates what will appear; spinners communicate nothing.

**Error state (inline banner):**
```tsx
<div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
  <div>
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-sm text-muted-foreground mt-1">{description}</p>
    <Button variant="outline" size="sm" className="mt-3">{retryLabel}</Button>
  </div>
</div>
```

Errors are inline, within the section that failed. Never full-page error states.

---

## 6. Motion & Animation Spec

### Motion Principles

1. **Motion communicates state, never decorates.** If you cannot describe what state the animation conveys, remove it.
2. **Fast enough to not interrupt, slow enough to be perceived.** The 80-220ms range for most interactions.
3. **Entrances decelerate, exits accelerate.** Objects arriving slow down as they settle; objects leaving speed up as they go.
4. **Respect the system.** Honor `prefers-reduced-motion: reduce` by disabling all non-essential animation.

### Timing Tokens (CSS Custom Properties)

```css
:root {
  /* Durations */
  --duration-instant: 80ms;
  --duration-fast: 150ms;
  --duration-normal: 220ms;
  --duration-slow: 400ms;
  --duration-extended: 800ms;

  /* Easing */
  --ease-default: cubic-bezier(0.25, 0.1, 0.25, 1.0);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1.0);
  --ease-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1.0);
  --ease-accelerate: cubic-bezier(0.4, 0.0, 1.0, 1.0);
}
```

### Page Transitions

When switching tabs, the outgoing page fades out and the incoming page fades in with a slight upward slide.

```css
@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-transition-enter {
  animation: page-enter var(--duration-normal) var(--ease-decelerate) both;
}
```

No exit animation needed -- instant removal feels faster and avoids janky overlap.

### Component Animations

**Button hover/active:**
```css
.btn {
  transition: background-color var(--duration-instant) var(--ease-default),
              transform var(--duration-instant) var(--ease-default),
              box-shadow var(--duration-fast) var(--ease-default);
}
.btn:hover {
  transform: translateY(-1px);
}
.btn:active {
  transform: translateY(0);
}
```

**Card hover (environment/session cards only):**
```css
.interactive-card {
  transition: border-color var(--duration-fast) var(--ease-default);
}
.interactive-card:hover {
  border-color: hsl(var(--primary) / 0.3);
}
```

No lift, no scale, no accent line animations. Just a subtle border color shift. This is a utility app.

**Status dot pulse (running sessions):**
```css
@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.status-running {
  animation: status-pulse 2s var(--ease-default) infinite;
}
```

**Status dot blink (error):**
```css
@keyframes status-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
.status-error {
  animation: status-blink 1.2s steps(2) infinite;
}
```

### Data Animations

**Number count-up (stat values):**
When a stat card receives a new value, count from old to new over `--duration-extended` (800ms) with decelerate easing. Implement with `requestAnimationFrame`:

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
      // Decelerate easing: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + delta * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target]);
  return value;
}
```

**Heatmap entrance:**
Fade the entire heatmap container in as one unit. Do NOT stagger individual cells.

```css
.heatmap-enter {
  animation: page-enter var(--duration-slow) var(--ease-decelerate) both;
}
```

**Chart line draw:**
For SVG-based line charts, use `stroke-dashoffset` animation:

```css
.chart-line {
  stroke-dasharray: var(--line-length);
  stroke-dashoffset: var(--line-length);
  animation: draw-line var(--duration-extended) var(--ease-decelerate) forwards;
}
@keyframes draw-line {
  to { stroke-dashoffset: 0; }
}
```

**Bar chart grow:**
```css
.chart-bar {
  transform-origin: bottom;
  animation: bar-grow var(--duration-slow) var(--ease-decelerate) both;
}
@keyframes bar-grow {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}
```

Stagger bar animations at 30ms intervals, cap at 10 bars (300ms max total).

### Milestone / Celebration Effects

When a milestone is reached, the milestone badge does a single `scale(1.05)` with `--ease-spring` easing, then settles back. No particles, no sparkles, no golden rings. The spring overshoot itself provides enough "celebration" feel.

```css
@keyframes milestone-pop {
  0% { transform: scale(0.95); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
.milestone-achieved {
  animation: milestone-pop var(--duration-slow) var(--ease-spring) both;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Complete CSS Block

All motion-related CSS to add to `index.css`:

```css
/* === Motion Tokens === */
:root {
  --duration-instant: 80ms;
  --duration-fast: 150ms;
  --duration-normal: 220ms;
  --duration-slow: 400ms;
  --duration-extended: 800ms;
  --ease-default: cubic-bezier(0.25, 0.1, 0.25, 1.0);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1.0);
  --ease-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1.0);
  --ease-accelerate: cubic-bezier(0.4, 0.0, 1.0, 1.0);
}

/* === Page Transition === */
@keyframes page-enter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.page-transition-enter {
  animation: page-enter var(--duration-normal) var(--ease-decelerate) both;
}

/* === Status Indicators === */
@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes status-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
.status-running { animation: status-pulse 2s var(--ease-default) infinite; }
.status-error { animation: status-blink 1.2s steps(2) infinite; }

/* === Data Animations === */
@keyframes draw-line {
  to { stroke-dashoffset: 0; }
}
@keyframes bar-grow {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}
.chart-line {
  stroke-dasharray: var(--line-length);
  stroke-dashoffset: var(--line-length);
  animation: draw-line var(--duration-extended) var(--ease-decelerate) forwards;
}
.chart-bar {
  transform-origin: bottom;
  animation: bar-grow var(--duration-slow) var(--ease-decelerate) both;
}

/* === Milestone === */
@keyframes milestone-pop {
  0% { transform: scale(0.95); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
.milestone-achieved {
  animation: milestone-pop var(--duration-slow) var(--ease-spring) both;
}

/* === Skeleton Shimmer === */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 25%,
    hsl(var(--muted-foreground) / 0.08) 50%,
    hsl(var(--muted)) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s var(--ease-default) infinite;
}

/* === Reduced Motion === */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Page-by-Page Visual Transformation

### 7.1 Home (Dashboard)

**Current problems:**
- Double padding (AppLayout px-6 py-8 + page p-6)
- Emoji in stat values ("💬", "📊", "💰") -- these are data, not decoration
- Raw `<select>` elements look acceptable but are unstyled relative to the design system
- Launch button is generic shadcn primary, does not stand out as the hero action

**Changes:**

1. **Remove all emoji from stat values.** Numbers speak for themselves. Labels provide context.
2. **Elevate launch button** to `xl` size with `shadow-lg shadow-primary/20`. Center it with generous vertical space (`py-12`).
3. **Quick actions row** (env selector, perm selector, directory picker) sits directly beneath the launch button with `gap-4 mt-6`.
4. **Stat cards** form a `grid grid-cols-3 gap-4` row. Each card: label top (text-sm muted), value bottom (text-2xl bold). Clickable: navigates to relevant tab.
5. **Recent projects** section: `mt-8` with simple `text-lg font-semibold` section header. Project items in a `grid grid-cols-2 lg:grid-cols-4 gap-3` grid. Each item shows project name (font-medium) + relative time (text-xs muted).
6. **Status bar** at the top: single line showing `Environment: {name} · Permission: {mode} · {N} sessions running` in `text-sm text-muted-foreground`. Use badge components for env and perm names.
7. **Remove working directory display** as standalone text line -- show it as the third quick-action button label instead.

### 7.2 Sessions

**Changes:**

1. **Page header**: "Sessions ({count})" left, `[Card view] [List view]` toggle + `[+ New Session]` button right.
2. **Card grid**: `grid grid-cols-2 lg:grid-cols-3 gap-4`. Each card is L1.
3. **Session card layout:**
   ```
   ┌──────────────────────────┐
   │ ● project-name           │  ← status dot + name (font-semibold)
   │ env-badge  perm-badge    │  ← L3 badges
   │ 12 minutes               │  ← text-xs muted
   │                          │
   │ [Focus]  [—]  [✕]       │  ← action buttons (ghost variant, sm)
   └──────────────────────────┘
   ```
4. **Bulk actions bar** at bottom (sticky): `[Tile 4-up] [Minimize All] [Close All]`. Only visible when sessions > 0.
5. **Empty state**: Terminal icon at 20% opacity + "No active sessions" + "Launch Claude Code" button.
6. **List view**: simple table with columns: Status, Project, Environment, Permission, Duration, Actions. No card borders, just horizontal dividers.

### 7.3 Environments

**Changes:**

1. **Page header**: "Environments" left, `[+ Add]` button right.
2. **Environment list**: vertical stack with `gap-4`. Each env is an L1 card.
3. **Environment card layout:**
   ```
   ┌──────────────────────────────────────────────────┐
   │ env-name                          [Active] badge  │  ← if current
   │ ────────────────────────────────────────────────  │
   │ Base URL   https://open.bigmodel.cn/...          │  ← text-sm mono
   │ Model      glm-4-flash                           │
   │ API Key    glm-***...abc                          │
   │                                                   │
   │ [Edit]  [Switch to this env]            [Delete]  │
   └──────────────────────────────────────────────────┘
   ```
4. **Active environment** card: `ring-1 ring-primary/40` + "Active" badge in primary color.
5. **Protected environments** (official): replace delete button with `text-xs text-muted-foreground` saying "Protected".
6. **Permission section** below environments, separated by `mt-8`:
   - Section header: "Permission Mode"
   - Default mode: label + `<select>` (same style as Dashboard)
   - Quick switch row: 6 permission badges as toggle buttons. Active one has filled background; others are outline.
   - Helper text: "Temporary permission applies to next launch only" in `text-xs text-muted-foreground`.

### 7.4 Analytics

**Changes:**

1. **Page header**: "Analytics" left, time range selector `[Hour] [Day] [Week] [Month]` right as a segmented control (group of ghost buttons, active one gets `bg-muted`).
2. **Stat cards row**: `grid grid-cols-3 gap-4`. Total tokens, total cost, streak days. Each with trend indicator (`text-xs text-success` for positive, `text-xs text-destructive` for negative).
3. **Token chart**: L1 card. Title row with chart type toggle (line/bar). Chart fills remaining card space. Use the 5-color data visualization palette for different environments.
4. **Model distribution**: L1 card. Horizontal bar chart. Each bar shows model name left, percentage bar center, cost right. Bars use muted foreground color with primary color for the largest segment.
5. **Heatmap calendar**: L1 card. GitHub-style contribution graph. Use the 5-level primary amber intensity scale. Hover tooltip shows date + token count + cost. Fade in as one unit (no cell-by-cell stagger).
6. **Milestones**: L1 card at bottom. Simple horizontal list of milestone items. Achieved ones: solid primary color. Pending: `text-muted-foreground` with dashed border. Use `milestone-achieved` animation class for newly unlocked milestones.
7. **No emoji** in any stat labels or values.

### 7.5 Skills

**Changes:**

1. **Page header**: "Skills" left, `[+ Add Skill]` button right.
2. **Installed skills list**: vertical stack, `gap-3`. Each skill is an L1 card.
3. **Skill card**: compact -- one line with icon, name, source badge, and action buttons (`[View] [Remove]`).
4. **CLI hint**: at bottom, L2 container with `font-mono text-sm` showing CLI equivalents.
5. **Empty state**: Sparkles icon at 20% opacity + "No skills installed" + "Add your first skill" button.

### 7.6 Settings

**Changes:**

1. **Page header**: "Settings" (no additional actions).
2. **Sections** with clear headers (`text-lg font-semibold` + `border-b border-border pb-2 mb-4`):
   - Appearance: theme toggle (three radio-style buttons: Dark / Light / System)
   - Application: three toggle switches (auto-start, minimize to tray on launch, minimize on close)
   - Default Permission: `<select>` for default mode
   - About: version number, [Check for Updates] button, [GitHub] link, [Report Issue] link
3. **Max 5 settings items.** Do not add more without removing one.
4. **Content width**: `max-w-lg` (512px), left-aligned. Settings pages should not stretch to fill wide windows.

---

## 8. Implementation Diff Checklist

### File: `apps/desktop/src/index.css`

**Action: Replace entirely** with the new color system, typography reset, and motion CSS.

Changes:
- Replace all `:root` CSS variables with the Volcanic Amber light mode palette
- Replace all `.dark` CSS variables with the Volcanic Amber dark mode palette
- Add new custom properties: `--surface-raised`, `--surface-overlay`, `--surface-sunken`, `--sidebar`, `--sidebar-*`, `--success`, `--warning`, `--info`, chart colors
- Add motion token variables (`--duration-*`, `--ease-*`)
- Add all `@keyframes` definitions (page-enter, status-pulse, status-blink, draw-line, bar-grow, milestone-pop, shimmer)
- Add utility classes (`.page-transition-enter`, `.status-running`, `.status-error`, `.chart-line`, `.chart-bar`, `.milestone-achieved`, `.skeleton-shimmer`)
- Add `prefers-reduced-motion` media query
- Update `body` font-family to `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Remove the emerald-teal primary green theme entirely

### File: `apps/desktop/tailwind.config.js` (or `tailwind.config.ts`)

**Action: Extend theme**

Changes:
- Add `fontFamily.sans` and `fontFamily.mono` overrides
- Add `fontSize['2xs']` definition
- Add `colors.surface-raised`, `colors.surface-overlay`, `colors.surface-sunken` mapping to CSS vars
- Add `colors.sidebar`, `colors.sidebar-*` mapping to CSS vars
- Add `colors.success`, `colors.warning`, `colors.info` mapping to CSS vars
- Add `colors.chart-{1-5}` mapping to CSS vars
- Add `borderRadius` tokens (`sm`, `lg`, `xl`) if not present
- Add custom `spacing` or `height` for `h-13` (52px) for the launch button

### File: `apps/desktop/src/components/layout/AppLayout.tsx`

**Action: Rewrite to AppShell pattern**

Changes:
- Remove the `min-h-screen` wrapper with gradient background
- Remove all three decorative gradient blob `<div>` elements
- Remove the `<header>` with logo, TabNav, and version badge
- Replace with: `h-screen flex overflow-hidden bg-background` container
- Add `<SideRail>` component (w-16, left)
- Add `<main>` wrapper with flex-col: `<PageHeader>` (h-12 sticky) + `<div>` (flex-1 overflow-y-auto px-8 py-6)
- Pass `activeTab` and `onTabChange` to `<SideRail>` instead of `<TabNav>`
- Pass `pageTitle` to `<PageHeader>` (derive from activeTab)

### File: `apps/desktop/src/components/layout/TabNav.tsx`

**Action: Rename to `SideRail.tsx` and rewrite**

Changes:
- Change from horizontal pill-bar layout to vertical icon-rail layout
- Remove emoji from tab labels entirely
- Use icon + tiny label (text-2xs) stacked vertically in each nav button
- Place Settings at the bottom with `flex-1` spacer above it
- Add "CC" logo block at top (9x9 square, bg-primary, rounded-lg)
- Active state: `bg-sidebar-active/15 text-sidebar-active` (no gradient underline)
- Width: `w-16` (64px)

### New file: `apps/desktop/src/components/layout/PageHeader.tsx`

**Action: Create**

Content:
- 48px height sticky header
- Page title (text-lg font-semibold) on left
- Slot for page-specific actions on right
- Bottom border (`border-b border-border`)
- Semi-transparent background with backdrop blur

### New file: `apps/desktop/src/components/layout/SideRail.tsx`

**Action: Create**

Content:
- Vertical nav rail component, 64px wide
- Logo at top, nav items below, Settings pinned to bottom
- Props: `activeTab`, `onTabChange`

### File: `apps/desktop/src/pages/Dashboard.tsx`

**Action: Modify**

Changes:
- Remove `p-6` wrapper (parent now provides px-8 py-6)
- Remove emoji from stat card values ("💬", "📊", "💰")
- Add `text-2xl font-bold` to stat values
- Upgrade launch button to xl size: `h-13 px-8 text-lg font-semibold rounded-xl shadow-lg shadow-primary/20`
- Add hover/active transform classes to launch button
- Wrap stat cards in `grid grid-cols-3 gap-4`
- Add `page-transition-enter` class to page root div

### File: `apps/desktop/src/pages/Sessions.tsx`

**Action: Modify**

Changes:
- Remove `p-6` wrapper
- Add `page-transition-enter` class
- Add card/list view toggle in page header actions
- Add empty state with Terminal icon at 20% opacity
- Add bulk action bar (sticky bottom) when sessions exist

### File: `apps/desktop/src/pages/Environments.tsx`

**Action: Modify**

Changes:
- Remove `p-6` wrapper
- Add `page-transition-enter` class
- Add `ring-1 ring-primary/40` to active environment card
- Add permission mode section at bottom with badge-style toggles

### File: `apps/desktop/src/pages/Analytics.tsx`

**Action: Modify**

Changes:
- Remove `p-6` wrapper
- Add `page-transition-enter` class
- Remove emoji from stat labels
- Add time range segmented control in page header
- Apply chart animation classes (`.chart-line`, `.chart-bar`)
- Apply `.heatmap-enter` to heatmap container
- Apply `.milestone-achieved` to newly unlocked milestones

### File: `apps/desktop/src/pages/Skills.tsx`

**Action: Modify**

Changes:
- Remove `p-6` wrapper
- Add `page-transition-enter` class
- Add proper empty state

### File: `apps/desktop/src/pages/Settings.tsx`

**Action: Modify**

Changes:
- Remove `p-6` wrapper
- Add `page-transition-enter` class
- Cap content width at `max-w-lg`
- Left-align content (not centered)

### File: `apps/desktop/src/components/sessions/SessionCard.tsx`

**Action: Modify**

Changes:
- Add status dot with appropriate animation class (`status-running`, `status-error`, or static)
- Use L3 badges for env and permission mode
- Remove any emoji from card content

### File: `apps/desktop/src/components/analytics/TokenChart.tsx`

**Action: Modify**

Changes:
- Apply `.chart-line` or `.chart-bar` classes to SVG/chart elements
- Use `--chart-{1-5}` colors for environment series
- Remove any decorative borders or backgrounds from chart area

### File: `apps/desktop/src/components/analytics/HeatmapCalendar.tsx`

**Action: Modify**

Changes:
- Use primary amber at 5 opacity levels for intensity scale
- Add `.heatmap-enter` class to container (single fade-in, no cell stagger)
- Simplify hover tooltip: just date + tokens + cost

### File: `apps/desktop/src/components/analytics/MilestoneCard.tsx`

**Action: Modify**

Changes:
- Remove emoji from milestone items
- Achieved: solid primary color background
- Pending: `text-muted-foreground border border-dashed border-border`
- Add `.milestone-achieved` class to newly unlocked items

### File: `apps/desktop/src/components/ui/button.tsx`

**Action: Modify**

Changes:
- Add `xl` size variant: `h-13 px-8 text-lg`
- Update all variants to use new color tokens (primary = amber, not emerald)
- Add transition classes: `transition-all duration-[var(--duration-instant)]`
- Add hover transform: `hover:-translate-y-px`
- Add active transform: `active:translate-y-0`

### File: `apps/desktop/src/components/ui/card.tsx`

**Action: Modify**

Changes:
- Update default card to use `rounded-xl` (not `rounded-lg`)
- Ensure `bg-card border border-border` is the base
- Add `.interactive-card` variant class for cards with hover effects

### File: `apps/desktop/src/App.tsx`

**Action: Modify**

Changes:
- Update `<AppLayout>` usage to pass `pageTitle` derived from `activeTab`
- Add key prop to page components for transition re-triggering: `key={activeTab}`

### File: `apps/desktop/index.html` (or equivalent)

**Action: Modify**

Changes:
- Add Google Fonts preconnect and stylesheet link for Inter + JetBrains Mono
- Or: add `@font-face` declarations pointing to bundled woff2 files in `public/fonts/`

### File: `apps/desktop/src-tauri/tauri.conf.json`

**Action: Modify**

Changes:
- Set minimum window size to 880x640:
  ```json
  "windows": [{
    "minWidth": 880,
    "minHeight": 640
  }]
  ```

---

## Summary of Removed Elements

These items from the current codebase are explicitly removed in this redesign:

1. **Decorative gradient blobs** (AppLayout.tsx, 3 blur-3xl divs) -- zero functional value
2. **Emerald/teal gradient** on logo and active tab -- replaced with solid amber
3. **Emoji in navigation labels** -- replaced with Lucide icons + tiny text
4. **Emoji in data values** ("💬", "📊", "💰") -- data needs no decoration
5. **Horizontal pill-bar tab navigation** -- replaced with vertical side rail
6. **min-h-screen scroll model** -- replaced with h-screen + overflow-hidden shell
7. **Double padding** (AppLayout px-6 py-8 + page p-6) -- single px-8 py-6 on content area
8. **Version badge in header** -- move to Settings > About
9. **Sun/moon theme toggle button in header** -- move to Settings > Appearance
10. **animate-pulse on logo status dot** -- use deliberate status-pulse with proper timing

## Summary of What Each Teammate Contributed to the Final Spec

| Element | Source | Modifications |
|---|---|---|
| Color system (Volcanic Amber) | Teammate 1 | Reduced from 3 schemes to 1. Simplified data palette from 8 to 5 colors. |
| Typography | Teammate 1 | Reduced from 3 font families to 2 (dropped Geist Sans, kept Inter + JetBrains Mono). |
| CC monogram logo | Teammate 1 | Kept as-is. Solid primary background, no gradient. |
| App shell architecture | Teammate 2 | Kept h-screen + overflow-hidden. Widened rail from 56px to 64px, added tiny labels. |
| Spacing system | Teammate 2 | Adopted 4px base unit and canonical spacing rules. |
| Container hierarchy L0-L3 | Teammate 2 | Adopted fully. |
| Empty state pattern | Teammate 2 | Modified: added muted icon at 20% opacity for visual anchoring. |
| Skeleton loading | Teammate 2 | Adopted. Added shimmer animation from Teammate 3. |
| Motion token system | Teammate 3 | Adopted all timing tokens and easing curves. |
| Motion principles | Teammate 3 | Adopted all 4 principles. |
| Page transitions | Teammate 3 | Simplified: enter only, no exit animation. |
| Status dot animations | Teammate 3 | Adopted pulse and blink. |
| Chart animations | Teammate 3 | Adopted line draw and bar grow. |
| Celebration effects | Teammate 3 | Radically simplified: single spring-scale pop only. No sparkles, no golden rings. |
| Heatmap animation | Teammate 3 | Changed from per-cell stagger to single fade-in. |
| Button states | Teammate 3 | Simplified from 4-layer choreography to translateY(-1px) hover only. |

---

> This document is the single source of truth for the CCEM Desktop visual redesign.
> Every hex code, pixel value, and CSS class is implementation-ready.
> When in doubt, choose the quieter option.
