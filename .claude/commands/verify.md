Run the full CI verification gate locally.

Steps:
1. Run `pnpm -r test:run` (vitest for all packages)
2. Run `pnpm -r build` (build core, CLI, desktop frontend)
3. Run `cd apps/desktop/src-tauri && cargo test` (Rust tests)
4. Run `pnpm check:i18n` (locale key consistency)
5. Run `bash scripts/check-file-size.sh` (1000-line gate)
6. Run `cd apps/desktop && pnpm exec tsc --noEmit` (TypeScript type check)

Report any failures with the specific error output.
