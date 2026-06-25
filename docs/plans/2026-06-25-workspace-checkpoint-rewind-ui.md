# Workspace Checkpoint Rewind UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a restrained Workspace UI that lets users restore Claude native-session file edits to known checkpoints.

**Architecture:** Treat checkpointing as an extension of the existing native runtime pipeline, not a separate session system. The native helper captures Claude SDK checkpoint UUIDs, Rust persists and replays them as native session state, and Workspace renders a restore-point menu that calls a narrow rewind IPC command.

**Tech Stack:** Tauri 2 Rust backend, React 18 frontend, `@anthropic-ai/claude-agent-sdk`, existing native runtime helper, existing Workspace event replay, existing `get_workspace_git_snapshot` / diff refresh path.

---

## 0. Execution Contract

Implement this plan with the repo's lightweight development flow:

1. Create an isolated worktree from `main`; do not implement directly in a dirty `main` checkout.
2. Keep the first implementation Claude-only and Workspace-only.
3. Commit locally with a Conventional Commit message after verification; do not push unless explicitly requested.
4. If UI is changed, capture at least one screenshot of the restore-point UI in the running app.
5. Verification must exercise the real Workspace path with a Claude native session and a disposable file; source inspection, handler-name assertions, or static screenshots are not enough.

## 1. Product Decision

First release scope is **file checkpoint/rewind for Claude native Workspace sessions only**.

This must not be described as full session time travel. Official Claude Code checkpointing only tracks file modifications made through `Write`, `Edit`, and `NotebookEdit`; it does not track Bash-created changes, directory operations, network files, or arbitrary git state. `rewindFiles()` restores files on disk and does not rewind the conversation context.

Conversation rewind via SDK `rewind_conversation` is a later phase after the Agent SDK 0.3 compatibility spike proves that the native helper can consume the newer control API without regressing the Workspace primary path.

## 2. Source Map

- Official checkpointing docs: https://code.claude.com/docs/en/agent-sdk/file-checkpointing
- Agent SDK changelog, including `0.3.186` `rewind_conversation`: https://raw.githubusercontent.com/anthropics/claude-agent-sdk-typescript/main/CHANGELOG.md
- Claude Code changelog, including `/rewind` and background-agent related fixes: https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md

## 3. Current CCEM Baseline

| Area | Existing support | Evidence |
| --- | --- | --- |
| Native helper SDK host | Uses Claude SDK `query()` with `persistSession`, hooks, `canUseTool`, partial messages, and session metadata | `packages/native-runtime-helper/src/index.ts` |
| Provider resume anchor | Captures and stores `provider_session_id` from helper `session_meta` | `apps/desktop/src-tauri/src/native_runtime.rs` |
| Workspace live restore | Restores active native sessions from persisted runtime IDs | `apps/desktop/src/pages/Workspace.tsx` |
| Event replay | Native sessions already expose replayable events via `get_native_session_events` | `apps/desktop/src/lib/tauri-ipc.ts` |
| Workspace file proof | Workspace already has git snapshot and file diff IPCs | `apps/desktop/src/lib/tauri-ipc.ts` |

## 4. Non-Goals

1. Do not support Codex or OpenCode in this feature.
2. Do not use `git reset`, `git checkout`, `git clean`, `stash`, or any repo-level destructive command.
3. Do not claim Bash changes are recoverable.
4. Do not add a new top-level navigation surface.
5. Do not implement conversation rewind in the first release.
6. Do not expose raw checkpoint UUIDs as the primary UI label.

## 5. UX Contract

User behavior:

1. User starts a Claude native Workspace session.
2. User asks Claude to edit files.
3. Workspace records restore points at user-turn boundaries when checkpoint UUIDs are available.
4. User opens a restore-point menu from the live session header or review drawer.
5. User picks a checkpoint and confirms the restore.
6. CCEM restores tracked file edits and refreshes the visible git snapshot/diff.

Must happen:

