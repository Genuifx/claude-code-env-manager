# WeCom Bot Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Enterprise WeChat AI Bot long-connection support to the desktop app with multi-bot workspace bindings, role-aware task gating, and practical self-test hooks.

**Architecture:** Implement the WeCom bridge in the Tauri Rust backend as a sibling of Telegram and Weixin. Each enabled bot owns one worker thread and one WebSocket connection, routes conversations by bot/user/group scope, and attaches a streaming output channel to the existing headless runtime. The React Chat App gets a WeCom tab for multi-bot config and lifecycle control.

**Tech Stack:** Tauri 2, Rust, tungstenite WebSocket, serde JSON, existing HeadlessRuntimeManager, React 18, lucide-react, existing IPC/i18n patterns.

---

### Task 1: Research And Protocol Notes

**Files:**
- Create: `docs/research/wecom-ai-bot.md`

- [x] Record the protocol choice: BotId/Secret means WeCom AI Bot WebSocket, not group webhook.
- [x] Capture mainstream implementations and design takeaways.
- [x] Note limits: one active long connection per botId, ack/heartbeat, 5-second first reply, stream replacement semantics, image and quote payload support.

### Task 2: Backend Bridge

**Files:**
- Create: `apps/desktop/src-tauri/src/wecom/mod.rs`
- Create: `apps/desktop/src-tauri/src/wecom/channel.rs`
- Create: `apps/desktop/src-tauri/src/wecom/media.rs`
- Create: `apps/desktop/src-tauri/src/wecom/message.rs`
- Create: `apps/desktop/src-tauri/src/wecom/types.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`
- Modify: `apps/desktop/src-tauri/src/channel.rs`
- Modify: `apps/desktop/src-tauri/src/remote.rs`
- Modify: `apps/desktop/src-tauri/src/runtime.rs`
- Modify: `apps/desktop/src-tauri/Cargo.toml`

- [x] Add config structs for multiple bots, per-bot workspace, admin users, ordinary user allowlist, allowed intents, group mention policy, and runtime defaults.
- [x] Add WebSocket connect/auth/ping/reconnect loop using `aibot_subscribe`, `ping`, `aibot_msg_callback`, and `aibot_respond_msg`.
- [x] Add message normalization for text, image, mixed, and quote payloads.
- [x] Download/decrypt image attachments to the bound workspace before forwarding prompts.
- [x] Gate ordinary users to configured intents, while admin users can run arbitrary prompts.
- [x] Start/reuse headless sessions scoped by bot and conversation, with per-message stream placeholders and final output replacement.
- [x] Add IPC commands for settings/status/start/stop.

### Task 3: Desktop UI

**Files:**
- Create: `apps/desktop/src/components/chat-app/wecom/WecomPanel.tsx`
- Modify: `apps/desktop/src/pages/ChatApp.tsx`
- Modify: `apps/desktop/src/lib/tauri-ipc.ts`
- Modify: `apps/desktop/src/hooks/useTauriCommands.ts`
- Modify: `apps/desktop/src/lib/remote-platforms.ts`
- Modify: `apps/desktop/src/locales/zh.json`
- Modify: `apps/desktop/src/locales/en.json`

- [x] Add WeCom tab in Chat App.
- [x] Build multi-bot editor with secure secret input, workspace picker, role and intent controls, group/private behavior, and start/stop actions.
- [x] Keep all user-visible strings in i18n.

### Task 4: Tests And Verification

**Files:**
- Add targeted Rust unit tests in `wecom/mod.rs`
- Run: `pnpm --filter @ccem/core build`
- Run: `pnpm --filter @ccem/desktop test`
- Run: `pnpm --filter @ccem/desktop build`
- Run: `cd apps/desktop/src-tauri && cargo test`
- Run desktop self-test with `pnpm tauri dev` and Tauri MCP.

- [x] Verify role/intent gating.
- [x] Verify message extraction for text, mixed, image, and quote.
- [x] Verify media AES decrypt helper.
- [x] Verify multi-bot status aggregation.
- [x] Self-test with the supplied credentials via local config only, without committing secrets.
- [x] Run full `pnpm verify`.
