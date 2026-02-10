# Frosted Glass — macOS Sequoia Glassmorphism Theme

## Design Philosophy

This theme draws direct inspiration from **macOS Sequoia's window chrome and control surfaces** — the restrained, optically precise frosted glass that Apple uses across Finder, Settings, and system panels. The goal is not flashy glassmorphism, but the quiet confidence of real desktop software.

The key principle: **glass should feel like a material property, not a decoration.**

## Color Strategy

### Primary: System Blue (HSL 211, 100%, 50%)
Chosen to match macOS Sequoia's default accent color exactly. This creates instant familiarity for Mac users — buttons, active indicators, and focus rings all feel native.

### Neutral Scale: Cool Gray (HSL 220, low saturation)
The entire gray scale sits on a `220` hue base with carefully controlled saturation (16% at the darkest, tapering to 6% at lighter values). This micro-tint of blue in the grays is what gives macOS its characteristic "cool professionalism" — warmer grays would read as earthy or vintage.

### Why Not Warm Tones?
The previous "Midnight Sapphire" theme used `222` hue grays. We shifted to `220` (slightly warmer within cool) and reduced saturation further to avoid the "space UI" feeling and lean toward macOS's more grounded aesthetic.

## Glass Layer Hierarchy

The most critical design decision is the **three-tier blur hierarchy**:

| Layer | Blur | Saturate | Opacity | Purpose |
|-------|------|----------|---------|---------|
| Sidebar | 40px | 200% | 0.72 | Heaviest frost — visual anchor, always visible landmark |
| Cards | 20px | 190% | 0.55 | Medium frost — content containers, interactive |
| Subtle | 12px | 160% | ~0.28 | Light frost — secondary surfaces, minimal interference |

### Why This Matters
Without a blur hierarchy, all glass surfaces compete for attention. The sidebar's 40px blur makes it feel **permanently frosted** (like bathroom glass), while cards at 20px feel more like **looking through a cold window** — you can sense depth behind them.

## Key CSS Techniques

### 1. Inset Top-Edge Highlight
```css
box-shadow: inset 0 0.5px 0 0 rgba(255, 255, 255, 0.1);
```
This single `0.5px` inset shadow at the top edge of every glass surface simulates the way real glass catches overhead light. It is the most important detail separating professional glassmorphism from amateur implementations.

### 2. Saturate Alongside Blur
```css
backdrop-filter: blur(24px) saturate(190%);
```
Pure blur desaturates the background content, making everything look washed out. Adding `saturate(190%)` counteracts this and keeps underlying colors vivid — exactly how Apple implements their vibrancy effects.

### 3. CSS Custom Properties for Glass Tokens
All glass parameters are tokenized (`--glass-blur`, `--glass-bg-opacity`, etc.) and have separate values in dark vs light mode. This means:
- Dark mode: lower opacity (0.55) so glass is more transparent, revealing the dark depth beneath
- Light mode: higher opacity (0.72) because light-on-light glass needs more substance to read as a surface

### 4. Glass Shimmer Animation
A subtle 8-second ambient light sweep across glass surfaces using a narrow gradient band. The slow speed (8s) makes it feel like natural light shifting across a surface, not a loading indicator.

### 5. Active Nav Pill
Active navigation buttons get a dedicated `.glass-nav-active` class with:
- Tinted background using the primary blue at 10% opacity
- Inset top highlight tinted blue
- Soft blue glow halo (12px spread at 8% opacity)
This creates a "selected" feel that's distinctly glass-native rather than a flat color swap.

## Light vs Dark Mode Differences

| Property | Dark | Light | Rationale |
|----------|------|-------|-----------|
| Glass BG opacity | 0.55 | 0.72 | Light mode needs more opacity for contrast |
| Border source | White at 8% | Black at 6% | Borders need to contrast with their background |
| Inset highlight | White at 10% | White at 50% | Light mode highlights must be stronger to read |
| Shadow base | Blue-tinted black | Neutral gray | Dark shadows look blue-ish; light shadows look neutral |
| Sidebar opacity | 0.72 | 0.78 | Light sidebar needs more substance |

## Accessibility Considerations

- All text maintains **4.5:1 contrast ratio** minimum against glass backgrounds
- `prefers-reduced-motion` disables all animations including the glass shimmer
- Focus rings use the full-opacity primary blue with a visible ring offset
- Glass borders provide structural delineation beyond just the blur effect — important for users who may not perceive subtle transparency differences

## Files Modified

- `apps/desktop/src/index.css` — Complete color palette rewrite (dark + light), glass token system, 6 new glass utility classes
- `apps/desktop/src/components/layout/SideRail.tsx` — Updated to use `glass-sidebar` and `glass-nav-active` classes
- `apps/desktop/tailwind.config.js` — Added `glass` and `glass-hover` box shadows, `backdropBlur` extensions