1. Restore points only appear for Claude native sessions with checkpoint support active.
2. Restore confirmation clearly says it restores Claude tool edits only.
3. Successful rewind emits a visible session event and refreshes file/diff state.
4. Failed rewind reports the SDK error without changing CCEM session state to success.

Must not happen:

1. No destructive git commands run.
2. No Bash-generated file changes are promised as covered.
3. No checkpoint controls appear for Codex/OpenCode.
4. No restore action is available while a blocking permission prompt or interactive prompt is pending.

## 6. Data Model

Add a small checkpoint summary model. Keep it separate from transcript messages.

```ts
export interface NativeFileCheckpoint {
  checkpointId: string;
  providerSessionId: string | null;
  runtimeId: string;
  createdAt: string;
  turnIndex: number;
  promptSummary: string | null;
  status: 'available' | 'rewound' | 'failed';
  source: 'claude-file-checkpoint';
}
```

Rust equivalent should use snake_case serialization internally and camelCase over IPC, matching existing native session types.

## 7. File Structure

### Native Helper

- Modify `packages/native-runtime-helper/package.json`
  - Upgrade `@anthropic-ai/claude-agent-sdk` during the compatibility spike.
- Modify `packages/native-runtime-helper/src/index.ts`
  - Enable file checkpointing for Claude sessions.
  - Capture user-message checkpoint UUIDs.
  - Emit `checkpoint_created` events.
  - Accept `rewind_files` helper input command.
- Add or modify helper tests under `packages/native-runtime-helper/test/`
  - Cover checkpoint event extraction and rewind command serialization where practical.

### Tauri Backend

- Modify `apps/desktop/src-tauri/src/native_runtime.rs`
  - Extend helper command enum.
  - Persist checkpoint summaries in native session state.
  - Expose `rewind_files` operation.
  - Emit replayable `files_rewound` and `file_rewind_failed` events.
- Modify `apps/desktop/src-tauri/src/main.rs`
  - Add `rewind_native_session_files` command.
  - Register command in the Tauri invoke handler.
- Modify `apps/desktop/src-tauri/src/event_bus.rs` only if the current event payload enum cannot carry checkpoint metadata cleanly.

### Frontend IPC and State

- Modify `apps/desktop/src/lib/tauri-ipc.ts`
  - Add `NativeFileCheckpoint`.
  - Add `rewind_native_session_files` command type.
  - Add checkpoint event payload types if missing.
- Modify `apps/desktop/src/hooks/useTauriCommands.ts`
  - Add `rewindNativeSessionFiles(runtimeId, checkpointId)`.
- Modify `apps/desktop/src/components/workspace/workspaceNativeAttention.ts`
  - Ensure restore is disabled when permission or interactive prompts are pending.

### Workspace UI

- Modify `apps/desktop/src/components/workspace/WorkspaceNativeSessionView.tsx`
  - Derive checkpoint list from native events.
  - Add restore-point menu or popover.
  - Add confirmation dialog.
  - Refresh git snapshot after successful rewind.
- Modify `apps/desktop/src/locales/zh.json`
  - Add Chinese UI strings.
- Modify `apps/desktop/src/locales/en.json`
  - Add English UI strings.

## 8. Implementation Tasks

### Task 0: Agent SDK 0.3 Compatibility Spike

**Files:**

- Modify: `packages/native-runtime-helper/package.json`
- Modify: `pnpm-lock.yaml`
- Test: existing native helper tests and Workspace native smoke

- [ ] Upgrade only `@anthropic-ai/claude-agent-sdk` to a current `0.3.x` release.
- [ ] Run `pnpm --filter @ccem/native-runtime-helper test`.
- [ ] Run `pnpm --filter @ccem/native-runtime-helper build`.
- [ ] Run one Claude native Workspace smoke before adding checkpoint behavior.

Expected result: existing Claude native session can start, send a prompt, receive a response, emit token usage, and handle permission prompts.

STOP condition: if the SDK upgrade changes `query()` event shapes enough to break existing Workspace session behavior, stop and create a separate compatibility fix before checkpoint UI work.

