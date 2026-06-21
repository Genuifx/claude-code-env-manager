# CCEM Session Bot Binding Research + POC

## Goal

Let a CCEM-launched session, whether started from Workspace, CLI, or Terminal, bind itself to a bot target such as WeCom or Weixin through a CCEM skill. Binding should immediately send a task card, keep streaming execution progress, and allow the user to quote that task from the bot side to send follow-up instructions back into the same session.

## External Research

### Claude Code Channels

Claude Code Channels are an official research-preview path for pushing external events into an already-running Claude Code session. The official docs say Channels require Claude Code v2.1.80+, Anthropic authentication through claude.ai or a Console API key, and are not available on Bedrock, Vertex, or Foundry. Team and Enterprise orgs must explicitly enable the feature. Source: https://code.claude.com/docs/en/channels

The official model is MCP-server based: the channel server declares channel capabilities, emits `notifications/claude/channel`, and can expose a reply tool. During the preview, channel plugins are constrained by allowlists unless development channels are explicitly enabled. Source: https://code.claude.com/docs/en/channels-reference

Important boundary: Remote Control is different from Channels. Remote Control requires claude.ai subscription login and does not support API keys, while Channels can work with claude.ai or Console API key authentication. Sources:

- https://code.claude.com/docs/en/authentication
- https://code.claude.com/docs/en/remote-control

Implication for CCEM: relying only on `claude --channels` would not cover every CCEM runtime surface cleanly, would inherit research-preview allowlist/admin constraints, and would not give CCEM a unified task-card/binding registry. CCEM should own the binding layer and optionally use official Channels as one transport later.

### WeCom AI Bot

The WeCom AI Bot Node SDK describes a WebSocket long-connection model at `wss://openws.work.weixin.qq.com`, authenticated with `botId + secret`. It supports message dispatch, streaming replies, template cards, card updates, media upload, and proactive `sendMessage(chatid, body)` without a callback frame. Source: https://github.com/WecomTeam/aibot-node-sdk

Implication for CCEM: WeCom is capable of the desired task-card and follow-up model. The production adapter should map CCEM task frames to WeCom template cards/markdown, and map quoted card replies or inbound chat messages back to a bound runtime.

### Weixin

The existing CCEM Weixin bridge already has an outbound channel implementation that sends text back to a peer and can route inbound private chat messages into headless sessions. This is close to the desired flow, but it is currently bridge-owned rather than session-self-bound.

## Current CCEM Architecture

Relevant existing surfaces:

- `apps/desktop/src-tauri/src/channel.rs` defines `OutputChannel` and `ChannelKind`.
- `apps/desktop/src-tauri/src/event_dispatcher.rs` attaches channels per runtime and dispatches both structured session events and interactive terminal output.
- `apps/desktop/src-tauri/src/unified_runtime.rs` wraps headless and interactive runtimes behind one `UnifiedSessionManager`.
- `apps/desktop/src-tauri/src/native_runtime.rs` owns Workspace/native SDK sessions, including persisted event replay and user-message routing.
- `apps/desktop/src-tauri/src/wecom/channel.rs` and `apps/desktop/src-tauri/src/weixin/channel.rs` are bridge-specific output channels.
- `apps/cli/src/index.ts` already installs CCEM-owned Claude skills such as `ccem-cron`.

The key missing primitive was not "a way to send messages"; it was "a runtime-scoped binding record that can be initiated from inside the session and then observed by CCEM."

## Implemented Design

The implementation adds a CCEM-owned bot-binding layer:

1. CCEM injects `CCEM_RUNTIME_ID` and `CCEM_SESSION_ID` into sessions it launches.
2. A Claude Code skill runs `ccem bot-bind --platform ... --peer-id ...`.
3. The CLI writes a request to `~/.ccem/bot-bind-requests.jsonl`.
4. CCEM Desktop watches the request file and binds the matching session.
   - Headless and Terminal sessions attach a `BotBindingChannel` through `UnifiedSessionManager`.
   - Workspace/native SDK sessions start a replay relay over `NativeRuntimeManager::replay_events`.
5. The binding persists to `~/.ccem/session-bot-bindings.json` so quoted task cards remain routable across Desktop restarts.
6. If the target is WeCom and task-card sending is enabled, Desktop sends a markdown task card through the active WeCom AI Bot WebSocket connection.
7. Subsequent session events and terminal output become binding outbox frames.
8. WeCom inbound routing can match quoted task ids, correlation markers, or delivered message ids and send follow-up text back into the same runtime.

The outbox remains as a local inspection surface and future transport buffer. The WeCom path now performs real proactive markdown delivery through `aibot_send_msg`; the implementation mirrors the official SDK shape by sending a request id and waiting for the WebSocket ack.

## Security Model

Production must treat bot binding as remote control:

- A bot adapter must maintain an allowlist of sender ids.
- A binding request should only target configured bot accounts or known peers.
- Quoted task ids must map to existing bindings before routing commands.
- Permission prompts should be relayed as explicit approve/deny frames, not hidden in normal chat text.
- WeCom/Weixin credentials stay in the existing bridge settings layer, not in skill files.

## Remaining Hardening

The remaining production increments should be:

1. Promote task cards from markdown to WeCom template cards when the API surface is stable enough for card update workflows.
2. Implement Weixin transport using the existing `send_text_message` pattern and add a lightweight task-card markdown fallback.
3. Stream selected outbox frames back to WeCom for long-running native sessions instead of only recording them locally.
4. Add explicit approve/deny reply affordances for `PermissionRequired` and `TerminalPromptRequired`.
5. Add multi-target UI selection when more than one WeCom bot has a task-binding default.
6. Verify real client quote payloads from WeCom across private and group chats; local route extraction and proactive delivery are covered, but client quote metadata can vary.

## Acceptance

The implementation is sufficient when:

- A CCEM-launched session has `CCEM_RUNTIME_ID`.
- `ccem bot-bind` queues a request without needing the user to copy a runtime id and requires `--bot-id` for WeCom.
- Desktop can consume that request, bind headless, Terminal, or Workspace/native sessions, and attempt WeCom task-card delivery.
- Binding creates a task-card frame and persists route metadata.
- Assistant/tool/terminal events become outbox frames.
- A quoted inbound command routes back to the same session.
