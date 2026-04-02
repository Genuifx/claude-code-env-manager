---
allowed-tools: Read, Grep, Glob
description: Quick check of project health without building
---

Run a fast health check on the project:

1. `cd apps/desktop && pnpm exec tsc --noEmit 2>&1 | tail -20` — TypeScript errors
2. `cd apps/desktop/src-tauri && cargo check 2>&1 | tail -20` — Rust compilation errors
3. `pnpm check:i18n` — i18n key consistency
4. `bash scripts/check-file-size.sh` — file size violations
5. `git status` — uncommitted changes

Summarize any issues found.