### Task 1: Capture Checkpoint UUIDs in Helper

**Files:**

- Modify: `packages/native-runtime-helper/src/index.ts`
- Test: `packages/native-runtime-helper/test/checkpoint-events.test.mjs`

- [ ] Enable checkpoint options for Claude `query()` only:
  - `enableFileCheckpointing: true`
  - `extraArgs: { 'replay-user-messages': null }`
- [ ] Detect streamed user messages that include a checkpoint UUID.
- [ ] Emit a helper event:

```json
{
  "type": "event",
  "payload": {
    "type": "checkpoint_created",
    "checkpoint_id": "uuid",
    "provider": "claude",
    "provider_session_id": "session-id-or-null",
    "prompt_summary": "truncated user prompt",
    "source": "claude-file-checkpoint"
  }
}
```

- [ ] Add a focused unit test for extracting checkpoint payloads from representative SDK user-message objects.

Expected result: no UI change yet; native events contain checkpoint metadata when SDK provides user-message UUIDs.

### Task 2: Add Helper Rewind Command

**Files:**

- Modify: `packages/native-runtime-helper/src/index.ts`
- Test: `packages/native-runtime-helper/test/rewind-command.test.mjs`

- [ ] Add input command type:

```json
{
  "type": "rewind_files",
  "checkpoint_id": "uuid"
}
```

- [ ] When Claude query is active, call SDK `rewindFiles(checkpointId)`.
- [ ] When no active query can accept rewind, return a structured error event instead of silently succeeding.
- [ ] Emit success event:

```json
{
  "type": "event",
  "payload": {
    "type": "files_rewound",
    "checkpoint_id": "uuid"
  }
}
```

- [ ] Emit failure event:

```json
{
  "type": "event",
  "payload": {
    "type": "file_rewind_failed",
    "checkpoint_id": "uuid",
    "error": "message"
  }
}
```

Expected result: Rust can send a narrow rewind command to the helper and observe success/failure through the existing event pipe.

STOP condition: if the SDK requires resuming a completed session with an empty prompt before `rewindFiles()`, implement that as an explicit helper path and keep the UI waiting state visible.

### Task 3: Persist and Replay Native Checkpoints

**Files:**

- Modify: `apps/desktop/src-tauri/src/native_runtime.rs`
- Test: native runtime Rust unit tests in the same file or a focused module if split later

- [ ] Add `NativeFileCheckpoint` Rust struct.
- [ ] Add checkpoint storage to native session record or session-side state.
- [ ] On `checkpoint_created`, upsert checkpoint by `checkpoint_id`.
- [ ] On `files_rewound`, mark matching checkpoint `rewound`.
- [ ] On `file_rewind_failed`, preserve checkpoint and emit failure event.
- [ ] Ensure `list_native_sessions` stays compatible for existing callers.

Expected result: replaying events after app refresh still gives Workspace enough checkpoint data to render restore points.

### Task 4: Add Tauri IPC Command

**Files:**

- Modify: `apps/desktop/src-tauri/src/native_runtime.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`
- Modify: `apps/desktop/src/lib/tauri-ipc.ts`
- Modify: `apps/desktop/src/hooks/useTauriCommands.ts`

- [ ] Add backend method:

```rust
pub fn rewind_files(
    self: &Arc<Self>,
    app: &AppHandle,
    runtime_id: &str,
    checkpoint_id: &str,
) -> Result<(), String>
```

- [ ] Add Tauri command `rewind_native_session_files`.
- [ ] Add TypeScript command typing:

```ts
rewind_native_session_files: [
  { runtimeId: string; checkpointId: string },
  void
];
```

- [ ] Add hook wrapper `rewindNativeSessionFiles`.

Expected result: frontend can call rewind through the same IPC style as `respond_native_session_permission`.

### Task 5: Workspace Restore-Point UI

**Files:**

- Modify: `apps/desktop/src/components/workspace/WorkspaceNativeSessionView.tsx`
- Modify: `apps/desktop/src/components/workspace/workspaceNativeAttention.ts`
- Modify: `apps/desktop/src/locales/zh.json`
- Modify: `apps/desktop/src/locales/en.json`

