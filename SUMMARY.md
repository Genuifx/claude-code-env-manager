# Dashboard Glassmorphism Polish Summary

## Overview

Pixel-perfect glassmorphism refinement for the Dashboard page and ProjectList component, ensuring every UI element follows the macOS Sequoia frosted glass design language in both dark and light modes.

## Changes by Zone

### Zone 1: Status Header (hero-gradient)

**Problem**: `border border-border` on the hero panel was a gray border that overrode the white glass border already defined in the `.hero-gradient` CSS class. Dropdowns used `bg-popover` (solid) with `border-border` (gray). Session indicator used `bg-surface-raised` (solid).

**Fixes**:
- Removed redundant `border border-border shadow-elevation-1` from hero panel (`.hero-gradient` already has white glass border + inset highlight)
- Environment badge: `rounded-lg` -> `rounded-md` (Control level), refined opacity values using CSS variables
- Dropdowns: Replaced `border-border bg-popover shadow-elevation-3 glass` with new `glass-dropdown glass-noise` class (heavy blur 48px, white border, inset highlight, deep shadow)
- Dropdown items: Replaced `hover:bg-surface-raised` with `glass-dropdown-item` class (semi-transparent white hover, adapts to dark/light)
- Session indicator: Replaced `bg-surface-raised hover:bg-surface-overlay` with `glass-indicator` class (semi-transparent white background with glass border)
- Permission badge: `rounded-lg` -> `rounded-md` (Control level)
- Audit mode color: `bg-muted border-border` -> `bg-accent/15 border-accent/30` (consistent with other modes)

### Zone 2: Quick Action Bar

**Problem**: Outline button used default `border-input bg-background` (gray border, opaque background). Launch button used `shadow-md` without glass-aware glow.

**Fixes**:
- Directory picker button: Added `glass-outline-btn border-0` class (semi-transparent white background, white glass border, inset highlight)
- Launch button: Replaced `shadow-md` with `glass-launch-btn` class (blue glow shadow that intensifies on hover, adapts to dark/light)
- Launch button: `rounded-lg` -> `rounded-md` (Control level)

### Zone 3: Metrics Bento Grid

**Problem**: Streak card's "days" text was inside a `gradient-text` span, causing `-webkit-text-fill-color: transparent` to make it invisible.

**Fixes**:
- Streak card: Separated the number and "days" text into sibling elements using `flex items-baseline gap-1`, so the gradient only applies to the number while "days" renders normally as `text-muted-foreground`

### Zone 4: ProjectList Component

**Problem**: All project list items used `bg-card` (solid background) + `border border-border` (gray border) -ero glass effect. Action buttons used text characters instead of Lucide icons.

**Fixes**:
- All list items: Replaced `bg-card rounded-lg border border-border hover:border-primary/40` with `glass-list-item rounded-lg` (semi-transparent background at 50% glass opacity, white border, light blur 16px, inset highlight, hover lifts 0.5px with brighter border)
- Play buttons: Replaced text character with `<Play>` Lucide icon (w-3.5 h-3.5)
- Delete buttons: Replaced text character with `<X>` Lucide icon (w-3.5 h-3.5)
- Add buttons: Replaced text character with `<Plus>` Lucide icon
- Add card: Replaced `border-dashed border-border hover:border-primary/40 hover:bg-primary/5` with `glass-add-btn` class (white dashed border, hover transitions to primary color)
- Button sizing: Changed from `size="sm"` to `size="icon"` with explicit `w-8 h-8` for action buttons (more compact, consistent)
- Button gaps: `gap-2` -> `gap-1` for action button groups (tighter spacing)
- Hover backgrounds: `hover:bg-primary/10` -> `hover:bg-primary/[0.08]` (more subtle on glass)

## New CSS Classes Added to index.css

| Class | Purpose | Key Properties |
|-------|---------|---------------|
| `glass-dropdown` | Popover menus on glass surfaces | blur 48px, saturate 220%, white border, deep shadow |
| `glass-dropdown-item` | Dropdown menu items | Semi-transparent white hover (0.07 dark / 0.35 light) |
| `glass-list-item` | Project list rows | 50% glass opacity bg, blur 16px, white border, hover lift |
| `glass-indicator` | Session count button | Semi-transparent white bg, glass border |
| `glass-add-btn` | Dashed "add" button | White dashed border, hover -> primary color |
| `glass-outline-btn` | Outline buttons on glass | White bg + border, inset highlight |
| `glass-launch-btn` | Primary CTA button | Blue glow shadow, intensifies on hover |

All new classes use CSS custom variables for dark/light mode adaptation (no `dark:` prefix).

## Design Principles Applied

1. **White borders, not gray** -- All `border-border` replaced with `--glass-border-light` (white at varying opacity)
2. **Semi-transparent backgrounds** -- All `bg-card` replaced with glass opacity calculations
3. **Lucide icons, not text characters** -- Text symbols replaced with Play, X, Plus components
4. **4-level radius system** -- Hero=2xl, Card=xl, Item=lg, Control=md
5. **No `dark:` prefix** -- All dark/light differences via CSS variables in `:root` and `.light`
6. **Glass-aware hover states** -- Semi-transparent white instead of solid surface colors
