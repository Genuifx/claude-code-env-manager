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

Managed with pnpm workspaces (`pnpm-workspace.yaml`).

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

Config stored via `conf` package with project name `claude-code-env-manager`. API keys encrypted with AES-256-CBC before storage. Config migrated to `~/.ccem/` path.

CLI detects TTY vs piped output (`process.stdout.isTTY`): TTY shows tables/colors, piped outputs raw export commands for `eval $(ccem env)`.

### Desktop App (`apps/desktop`)

**Frontend** (React 18 + TypeScript):
- **Vite** dev server on port 1420
- **Tailwind CSS** with CSS custom properties (HSL format) for theming — "Volcanic Amber" design system
- **Zustand** store (`src/store/index.ts`) — single store for environments, sessions, permissions, analytics, projects, plus per-domain loading flags (`isLoadingEnvs`, `isLoadingSessions`, `isLoadingStats`, `isLoadingSkills`, `isLoadingSettings`)
- **shadcn/ui pattern** — Radix UI primitives + `cva` (class-variance-authority) in `src/components/ui/`
- **Lucide React** — all icons (no emoji in UI)
- **Recharts** — token usage charts
- **sonner** — toast notifications
- Layout: AppShell pattern with `SideRail` (64px vertical nav) + `PageHeader` (48px sticky) + scrolling main content
- Pages: Dashboard, Sessions, Environments, Analytics, Skills, Settings

**Frontend data flow**: `App.tsx` → `useTauriCommands` hook → `invoke()` (Tauri IPC) → Rust backend. The hook maps Rust snake_case responses to TypeScript camelCase and updates the Zustand store.

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
- `analytics.rs` — parses Claude's JSONL logs from `~/.claude/projects/`, incremental caching in `~/.ccem/usage-cache.json`
- `tray.rs` — system tray with environment/permission menus
- `terminal.rs` — terminal detection (iTerm2/Terminal.app)
- Uses `tauri-plugin-shell` for launching Claude Code and `tauri-plugin-mcp-bridge` for MCP tool connectivity

**Key Tauri commands** (invoked from frontend via `invoke()`):
`get_environments`, `set_current_env`, `add_environment`, `delete_environment`, `launch_claude_code`, `get_sessions`, `get_usage_stats`, `get_continuous_usage_days`, `get_app_config`, `save_settings`

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

The desktop app uses a custom "Volcanic Amber" theme with CSS custom properties in `src/index.css`:
- Primary color: `#E5922E` (amber)
- Neutrals: warm brown-gray scale
- Semantic tokens: `--surface-raised`, `--surface-overlay`, `--sidebar-*`, `--chart-1` through `--chart-5`
- Motion tokens: `--duration-instant` (80ms) through `--duration-extended` (800ms)
- Fonts: Inter (UI) + JetBrains Mono (code) via Google Fonts
- All colors defined as HSL in `:root` and `.dark` blocks, consumed via Tailwind config extensions
- `prefers-reduced-motion` media query disables all animations globally

When adding new UI components, use the existing color tokens (`text-primary`, `bg-surface-raised`, etc.) rather than hardcoded Tailwind colors like `text-emerald-600`. Use Lucide icons, not emoji. Use `t()` for all strings, not hardcoded text.