- [ ] Derive `checkpoints` from native session events.
- [ ] Render a compact restore-point button only when:
  - provider is `claude`
  - at least one available checkpoint exists
  - session is not terminal
  - no hard blocking attention is pending
- [ ] Use a popover or dropdown, not a full page panel.
- [ ] Each menu item shows:
  - relative time
  - prompt summary
  - status badge if already rewound
- [ ] Confirmation copy must include:
  - tracked Claude file edits will be restored
  - Bash changes and conversation context are not rewound
- [ ] On success, call `refreshGitSnapshot()` and show a toast.
- [ ] On failure, show a toast with a concise error.

Expected result: user can identify a restore point, confirm the limitation, and restore tracked file edits without leaving Workspace.

### Task 6: Verification

**Files:**

- Add or modify tests only where practical:
  - `packages/native-runtime-helper/test/*.test.mjs`
  - Rust unit tests in `apps/desktop/src-tauri/src/native_runtime.rs`
  - Frontend tests if this repo has a stable existing surface for Workspace components

- [ ] Run `pnpm --filter @ccem/native-runtime-helper test`.
- [ ] Run `pnpm --filter @ccem/native-runtime-helper build`.
- [ ] Run `pnpm --filter @ccem/desktop build`.
- [ ] Run `cd apps/desktop/src-tauri && cargo test native_runtime`.
- [ ] Run a real app smoke with `cd apps/desktop && pnpm tauri dev`.
- [ ] Use Tauri MCP or the strongest available UI automation to verify:
  1. Create a temporary file in a disposable directory.
  2. Start Claude native Workspace session in that directory.
  3. Ask Claude to edit the file with a normal tool edit.
  4. Confirm restore point appears.
  5. Trigger restore.
  6. Confirm file content returns to pre-edit state.
  7. Confirm git snapshot/diff refreshes.
  8. Confirm the UI does not claim Bash writes are covered.

Expected result: behavior proof covers the real user workflow, not just code shape.

## 9. UI Copy Draft

Chinese:

- Button: `恢复点`
- Empty: `当前会话还没有可恢复的文件检查点。`
- Confirm title: `恢复到这个文件检查点？`
- Confirm body: `这会恢复 Claude 通过文件编辑工具产生的改动。Bash 命令造成的文件变化、目录变化和对话上下文不会回退。`
- Success: `已恢复到文件检查点`
- Failure: `恢复失败：{error}`

English:

- Button: `Restore points`
- Empty: `This session does not have file restore points yet.`
- Confirm title: `Restore to this file checkpoint?`
- Confirm body: `This restores file changes made through Claude editing tools. Bash changes, directory changes, and conversation context are not rewound.`
- Success: `Restored to file checkpoint`
- Failure: `Restore failed: {error}`

## 10. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| SDK 0.3 breaks existing native session behavior | Gate all UI work behind Task 0 compatibility smoke |
| Checkpoint UUIDs missing | Ensure `extraArgs: { 'replay-user-messages': null }`; hide UI when unavailable |
| User expects git-level rollback | Confirmation copy states exact boundary |
| Bash writes are not restored | Do not mention “all changes”; call it “Claude file edits” |
| Completed sessions need resume before rewind | Implement explicit helper resume path if SDK requires it |
| Restore during permission prompt corrupts flow | Disable restore while hard blocking attention exists |

## 11. Release Notes Draft

`Workspace now shows Claude native-session file restore points when SDK checkpointing is available. Restore points can rewind file edits made through Claude editing tools; shell-created changes and conversation history are not rewound.`

## 12. Rollout Gate

This feature is ready for implementation only after:

1. Agent SDK 0.3 compatibility spike passes.
2. Existing Claude native Workspace prompt/permission/token usage smoke still passes.
3. The product copy is accepted as “file restore” rather than “full rewind”.

If any of those fail, keep the plan in `observe` state and do not ship UI.
