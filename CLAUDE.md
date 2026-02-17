# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code Environment Manager (ccem) — a monorepo containing a CLI tool and a Tauri desktop app for managing multiple API configurations for Claude Code. Supports switching between model providers (Anthropic, GLM, Kimi, MiniMax, DeepSeek) with encrypted API key storage, permission mode shortcuts, usage analytics, and skill management.

## Monorepo Structure

```
apps/cli/          # CLI tool (ccem) — commander + inquirer + ink
apps/desktop/      # Tauri 2.0 desktop app — React + Rust
packages/core/     # Shared logic — presets, types, encryption (used by both)
docs/plans/        # Design documents
```

Managed with pnpm workspaces (`pnpm-workspace.yaml`). Requires `pnpm@10.27.0` (locked via `packageManager` field in root `package.json`).

## Commands

```bash
# Monorepo-wide
pnpm run build          # Build all packages and apps
pnpm run dev            # Dev mode for all (parallel)
pnpm test               # Run all tests (vitest)

# Core package (must build before desktop dev)
pnpm --filter @ccem/core build

# CLI only
pnpm --filter @ccem/cli build
pnpm --filter @ccem/cli dev
pnpm --filter @ccem/cli test
pnpm --filter @ccem/cli test -- --run src/__tests__/usage.test.ts  # single test file

# Desktop app
cd apps/desktop && pnpm tauri dev    # Start Tauri dev (Vite + Rust cargo)
cd apps/desktop && pnpm tauri build  # Production build (dmg/app)
```

**Important**: The desktop app imports `@ccem/core/browser`. If you get "Failed to resolve import @ccem/core/browser", run `pnpm --filter @ccem/core build` first.

## Architecture

### Core Package (`@ccem/core`)

Two entry points — Node.js (`index.js`) and browser-safe (`browser.js`, no Node crypto):
- `ENV_PRESETS` / `PERMISSION_PRESETS` — built-in configurations
- Encryption utilities (AES-256-CBC, obfuscation-level)
- Shared TypeScript types
- Desktop app imports via `@ccem/core/browser`; CLI imports via `@ccem/core`

### CLI App (`apps/cli`)

ESM-based, built with tsup. Key libraries:
- **commander** — CLI command parsing
- **conf** — Persistent JSON config (OS config directory)
- **inquirer** — Interactive prompts
- **ink/react** — Terminal UI (SkillSelector tab component)

Config stored at `~/.ccem/config.json` (migrated from legacy `conf` path). API keys encrypted with AES-256-CBC before storage.

CLI detects TTY vs piped output (`process.stdout.isTTY`): TTY shows tables/colors, piped outputs raw export commands for `eval $(ccem env)`.

**CLI commands**:
- `ccem ls` / `use <name>` / `add <name>` / `del <name>` / `rename <old> <new>` / `cp <source> <target>` — environment CRUD
- `ccem env` — export current env vars (pipe-friendly)
- `ccem current` — show active environment
- `ccem run <command...>` — run a command with current env injected
- `ccem perms` / `default-mode` — permission mode management
- `ccem usage` — standalone usage stats (`--json` for machine output)
- `ccem setup init` / `setup migrate` (`--clean`, `--force`) / `setup cron` — setup & migration
- `ccem skill add [url]` / `skill ls` / `skill rm <name>` / `skill load <url>` — skill management
- `ccem launch` — hidden command used by desktop app (not in help)

### Desktop App (`apps/desktop`)

**Frontend** (React 18 + TypeScript):
- **Vite** dev server on port 1421 (path alias: `@` → `./src`)
- **Tailwind CSS** with CSS custom properties (HSL format) for theming — "Frosted Glass / macOS Sequoia" design system
- **Zustand** store (`src/store/index.ts`) — single store for environments, sessions, permissions, analytics, projects, cron tasks, plus per-domain loading flags (`isLoadingEnvs`, `isLoadingSessions`, `isLoadingStats`, `isLoadingSkills`, `isLoadingSettings`)
- **shadcn/ui pattern** — Radix UI primitives + `cva` (class-variance-authority) in `src/components/ui/`
- **Lucide React** — all icons (no emoji in UI)
- **Recharts** — token usage charts
- **sonner** — toast notifications
- Layout: AppShell pattern with `SideRail` (72px vertical nav) + `PageHeader` (48px sticky) + scrolling main content
- Pages: Dashboard, Sessions, Environments, Analytics, History, Skills, CronTasks, Settings

