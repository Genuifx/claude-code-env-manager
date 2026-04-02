---
allowed-tools: Read, Grep, Glob, Edit, Write
description: Guided checklist for adding a new Tauri IPC command end-to-end
---

Add a new Tauri command: `$ARGUMENTS`

Follow this checklist:

## 1. Rust Backend
- [ ] Define the `#[tauri::command]` function in `apps/desktop/src-tauri/src/main.rs` or its dedicated module
- [ ] Add appropriate input/output types with `Serialize`/`Deserialize`
- [ ] Register the command in `.invoke_handler(tauri::generate_handler![...])` in `main()`
- [ ] If it needs managed state, add `State<'_, Arc<Manager>>` parameter

## 2. TypeScript Types
- [ ] Add request/response types to `apps/desktop/src/lib/tauri-ipc.ts`

## 3. IPC Bridge
- [ ] Add the invoke wrapper function in `apps/desktop/src/hooks/useTauriCommands.ts`
- [ ] Map snake_case response fields to camelCase
- [ ] Update Zustand store if the command affects app state

## 4. Frontend
- [ ] Call the new function from the appropriate page/component
- [ ] Add i18n keys to both `src/locales/zh.json` and `src/locales/en.json`

## 5. Verify
- [ ] Run `cd apps/desktop && pnpm exec tsc --noEmit` (type check)
- [ ] Run `cd apps/desktop/src-tauri && cargo check` (Rust check)
