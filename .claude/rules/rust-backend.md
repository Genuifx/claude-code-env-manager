---
paths:
  - "apps/desktop/src-tauri/**/*.rs"
---

# Rust Backend Rules

## Adding a new Tauri command

1. Define the `#[tauri::command]` function in `main.rs` or its dedicated module
2. Register it in the `.invoke_handler(tauri::generate_handler![...])` call in `main()`
3. All IPC return types must `derive(Serialize)`; input types must `derive(Deserialize)`
4. If the command needs managed state, take `State<'_, Arc<Manager>>` as a parameter

## Config compatibility

`config.rs` reads/writes `~/.ccem/config.json` — the same file the CLI uses via `conf`. Any schema changes must be backwards-compatible with the CLI.

## Crypto parity

`crypto.rs` must match the CLI's AES-256-CBC implementation in `packages/core/src/utils.ts`. If you change encryption, update both.

## Session types

Three session types exist — terminal-backed (`session.rs`), interactive/tmux (`interactive_runtime.rs`), headless (`runtime.rs`). The `unified_runtime.rs` facade unifies them. New session-related features should go through the unified layer.

## Module size

Files over 1000 lines are documented in `docs/file-size-exemptions.md`. If your changes push a file over this limit, split it or add an exemption with justification.