**Frontend data flow**: `App.tsx` → `useTauriCommands` hook → `invoke()` (Tauri IPC) → Rust backend. The hook maps Rust snake_case responses to TypeScript camelCase and updates the Zustand store. On window `focus`, the app re-syncs with the CLI config file to stay consistent when both are running.

**Tray events**: Backend emits `tray-launch-claude`, `navigate-to-settings`, `env-changed`, `perm-changed` — frontend listens via `useTauriEvents`.

**i18n**: `src/locales/index.tsx` provides `LocaleProvider` + `useLocale()` hook. Two JSON locale files (`zh.json`, `en.json`). Default language is Chinese (`zh`). Persisted in `localStorage` under key `ccem-locale`. All user-facing strings use `t('namespace.key')` — never hardcode Chinese or English in components.

**Custom Hooks** (`src/hooks/`):
- `useTauriCommands` — wraps all Tauri `invoke()` calls with snake_case→camelCase mapping
- `useTauriEvents` — Tauri event listeners for backend→frontend communication
- `useCountUp` — number count-up animation with requestAnimationFrame + decelerate easing
- `useKeyboardShortcuts` — registers keyboard shortcuts from a `Record<string, () => void>` map

**UI State Patterns**:
- **Skeleton loading**: Per-domain skeleton components in `src/components/ui/skeleton-states.tsx` (never spinners). Each page checks its own `isLoading*` flag from Zustand.
- **Empty states**: Shared `EmptyState` component (muted icon + text + optional action) in `src/components/ui/EmptyState.tsx`
- **Error states**: Shared `ErrorBanner` component (inline `bg-destructive/10` banner with retry, `role="alert"`)
- **FTUE**: localStorage flags (`ccem-ftue-launched`, `ccem-ftue-envs-added`, `ccem-ftue-analytics-seen`) drive amber dots and ghost cards for first-time users

**Keyboard Shortcuts**: Global shortcuts in `App.tsx` (Cmd+1–6 for tabs, Cmd+Enter/N for launch, Cmd+, for settings). Page-specific shortcuts added via `useKeyboardShortcuts` in individual pages.

**Backend** (Rust, `src-tauri/`):
- `main.rs` — Tauri command handlers (`#[tauri::command]` functions)
- `config.rs` — reads/writes CLI's `conf` JSON config directly (shared config with CLI)
- `crypto.rs` — AES-256-CBC matching CLI's encryption
- `session.rs` — session lifecycle management
- `analytics.rs` — parses Claude's JSONL logs from `~/.claude/projects/`, incremental caching in `~/.ccem/usage-cache.json`. Usage costs calculated via LiteLLM price data cached in `~/.ccem/model-prices.json`
- `history.rs` — reads `~/.claude/history.jsonl` for conversation list and per-project JSONL for messages; supports `/compact` segmentation boundaries
- `skills.rs` — skill search (streaming), install/uninstall from GitHub or presets
- `cron.rs` — scheduled task management with cron expressions, task runs, templates, and AI-generated task streaming
- `tray.rs` — system tray with environment/permission menus
- `terminal.rs` — terminal detection (iTerm2/Terminal.app), session arrange layouts
- Uses `tauri-plugin-shell` for launching Claude Code and `tauri-plugin-mcp-bridge` for MCP tool connectivity
- `window-vibrancy` + `tauri-plugin-decorum` — macOS native vibrancy and window decoration for glassmorphism
- Tauri window: 900×700 default, 880×640 minimum, `titleBarStyle: "Overlay"` + `transparent: true` for custom title bar

**Key Tauri commands** (invoked from frontend via `invoke()`):
- Environment CRUD: `get_environments`, `get_current_env`, `set_current_env`, `add_environment`, `update_environment`, `delete_environment`
- App config: `get_app_config`, `add_favorite`, `remove_favorite`, `add_recent`, `save_settings`
- Sessions: `launch_claude_code`, `list_sessions`, `stop_session`, `remove_session`, `focus_session`, `close_session`, `minimize_session`, `arrange_sessions`, `check_arrange_support`
- Analytics: `get_usage_stats`, `get_usage_history`, `get_continuous_usage_days`
- History: `get_conversation_history`, `get_conversation_messages`, `get_conversation_segments`
- Skills: `skills::search_skills_stream`, `skills::list_installed_skills`, `skills::install_skill`, `skills::uninstall_skill`
- Cron: `cron::list_cron_tasks`, `cron::add_cron_task`, `cron::update_cron_task`, `cron::delete_cron_task`, `cron::toggle_cron_task`, `cron::get_cron_task_runs`, `cron::retry_cron_task`, `cron::get_cron_run_detail`, `cron::list_cron_templates`, `cron::get_cron_next_runs`, `cron::generate_cron_task_stream`
- Terminal: `detect_terminals`, `get_preferred_terminal`, `set_preferred_terminal`
- IDE sync: `sync_vscode_projects`, `sync_jetbrains_projects`, `open_directory_dialog`
- Remote: `load_from_remote`, `check_ccem_installed`

