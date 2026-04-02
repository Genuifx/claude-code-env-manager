# CLAUDE.md

Claude Code Environment Manager (ccem) — monorepo for CLI + Tauri desktop app, managing multiple API configurations for Claude Code.

## Quick Start

```bash
pnpm install                        # Install all dependencies
pnpm --filter @ccem/core build      # Must build core first (desktop depends on it)
pnpm run build                      # Build everything
pnpm run dev                        # Dev mode for all (parallel)
pnpm test                           # Run all tests (vitest)
pnpm verify                         # Full CI gate: test + build + cargo test
```

```bash
# Desktop app
cd apps/desktop && pnpm tauri dev   # Vite + Rust cargo dev
cd apps/desktop && pnpm tauri build # Production build (dmg/app)

# CLI only
pnpm --filter @ccem/cli build
pnpm --filter @ccem/cli test
pnpm --filter @ccem/cli test -- --run src/__tests__/usage.test.ts  # single test
```

## Monorepo Structure

```
packages/core/     @ccem/core — shared types, presets, encryption
                   Two entry points: index.js (Node) and browser.js (no Node crypto)
apps/cli/          ccem CLI — commander + inquirer + ink
apps/desktop/      Tauri 2.0 desktop app
  src/             React 18 frontend (Vite, Tailwind, Zustand, shadcn/ui)
  src-tauri/src/   Rust backend (26 modules, 90+ Tauri commands)
docs/plans/        Design documents (25 dated specs)
docs/architecture/ Detailed reference docs (see below)
```

## Architecture Reference (read on demand)

- **[Desktop Backend](docs/architecture/desktop-backend.md)** — Rust module map, 8 managed state managers, 3 session types, all IPC commands
- **[Desktop Frontend](docs/architecture/desktop-frontend.md)** — React pages, Zustand store, IPC bridge, startup data flow, component organization
- **[Design System](docs/architecture/design-system.md)** — Glassmorphism theme, CSS tokens, glass utility classes, UI rules

## Key Constraints

- Desktop imports `@ccem/core/browser` — if import fails, run `pnpm --filter @ccem/core build`
- Config stored at `~/.ccem/config.json`, shared between CLI and desktop
- API keys encrypted with AES-256-CBC before storage
- i18n: default language is Chinese (`zh`), all strings via `t('namespace.key')`
- Icons: Lucide React only, no emoji
- No ESLint/Prettier — no formatting enforcement via config files
- File size gate: 1000-line max per new file (exemptions in `docs/file-size-exemptions.md`)

## Environment Variables Managed

`ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_SMALL_FAST_MODEL`

## Permission Modes

yolo (unrestricted) / dev (standard) / readonly / safe (conservative) / ci / audit (read-only analysis)