### Environment Variables Managed

`ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_SMALL_FAST_MODEL`

### Permission Modes

| Mode | Description |
|------|-------------|
| yolo | Allow all operations without restrictions |
| dev | Standard development permissions, protect sensitive files |
| readonly | Read-only access, no modifications allowed |
| safe | Conservative permissions for unfamiliar codebases |
| ci | Permissions suitable for CI/CD pipelines |
| audit | Read and search only for security analysis |

## Design System (Desktop)

The desktop app uses a **Frosted Glass / macOS Sequoia** glassmorphism theme with CSS custom properties in `src/index.css`:
- Primary color: System Blue `hsl(211 100% 50%)` — cool blue spectrum
- Neutrals: cool gray-blue scale (`222` hue family)
- All colors defined as HSL in `:root` (dark mode default) and `.light` blocks, consumed via Tailwind config extensions
- Fonts: Inter (UI) + JetBrains Mono (code)
- `prefers-reduced-motion` media query disables all animations globally
- No ESLint/Prettier configs — the project doesn't enforce formatting via config files

### Glassmorphism Architecture (3 layers)

1. **Ambient layer** (`ambient-bg` in `AppLayout.tsx`): 4 colored gradient orbs (`position: fixed; inset: 0`) drifting behind all panels including the sidebar — `backdrop-filter: blur()` needs colorful content behind it to produce visible frosting
2. **Glass panels**: Sidebar, header, cards with heavy blur (44–56px) + high saturate (200–220%) + translucent backgrounds (opacity 0.42–0.48)
3. **Noise texture** (`glass-noise`): SVG fractal noise overlay with `mix-blend-mode: overlay` adds frosted grain

**Critical — light/dark ambient opacity**: Light mode needs ~2-3× higher `--ambient-opacity` than dark mode (0.35 vs 0.18) because white backgrounds wash out color. Panel `--glass-bg-opacity` must stay ≤0.48 or ambient colors can't bleed through the blur.

### Glass CSS Utility Classes

| Class | Use | Blur |
|-------|-----|------|
| `glass-sidebar` | SideRail (heaviest frost) | 56px / 220% |
| `glass-header` | PageHeader bar | 44px / 200% |
| `glass-card` | Content cards (hover lift) | 44px / 200% |
| `glass` | Generic glass panel | 44px / 200% |
| `glass-subtle` | Secondary surfaces | 16px / 170% |
| `frosted-panel` | Modals, overlays | 48px / 220% |
| `glass-noise` | Add to any glass element for grain texture | — |
| `stat-card` | Dashboard metric cards (specular highlight) | 44px / 200% |
| `glass-shimmer` | Ambient light sweep animation | — |

### Key Token Groups

- **Surfaces** (5-level hierarchy): `--surface-sunken` → `--surface` → `--surface-raised` → `--surface-overlay` → `--surface-peak`
- **Borders** (3-level): `--border-subtle` → `--border` → `--border-strong`
- **Shadows** (Tailwind): `shadow-elevation-1` through `shadow-elevation-4`, `shadow-glass`, `shadow-glass-hover`
- **Glass tokens**: `--glass-blur`, `--glass-saturate`, `--glass-bg-opacity`, `--glass-inset-opacity`, `--glass-noise-opacity`
- **Ambient orbs**: `--ambient-1` (blue), `--ambient-2` (purple), `--ambient-3` (teal), `--ambient-opacity`
- **Motion**: `--duration-instant` (80ms), `--duration-fast` (150ms), `--duration-base` (250ms), `--duration-slow` (400ms), `--duration-extended` (800ms)
- **Custom spacing/font**: `text-2xs` (0.625rem), `spacing-13` (3.25rem), `spacing-18` (4.5rem)

### UI Rules

- Use existing color tokens (`text-primary`, `bg-surface-raised`, etc.) — never hardcoded Tailwind colors like `text-emerald-600`
- Use Lucide icons, not emoji
- Use `t()` for all user-facing strings, not hardcoded text
- All glass surfaces should include `glass-noise` for the frosted grain texture
- New cards should use `glass-card glass-noise` (the base `Card` component already includes this)
- Glass borders must use `--glass-border-light` (white) — never gray Tailwind border classes like `border-sidebar-border`. In light mode, gray borders look flat; white borders at 45% opacity create the frosted edge effect
