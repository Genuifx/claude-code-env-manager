# Desktop Pet Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在桌面端增加一个可通过设置开关控制的常驻置顶猫咪悬浮窗，旁边最多堆叠 5 条会话气泡，运行中和未读结束会话会实时按更新时间排在前面。

**Architecture:** 使用独立 Tauri `desktop-pet` webview window 承载透明悬浮层，主窗口仍运行现有 React 应用。宠物窗口前端从已有 `list_native_sessions` 命令读取会话，纯函数负责筛选、排序和最多 5 条限制；Rust 只负责窗口生命周期、已读状态持久化、点击气泡后聚焦主窗口并通知主窗口打开对应会话。

**Tech Stack:** Tauri 2、Rust、React 18、TypeScript、Tailwind、Lucide React、Node `node:test`、Cargo test。

---

## Spec 对应关系

- 设置开关控制：Task 2、Task 7。
- 独立置顶桌面猫咪窗口：Task 3、Task 6。
- 猫咪视觉使用已确认的金渐层简单图片：Task 1、Task 6。
- 气泡堆叠流、最多 5 条、实时最新排前：Task 4、Task 5、Task 6。
- 包含运行中、已结束但未打开、失败/中断、需要处理的会话：Task 4、Task 5。
- 已结束/失败/中断会话点击后从宠物侧消失，运行中会话保留：Task 4、Task 6。
- 点击气泡打开主窗口对应会话：Task 4、Task 8。
- 中文设置文案：Task 7。

## File Structure

- Create `apps/desktop/src/assets/pet/golden-cat.png`
  - 追踪进仓库的透明猫咪图片。来源是主仓库 `.artifacts/ccem-pet-cat-selected-transparent.png`。
- Create `apps/desktop/src/types/pet.ts`
  - 前端宠物通知类型、打开会话 payload 类型。
- Create `apps/desktop/src/lib/petNotifications.ts`
  - 从 `NativeSessionSummary[]` 生成宠物气泡列表的纯函数；负责筛选、排序、最多 5 条限制和已读过滤。
- Create `apps/desktop/test/pet-notifications.test.mjs`
  - Node 测试，转译并验证 `petNotifications.ts` 的核心规则。
- Create `apps/desktop/src/pages/PetOverlay.tsx`
  - 宠物悬浮窗 React 入口；轮询会话、监听事件、渲染猫咪和气泡、处理点击。
- Create `apps/desktop/src/components/pet-overlay/PetBubble.tsx`
  - 单条气泡展示组件，保持文字截断、状态点、点击区域。
- Create `apps/desktop/src-tauri/src/pet_window.rs`
  - 创建、显示、隐藏、定位 `desktop-pet` 窗口。
- Create `apps/desktop/src-tauri/src/pet_notifications.rs`
  - 已读状态读写、点击气泡后的主窗口聚焦和事件转发。
- Modify `apps/desktop/src-tauri/src/config.rs`
  - `DesktopSettings` 增加 `desktopPetEnabled`，默认 `false`。
- Modify `apps/desktop/src-tauri/src/main.rs`
  - 注册新模块和命令；启动时按设置同步宠物窗口；保存设置时同步显示/隐藏。
- Modify `apps/desktop/src/lib/tauri-ipc.ts`
  - 增加宠物 IPC 类型、设置字段、命令映射。
- Modify `apps/desktop/src/main.tsx`
  - 按当前 Tauri window label 分流：主窗口渲染 `App`，宠物窗口渲染 `PetOverlay`。
- Modify `apps/desktop/src/App.tsx`
  - 监听 `pet-open-session`，切到 Workspace，并把待打开会话传给 Workspace。
- Modify `apps/desktop/src/pages/Workspace.tsx`
  - 支持 `petOpenRequest`，收到后选中对应 live/history 会话。
- Modify `apps/desktop/src/pages/Settings.tsx`
  - 加载、保存和展示“桌面猫咪”开关。
- Modify `apps/desktop/src/locales/zh.json`
  - 增加中文设置文案。
- Modify `apps/desktop/src/locales/en.json`
  - 增加英文设置文案。

## Implementation Tasks

### Task 1: Add Tracked Cat Asset

**Files:**
- Create: `apps/desktop/src/assets/pet/golden-cat.png`

- [ ] **Step 1: Copy the approved transparent asset**

Run:

```bash
mkdir -p apps/desktop/src/assets/pet
cp /Users/zkyo/Desktop/projects/claude-code-env-manager/.artifacts/ccem-pet-cat-selected-transparent.png apps/desktop/src/assets/pet/golden-cat.png
```

Expected:

```text
apps/desktop/src/assets/pet/golden-cat.png exists
```

- [ ] **Step 2: Verify PNG metadata**

Run:

```bash
file apps/desktop/src/assets/pet/golden-cat.png
```

Expected includes:

```text
PNG image data
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/assets/pet/golden-cat.png
git commit -m "feat(desktop): add desktop pet cat asset"
```

### Task 2: Persist Desktop Pet Setting

**Files:**
- Modify: `apps/desktop/src-tauri/src/config.rs`
- Modify: `apps/desktop/src/lib/tauri-ipc.ts`

- [ ] **Step 1: Write Rust settings tests**

Append this test module near the end of `apps/desktop/src-tauri/src/config.rs`:

```rust
#[cfg(test)]
mod desktop_pet_settings_tests {
    use super::DesktopSettings;

    #[test]
    fn desktop_pet_setting_defaults_to_disabled() {
        let settings = DesktopSettings::default();
        assert!(!settings.desktop_pet_enabled);
    }

    #[test]
    fn desktop_pet_setting_uses_camel_case_json_key() {
        let settings = DesktopSettings {
            desktop_pet_enabled: true,
            ..DesktopSettings::default()
        };

        let serialized = serde_json::to_value(&settings).expect("settings serialize");
        assert_eq!(serialized["desktopPetEnabled"], true);
    }

    #[test]
    fn desktop_pet_setting_is_backward_compatible_when_missing() {
        let settings: DesktopSettings = serde_json::from_str(
            r#"{
                "theme": "system",
                "autoStart": false,
                "startMinimized": false,
                "closeToTray": true
            }"#,
        )
        .expect("settings deserialize");

        assert!(!settings.desktop_pet_enabled);
    }
}
```

- [ ] **Step 2: Run the focused Rust tests and verify they fail**

Run:

```bash
cd apps/desktop/src-tauri && cargo test desktop_pet_setting
```

Expected:

```text
no field `desktop_pet_enabled` on type `DesktopSettings`
```

- [ ] **Step 3: Add the Rust settings field**

In `DesktopSettings`, add this field after `close_to_tray`:

```rust
    #[serde(rename = "desktopPetEnabled", default)]
    pub desktop_pet_enabled: bool,
```

In `impl Default for DesktopSettings`, add this field after `close_to_tray`:

```rust
            desktop_pet_enabled: false,
```

- [ ] **Step 4: Add the TypeScript settings field**

In `apps/desktop/src/lib/tauri-ipc.ts`, update `DesktopSettings`:

```ts
export interface DesktopSettings {
  theme: string;
  autoStart: boolean;
  startMinimized: boolean;
  closeToTray: boolean;
  desktopPetEnabled?: boolean;
  desktopNotificationsEnabled?: boolean;
  notifyOnTaskCompleted?: boolean;
  notifyOnTaskFailed?: boolean;
  notifyOnActionRequired?: boolean;
  defaultMode?: string;
  performanceMode?: 'auto' | 'reduced' | 'default';
  aiEnhanced?: boolean;
  aiEnvName?: string | null;
  proxyDebugEnabled?: boolean;
  proxyDebugCodexUpstreamBaseUrl?: string;
  proxyDebugLogMaxBytes?: number;
  proxyDebugRecordMode?: string;
}
```

- [ ] **Step 5: Run focused Rust tests and TypeScript build**

Run:

```bash
cd apps/desktop/src-tauri && cargo test desktop_pet_setting
```

Expected:

```text
test result: ok
```

Run:

```bash
pnpm --filter @ccem/desktop build
```

Expected:

```text
vite build
```

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src-tauri/src/config.rs apps/desktop/src/lib/tauri-ipc.ts
git commit -m "feat(desktop): persist desktop pet setting"
```

### Task 3: Create and Sync Pet Window

**Files:**
- Create: `apps/desktop/src-tauri/src/pet_window.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`

- [ ] **Step 1: Add the pet window module**

Create `apps/desktop/src-tauri/src/pet_window.rs`:

```rust
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

pub const PET_WINDOW_LABEL: &str = "desktop-pet";

const PET_WINDOW_WIDTH: f64 = 520.0;
const PET_WINDOW_HEIGHT: f64 = 360.0;
const PET_WINDOW_MARGIN: f64 = 28.0;

pub fn sync_pet_window_visibility(app: &AppHandle, enabled: bool) -> Result<(), String> {
    if enabled {
        show_pet_window(app)
    } else {
        hide_pet_window(app)
    }
}

pub fn show_pet_window(app: &AppHandle) -> Result<(), String> {
    let window = match app.get_webview_window(PET_WINDOW_LABEL) {
        Some(window) => window,
        None => build_pet_window(app)?,
    };

    configure_pet_window(&window)?;
    position_pet_window(&window)?;
    window.show().map_err(|e| format!("show pet window: {e}"))?;
    Ok(())
}

pub fn hide_pet_window(app: &AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(PET_WINDOW_LABEL) {
        window.hide().map_err(|e| format!("hide pet window: {e}"))?;
    }
    Ok(())
}

fn build_pet_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    WebviewWindowBuilder::new(
        app,
        PET_WINDOW_LABEL,
        WebviewUrl::App("index.html?window=pet".into()),
    )
    .title("CCEM Desktop Pet")
    .decorations(false)
    .transparent(true)
    .resizable(false)
    .shadow(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .inner_size(PET_WINDOW_WIDTH, PET_WINDOW_HEIGHT)
    .visible(false)
    .build()
    .map_err(|e| format!("build pet window: {e}"))
}

fn configure_pet_window(window: &WebviewWindow) -> Result<(), String> {
    window
        .set_always_on_top(true)
        .map_err(|e| format!("pet window always on top: {e}"))?;
    window
        .set_decorations(false)
        .map_err(|e| format!("pet window decorations: {e}"))?;
    Ok(())
}

fn position_pet_window(window: &WebviewWindow) -> Result<(), String> {
    let Some(monitor) = window
        .primary_monitor()
        .map_err(|e| format!("pet window monitor: {e}"))?
    else {
        return Ok(());
    };

    let position = monitor.position();
    let size = monitor.size();
    let scale = monitor.scale_factor();
    let x = position.x as f64 + (size.width as f64 / scale) - PET_WINDOW_WIDTH - PET_WINDOW_MARGIN;
    let y = position.y as f64 + (size.height as f64 / scale) - PET_WINDOW_HEIGHT - PET_WINDOW_MARGIN;

    window
        .set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }))
        .map_err(|e| format!("position pet window: {e}"))?;
    Ok(())
}
```

- [ ] **Step 2: Register the module in `main.rs`**

Near the other `mod` declarations, add:

```rust
mod pet_window;
```

- [ ] **Step 3: Sync pet window during app setup**

Inside the existing `.setup(|app| { ... })` block, after main window chrome setup and after settings have been read, add:

```rust
        let desktop_settings = config::read_settings().unwrap_or_default();
        if desktop_settings.desktop_pet_enabled {
            let app_handle = app.handle().clone();
            if let Err(error) = pet_window::sync_pet_window_visibility(
                &app_handle,
                desktop_settings.desktop_pet_enabled,
            ) {
                eprintln!("Desktop pet startup warning: {}", error);
            }
        }
```

Use the existing setup local variable names when placing the block. The call must happen after the Tauri app handle exists and before setup returns `Ok(())`.

- [ ] **Step 4: Sync pet window when settings are saved**

In `save_settings`, after the existing merged settings assignments, add:

```rust
    merged_settings.desktop_pet_enabled = settings.desktop_pet_enabled;
```

After `config::write_settings(&merged_settings)?;`, add:

```rust
    if let Err(e) =
        pet_window::sync_pet_window_visibility(&app, merged_settings.desktop_pet_enabled)
    {
        errors.push(format!("desktop pet: {}", e));
    }
```

- [ ] **Step 5: Compile Rust**

Run:

```bash
cd apps/desktop/src-tauri && cargo test desktop_pet_setting
```

Expected:

```text
test result: ok
```

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src-tauri/src/pet_window.rs apps/desktop/src-tauri/src/main.rs
git commit -m "feat(desktop): manage desktop pet window"
```

### Task 4: Persist Read State and Open Session From Pet Bubble

**Files:**
- Create: `apps/desktop/src-tauri/src/pet_notifications.rs`
- Modify: `apps/desktop/src-tauri/src/main.rs`
- Modify: `apps/desktop/src/lib/tauri-ipc.ts`

- [ ] **Step 1: Create Rust tests for read state**

Create `apps/desktop/src-tauri/src/pet_notifications.rs` with the tests first:

```rust
use serde::{Deserialize, Serialize};
use std::{collections::BTreeSet, fs, path::PathBuf};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PetNotificationReadState {
    pub read_notification_ids: BTreeSet<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PetOpenSessionRequest {
    pub notification_id: String,
    pub runtime_id: String,
    pub provider_session_id: Option<String>,
    pub provider: Option<String>,
    pub status: String,
    pub mark_read: bool,
}

pub fn mark_read_id(state: &mut PetNotificationReadState, id: String) -> bool {
    state.read_notification_ids.insert(id)
}

#[cfg(test)]
mod tests {
    use super::{mark_read_id, PetNotificationReadState};

    #[test]
    fn mark_read_id_inserts_once() {
        let mut state = PetNotificationReadState::default();
        assert!(mark_read_id(&mut state, "done:runtime-1".to_string()));
        assert!(!mark_read_id(&mut state, "done:runtime-1".to_string()));
        assert_eq!(state.read_notification_ids.len(), 1);
    }

    #[test]
    fn read_state_uses_camel_case_json() {
        let mut state = PetNotificationReadState::default();
        mark_read_id(&mut state, "done:runtime-1".to_string());

        let value = serde_json::to_value(&state).expect("read state serialize");
        assert_eq!(
            value["readNotificationIds"][0],
            serde_json::Value::String("done:runtime-1".to_string())
        );
    }
}
```

- [ ] **Step 2: Run focused Rust tests and verify the file compiles**

Run:

```bash
cd apps/desktop/src-tauri && cargo test pet_notifications
```

Expected:

```text
test result: ok
```

- [ ] **Step 3: Add read/write commands and open command**

Append to `apps/desktop/src-tauri/src/pet_notifications.rs`:

```rust
fn read_state_path() -> PathBuf {
    crate::config::get_ccem_dir().join("pet-notifications.json")
}

fn write_read_state(state: &PetNotificationReadState) -> Result<(), String> {
    crate::config::ensure_ccem_dir()
        .map_err(|e| format!("create ccem dir for pet notifications: {e}"))?;
    let content = serde_json::to_string_pretty(state)
        .map_err(|e| format!("serialize pet notification state: {e}"))?;
    fs::write(read_state_path(), content)
        .map_err(|e| format!("write pet notification state: {e}"))
}

#[tauri::command]
pub fn get_pet_notification_read_state() -> Result<PetNotificationReadState, String> {
    let path = read_state_path();
    if !path.exists() {
        return Ok(PetNotificationReadState::default());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("read pet notification state: {e}"))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("parse pet notification state: {e}"))
}

#[tauri::command]
pub fn mark_pet_notification_read(notification_id: String) -> Result<PetNotificationReadState, String> {
    let mut state = get_pet_notification_read_state()?;
    mark_read_id(&mut state, notification_id);
    write_read_state(&state)?;
    Ok(state)
}

#[tauri::command]
pub fn open_pet_notification(
    app: AppHandle,
    request: PetOpenSessionRequest,
) -> Result<(), String> {
    if request.mark_read {
        mark_pet_notification_read(request.notification_id.clone())?;
        app.emit("pet-notification-read-state-updated", ())
            .map_err(|e| format!("emit pet read state update: {e}"))?;
    }

    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.show();
        let _ = main_window.unminimize();
        let _ = main_window.set_focus();
        main_window
            .emit("pet-open-session", &request)
            .map_err(|e| format!("emit pet open session: {e}"))?;
    }

    Ok(())
}
```

- [ ] **Step 4: Register commands in `main.rs`**

Near the other `mod` declarations, add:

```rust
mod pet_notifications;
```

Inside `tauri::generate_handler![ ... ]`, add:

```rust
            pet_notifications::get_pet_notification_read_state,
            pet_notifications::mark_pet_notification_read,
            pet_notifications::open_pet_notification,
```

- [ ] **Step 5: Add IPC types**

In `apps/desktop/src/lib/tauri-ipc.ts`, add to `TauriCommands`:

```ts
  get_pet_notification_read_state: [void, PetNotificationReadState];
  mark_pet_notification_read: [{ notificationId: string }, PetNotificationReadState];
  open_pet_notification: [{ request: PetOpenSessionRequest }, void];
```

Add interfaces near `DesktopSettings`:

```ts
export interface PetNotificationReadState {
  readNotificationIds: string[];
}

export interface PetOpenSessionRequest {
  notificationId: string;
  runtimeId: string;
  providerSessionId?: string | null;
  provider?: string | null;
  status: string;
  markRead: boolean;
}
```

- [ ] **Step 6: Run Rust and desktop tests**

Run:

```bash
cd apps/desktop/src-tauri && cargo test pet_notifications
```

Expected:

```text
test result: ok
```

Run:

```bash
pnpm --filter @ccem/desktop build
```

Expected:

```text
vite build
```

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src-tauri/src/pet_notifications.rs apps/desktop/src-tauri/src/main.rs apps/desktop/src/lib/tauri-ipc.ts
git commit -m "feat(desktop): add desktop pet notification state"
```

### Task 5: Build Pet Notification Rules With Tests

**Files:**
- Create: `apps/desktop/src/types/pet.ts`
- Create: `apps/desktop/src/lib/petNotifications.ts`
- Create: `apps/desktop/test/pet-notifications.test.mjs`

- [ ] **Step 1: Write failing Node tests**

Create `apps/desktop/test/pet-notifications.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(__dirname, '..');

async function importPetNotifications() {
  const sourcePath = path.join(desktopDir, 'src', 'lib', 'petNotifications.ts');
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
    },
  });
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccem-pet-notification-test-'));
  const outputPath = path.join(tempDir, 'petNotifications.mjs');
  await fs.writeFile(outputPath, output.outputText, 'utf8');
  return import(pathToFileURL(outputPath).href);
}

function session(overrides = {}) {
  return {
    runtime_id: 'runtime-1',
    provider: 'codex',
    transport: 'native_sdk',
    provider_session_id: 'provider-1',
    project_dir: '/tmp/project-a',
    env_name: 'official',
    perm_mode: 'dev',
    runtime_perm_mode: null,
    effort: null,
    status: 'running',
    created_at: '2026-05-01T08:00:00.000Z',
    updated_at: '2026-05-01T08:01:00.000Z',
    is_active: true,
    last_event_seq: 1,
    can_handoff_to_terminal: true,
    last_error: null,
    ...overrides,
  };
}

test('shows running sessions and unread terminal sessions, but hides read terminal sessions', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const notifications = buildPetNotifications(
    [
      session({ runtime_id: 'running-1', status: 'running', updated_at: '2026-05-01T08:03:00.000Z' }),
      session({ runtime_id: 'done-1', status: 'stopped', updated_at: '2026-05-01T08:02:00.000Z' }),
      session({ runtime_id: 'done-2', status: 'error', updated_at: '2026-05-01T08:01:00.000Z' }),
    ],
    new Set(['pet:codex:done-2:error']),
  );

  assert.deepEqual(
    notifications.map((item) => item.runtimeId),
    ['running-1', 'done-1'],
  );
  assert.equal(notifications[0].markReadOnOpen, false);
  assert.equal(notifications[1].markReadOnOpen, true);
});

test('sorts newest updates first and limits the stack to five bubbles', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const sessions = Array.from({ length: 7 }, (_, index) =>
    session({
      runtime_id: `runtime-${index}`,
      provider_session_id: `provider-${index}`,
      updated_at: `2026-05-01T08:0${index}:00.000Z`,
    }),
  );

  const notifications = buildPetNotifications(sessions, new Set());

  assert.equal(notifications.length, 5);
  assert.deepEqual(
    notifications.map((item) => item.runtimeId),
    ['runtime-6', 'runtime-5', 'runtime-4', 'runtime-3', 'runtime-2'],
  );
});

test('uses concise Chinese status labels for different session states', async () => {
  const { buildPetNotifications } = await importPetNotifications();
  const notifications = buildPetNotifications(
    [
      session({ runtime_id: 'waiting-1', status: 'waiting_for_approval' }),
      session({ runtime_id: 'failed-1', status: 'error', last_error: 'network closed' }),
      session({ runtime_id: 'interrupted-1', status: 'interrupted' }),
    ],
    new Set(),
  );

  assert.deepEqual(
    notifications.map((item) => item.statusLabel),
    ['需要处理', '失败', '已中断'],
  );
  assert.equal(notifications[1].message, 'network closed');
});
```

- [ ] **Step 2: Run the test and verify it fails because the module is missing**

Run:

```bash
pnpm --filter @ccem/desktop exec node --test test/pet-notifications.test.mjs
```

Expected:

```text
ENOENT
```

- [ ] **Step 3: Add pet frontend types**

Create `apps/desktop/src/types/pet.ts`:

```ts
export type PetNotificationTone = 'running' | 'done' | 'attention' | 'failed' | 'interrupted';

export interface PetNotificationItem {
  id: string;
  runtimeId: string;
  provider: 'claude' | 'codex';
  providerSessionId?: string | null;
  title: string;
  message: string;
  status: string;
  statusLabel: string;
  tone: PetNotificationTone;
  updatedAt: string;
  projectDir: string;
  markReadOnOpen: boolean;
}

export interface PetOpenSessionRequest {
  notificationId: string;
  runtimeId: string;
  providerSessionId?: string | null;
  provider?: string | null;
  status: string;
  markRead: boolean;
}
```

- [ ] **Step 4: Add the notification rule implementation**

Create `apps/desktop/src/lib/petNotifications.ts`:

```ts
import type { NativeSessionSummary } from '@/lib/tauri-ipc';
import type { PetNotificationItem, PetNotificationTone } from '@/types/pet';

export const PET_NOTIFICATION_LIMIT = 5;

const TERMINAL_STATUSES = new Set(['stopped', 'error', 'failed', 'interrupted', 'handoff']);
const ATTENTION_STATUSES = new Set([
  'waiting_for_approval',
  'waiting_for_prompt',
  'needs_approval',
  'needs_input',
  'action_required',
]);

function basename(projectDir: string): string {
  const normalized = projectDir.replace(/\\/g, '/').replace(/\/+$/, '');
  return normalized.split('/').filter(Boolean).pop() || projectDir || '会话';
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function notificationId(session: NativeSessionSummary): string {
  return `pet:${session.provider}:${session.runtime_id}:${session.status}`;
}

function toneForStatus(status: string): PetNotificationTone {
  if (ATTENTION_STATUSES.has(status)) return 'attention';
  if (status === 'error' || status === 'failed') return 'failed';
  if (status === 'interrupted') return 'interrupted';
  if (TERMINAL_STATUSES.has(status)) return 'done';
  return 'running';
}

function labelForTone(tone: PetNotificationTone): string {
  switch (tone) {
    case 'attention':
      return '需要处理';
    case 'failed':
      return '失败';
    case 'interrupted':
      return '已中断';
    case 'done':
      return '已完成';
    case 'running':
    default:
      return '运行中';
  }
}

function defaultMessage(session: NativeSessionSummary, tone: PetNotificationTone): string {
  if (session.last_error?.trim()) {
    return session.last_error.trim();
  }
  if (tone === 'attention') {
    return '这条会话需要你处理';
  }
  if (tone === 'running') {
    return `${session.provider === 'codex' ? 'Codex' : 'Claude'} 正在运行`;
  }
  return '点开查看结果';
}

export function buildPetNotifications(
  sessions: NativeSessionSummary[],
  readNotificationIds: ReadonlySet<string>,
): PetNotificationItem[] {
  return sessions
    .map((session) => {
      const tone = toneForStatus(session.status);
      const id = notificationId(session);
      const isTerminal = TERMINAL_STATUSES.has(session.status);
      const isAttention = tone === 'attention';
      const shouldShow = isAttention || !isTerminal || !readNotificationIds.has(id);

      if (!shouldShow) {
        return null;
      }

      return {
        id,
        runtimeId: session.runtime_id,
        provider: session.provider,
        providerSessionId: session.provider_session_id,
        title: basename(session.project_dir),
        message: defaultMessage(session, tone),
        status: session.status,
        statusLabel: labelForTone(tone),
        tone,
        updatedAt: session.updated_at || session.created_at,
        projectDir: session.project_dir,
        markReadOnOpen: isTerminal && !isAttention,
      } satisfies PetNotificationItem;
    })
    .filter((item): item is PetNotificationItem => item !== null)
    .sort((left, right) => timestamp(right.updatedAt) - timestamp(left.updatedAt))
    .slice(0, PET_NOTIFICATION_LIMIT);
}
```

- [ ] **Step 5: Run the Node tests**

Run:

```bash
pnpm --filter @ccem/desktop exec node --test test/pet-notifications.test.mjs
```

Expected:

```text
pass
```

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/types/pet.ts apps/desktop/src/lib/petNotifications.ts apps/desktop/test/pet-notifications.test.mjs
git commit -m "feat(desktop): derive desktop pet notifications"
```

### Task 6: Render the Pet Overlay Window

**Files:**
- Create: `apps/desktop/src/components/pet-overlay/PetBubble.tsx`
- Create: `apps/desktop/src/pages/PetOverlay.tsx`
- Modify: `apps/desktop/src/main.tsx`

- [ ] **Step 1: Create the bubble component**

Create `apps/desktop/src/components/pet-overlay/PetBubble.tsx`:

```tsx
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import type { PetNotificationItem } from '@/types/pet';

interface PetBubbleProps {
  item: PetNotificationItem;
  onOpen: (item: PetNotificationItem) => void;
}

function toneClass(tone: PetNotificationItem['tone']): string {
  switch (tone) {
    case 'attention':
      return 'border-amber-300/80 bg-amber-50/95 text-amber-950';
    case 'failed':
      return 'border-red-300/80 bg-red-50/95 text-red-950';
    case 'interrupted':
      return 'border-zinc-300/80 bg-zinc-50/95 text-zinc-900';
    case 'done':
      return 'border-emerald-300/80 bg-emerald-50/95 text-emerald-950';
    case 'running':
    default:
      return 'border-stone-300/80 bg-white/95 text-stone-950';
  }
}

function StatusIcon({ tone }: { tone: PetNotificationItem['tone'] }) {
  if (tone === 'running') {
    return <Loader2 className="h-4 w-4 animate-spin text-amber-600" aria-hidden="true" />;
  }
  if (tone === 'failed' || tone === 'attention') {
    return <CircleAlert className="h-4 w-4 text-amber-700" aria-hidden="true" />;
  }
  return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />;
}

export function PetBubble({ item, onOpen }: PetBubbleProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={[
        'pointer-events-auto w-[330px] rounded-[18px] border px-4 py-3 text-left shadow-[0_10px_30px_rgba(39,31,18,0.18)]',
        'transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(39,31,18,0.24)]',
        toneClass(item.tone),
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-2">
        <StatusIcon tone={item.tone} />
        <span className="truncate text-sm font-semibold">{item.title}</span>
        <span className="ml-auto shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium">
          {item.statusLabel}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm leading-5 opacity-80">{item.message}</p>
    </button>
  );
}
```

- [ ] **Step 2: Create the overlay page**

Create `apps/desktop/src/pages/PetOverlay.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import catImage from '@/assets/pet/golden-cat.png';
import { PetBubble } from '@/components/pet-overlay/PetBubble';
import { buildPetNotifications } from '@/lib/petNotifications';
import type {
  NativeSessionSummary,
  PetNotificationReadState,
} from '@/lib/tauri-ipc';
import type { PetNotificationItem, PetOpenSessionRequest } from '@/types/pet';

const REFRESH_INTERVAL_MS = 2500;

function readIdsFromState(state: PetNotificationReadState): Set<string> {
  return new Set(state.readNotificationIds || []);
}

export function PetOverlay() {
  const [sessions, setSessions] = useState<NativeSessionSummary[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const refreshTimerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    const [nextSessions, readState] = await Promise.all([
      invoke<NativeSessionSummary[]>('list_native_sessions'),
      invoke<PetNotificationReadState>('get_pet_notification_read_state'),
    ]);
    setSessions(nextSessions);
    setReadIds(readIdsFromState(readState));
  }, []);

  useEffect(() => {
    void refresh();
    refreshTimerRef.current = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearInterval(refreshTimerRef.current);
      }
    };
  }, [refresh]);

  useEffect(() => {
    const unlisteners: Array<() => void> = [];
    let cancelled = false;

    const setup = async () => {
      const eventNames = [
        'native-session-updated',
        'session-updated',
        'task-completed',
        'task-error',
        'session-interrupted',
        'pet-notification-read-state-updated',
      ];

      for (const eventName of eventNames) {
        const unlisten = await listen(eventName, () => {
          void refresh();
        });
        if (cancelled) {
          unlisten();
        } else {
          unlisteners.push(unlisten);
        }
      }
    };

    void setup();

    return () => {
      cancelled = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [refresh]);

  const notifications = useMemo(
    () => buildPetNotifications(sessions, readIds),
    [readIds, sessions],
  );

  const openNotification = useCallback(async (item: PetNotificationItem) => {
    const request: PetOpenSessionRequest = {
      notificationId: item.id,
      runtimeId: item.runtimeId,
      providerSessionId: item.providerSessionId,
      provider: item.provider,
      status: item.status,
      markRead: item.markReadOnOpen,
    };

    await invoke('open_pet_notification', { request });
    await refresh();
  }, [refresh]);

  return (
    <main className="pointer-events-none h-screen w-screen overflow-hidden bg-transparent">
      <div className="absolute bottom-4 right-4 flex items-end gap-3">
        <div className="flex max-h-[318px] flex-col-reverse gap-2 overflow-hidden pb-2">
          {notifications.map((item) => (
            <PetBubble key={item.id} item={item} onOpen={openNotification} />
          ))}
        </div>
        <img
          src={catImage}
          alt=""
          draggable={false}
          className="pointer-events-auto h-[112px] w-[112px] object-contain drop-shadow-[0_14px_24px_rgba(84,52,23,0.28)]"
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Split the React entry by Tauri window label**

Modify `apps/desktop/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { getCurrentWindow } from '@tauri-apps/api/window';
import App from './App';
import { PetOverlay } from './pages/PetOverlay';
import { initPerformanceMode } from './lib/performance';
import './index.css';

initPerformanceMode();

const currentWindow = getCurrentWindow();
const Root = currentWindow.label === 'desktop-pet' ? PetOverlay : App;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
```

- [ ] **Step 4: Run desktop tests and build**

Run:

```bash
pnpm --filter @ccem/desktop exec node --test test/pet-notifications.test.mjs
```

Expected:

```text
pass
```

Run:

```bash
pnpm --filter @ccem/desktop build
```

Expected:

```text
vite build
```

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/pet-overlay/PetBubble.tsx apps/desktop/src/pages/PetOverlay.tsx apps/desktop/src/main.tsx
git commit -m "feat(desktop): render desktop pet overlay"
```

### Task 7: Add Settings Toggle and Localized Copy

**Files:**
- Modify: `apps/desktop/src/pages/Settings.tsx`
- Modify: `apps/desktop/src/locales/zh.json`
- Modify: `apps/desktop/src/locales/en.json`

- [ ] **Step 1: Add Settings state and load handling**

In `apps/desktop/src/pages/Settings.tsx`, after `closeToTray` state, add:

```ts
  const [desktopPetEnabled, setDesktopPetEnabled] = useState(false);
```

In the `get_settings` result type used in the load effect, include:

```ts
          desktopPetEnabled?: boolean;
```

After `setCloseToTray(settings.closeToTray ?? true);`, add:

```ts
        setDesktopPetEnabled(settings.desktopPetEnabled ?? false);
```

In the local fallback settings block, read:

```ts
            setDesktopPetEnabled(Boolean(settings.desktopPetEnabled));
```

- [ ] **Step 2: Include the setting in autosave**

Inside the autosave `settings` object, add:

```ts
      desktopPetEnabled,
```

Add `desktopPetEnabled` to the autosave effect dependency list.

- [ ] **Step 3: Add the toggle UI**

Inside the Application settings card, place this block after the close-to-tray switch:

```tsx
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="space-y-1">
              <Label htmlFor="desktop-pet" className="text-sm font-medium">
                {t('settings.desktopPetEnabled')}
              </Label>
              <p className="text-xs leading-5 text-muted-foreground">
                {t('settings.desktopPetEnabledDesc')}
              </p>
            </div>
            <Switch
              id="desktop-pet"
              checked={desktopPetEnabled}
              onCheckedChange={setDesktopPetEnabled}
              aria-label={t('settings.desktopPetEnabled')}
            />
          </div>
```

- [ ] **Step 4: Add localized strings**

In `apps/desktop/src/locales/zh.json`, under `settings`, add:

```json
    "desktopPetEnabled": "桌面猫咪",
    "desktopPetEnabledDesc": "在桌面右下角显示置顶猫咪，并把运行中和未读完成的会话堆叠在旁边"
```

In `apps/desktop/src/locales/en.json`, under `settings`, add:

```json
    "desktopPetEnabled": "Desktop Cat",
    "desktopPetEnabledDesc": "Show an always-on-top desktop cat with running and unread completed sessions stacked beside it"
```

- [ ] **Step 5: Build desktop**

Run:

```bash
pnpm --filter @ccem/desktop build
```

Expected:

```text
vite build
```

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/pages/Settings.tsx apps/desktop/src/locales/zh.json apps/desktop/src/locales/en.json
git commit -m "feat(desktop): add desktop pet setting toggle"
```

### Task 8: Open Matching Workspace Session From Pet Bubble

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/pages/Workspace.tsx`

- [ ] **Step 1: Add main-window pending request state**

In `apps/desktop/src/App.tsx`, import:

```ts
import type { PetOpenSessionRequest } from '@/types/pet';
```

Add state near the other top-level state:

```ts
  const [petOpenRequest, setPetOpenRequest] = useState<PetOpenSessionRequest | null>(null);
```

- [ ] **Step 2: Listen for pet open events**

Inside the tray event listener effect in `App.tsx`, after the existing listeners, add:

```ts
        const listener5 = await listen<PetOpenSessionRequest>('pet-open-session', (event) => {
          setPetOpenRequest(event.payload);
          navigateToTab('workspace');
        });
        if (cancelled) {
          listener5();
          return;
        }
        unlisteners.push(listener5);
```

Keep the effect dependency array valid by adding `setPetOpenRequest` only if the linter or TypeScript requires it; React setters are stable.

- [ ] **Step 3: Pass the request to Workspace**

Update the `Workspace` call:

```tsx
                <Workspace
                  isActive={activeTab === 'workspace'}
                  onNavigate={navigateToTab}
                  onLaunchWithDir={handleLaunchWithDir}
                  petOpenRequest={petOpenRequest}
                  onPetOpenHandled={() => setPetOpenRequest(null)}
                />
```

- [ ] **Step 4: Add Workspace props**

In `apps/desktop/src/pages/Workspace.tsx`, import:

```ts
import type { PetOpenSessionRequest } from '@/types/pet';
```

Update `WorkspaceProps`:

```ts
interface WorkspaceProps {
  isActive?: boolean;
  onNavigate: (tab: string) => void;
  onLaunchWithDir: (dir: string, client?: LaunchClient) => void;
  petOpenRequest?: PetOpenSessionRequest | null;
  onPetOpenHandled?: () => void;
}
```

Update the component signature:

```ts
export function Workspace({
  isActive = true,
  onNavigate,
  petOpenRequest = null,
  onPetOpenHandled,
}: WorkspaceProps) {
```

- [ ] **Step 5: Select matching live or history session**

After `handleSelect` is defined and after `sidebarSessions` is available, add:

```ts
  useEffect(() => {
    if (!petOpenRequest) {
      return;
    }

    const openFromRequest = async () => {
      const liveEntry = liveSessionsByRuntimeId[petOpenRequest.runtimeId];
      if (liveEntry && canRestoreWorkspaceLiveSession(liveEntry.session)) {
        setActiveLiveRuntimeId(liveEntry.session.runtime_id);
        setComposeDir(liveEntry.session.project_dir);
        setSelectedWorkingDir(liveEntry.session.project_dir);
        setWorkspaceMode('live');
        onPetOpenHandled?.();
        return;
      }

      const matchingSession = sidebarSessions.find((session) => {
        if (session.id === petOpenRequest.runtimeId) {
          return true;
        }
        if (petOpenRequest.providerSessionId && session.id === petOpenRequest.providerSessionId) {
          return true;
        }
        return false;
      });

      if (matchingSession) {
        await handleSelect(matchingSession);
        onPetOpenHandled?.();
        return;
      }

      await refreshWorkspaceData({
        hydrateLiveSessions: true,
        showLoading: false,
      });
      onPetOpenHandled?.();
    };

    void openFromRequest();
  }, [
    handleSelect,
    liveSessionsByRuntimeId,
    onPetOpenHandled,
    petOpenRequest,
    refreshWorkspaceData,
    setSelectedWorkingDir,
    sidebarSessions,
  ]);
```

If TypeScript reports that the effect is placed before `handleSelect`, move this block below the `handleSelect` declaration.

- [ ] **Step 6: Build desktop**

Run:

```bash
pnpm --filter @ccem/desktop build
```

Expected:

```text
vite build
```

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/App.tsx apps/desktop/src/pages/Workspace.tsx
git commit -m "feat(desktop): open sessions from desktop pet"
```

### Task 9: Verification and Manual Self-Test

**Files:**
- No new files.

- [ ] **Step 1: Run core build**

Run:

```bash
pnpm --filter @ccem/core build
```

Expected:

```text
tsc
```

- [ ] **Step 2: Run desktop Node tests**

Run:

```bash
pnpm --filter @ccem/desktop test
```

Expected:

```text
pass
```

- [ ] **Step 3: Run desktop build**

Run:

```bash
pnpm --filter @ccem/desktop build
```

Expected:

```text
vite build
```

- [ ] **Step 4: Run Tauri Rust tests**

Run:

```bash
cd apps/desktop/src-tauri && cargo test
```

Expected:

```text
test result: ok
```

- [ ] **Step 5: Start desktop app for manual test**

Run:

```bash
cd apps/desktop && pnpm tauri dev
```

Expected:

```text
Watching /Users/zkyo/Desktop/projects/claude-code-env-manager/.worktrees/desktop-pet/apps/desktop/src-tauri
```

- [ ] **Step 6: Manual flow check**

Use the running app:

```text
1. 打开设置。
2. 打开“桌面猫咪”开关。
3. 确认右下角出现透明背景的金渐层猫咪，没有黑色底。
4. 新建或恢复一个 Codex/Claude 会话。
5. 确认运行中会话气泡显示在猫咪旁边。
6. 创建 6 条以上候选会话，确认只显示 5 条。
7. 让较旧会话产生更新，确认它排到最前。
8. 让一条会话结束，确认未点开前保留气泡。
9. 点击结束气泡，确认主窗口打开对应会话，宠物侧该气泡消失。
10. 点击运行中气泡，确认主窗口打开对应会话，宠物侧该气泡仍保留。
11. 关闭“桌面猫咪”开关，确认悬浮窗消失。
```

- [ ] **Step 7: Save visual evidence**

Run after manual test:

```bash
mkdir -p .artifacts/desktop-pet
```

Save one screenshot manually as:

```text
.artifacts/desktop-pet/enabled-overlay.png
```

- [ ] **Step 8: Final full gate**

Run:

```bash
pnpm verify
```

Expected:

```text
test
build
cargo test
```

- [ ] **Step 9: Final commit**

If any verification-only fixes were made:

```bash
git add apps/desktop
git commit -m "fix(desktop): polish desktop pet overlay"
```

If no verification fixes were made:

```bash
git status --short
```

Expected:

```text
clean working tree, except untracked .artifacts if screenshots were saved
```

## Risk Notes

- `getCurrentWindow()` only works inside Tauri. If plain Vite browser preview is used, `main.tsx` may need a guarded fallback that renders `App`. Add that fallback only if `pnpm --filter @ccem/desktop build` or Vite preview proves it is needed.
- `native-session-updated` may not exist for every runtime event. The 2.5 second polling interval is the fallback, while `updated_at` from `list_native_sessions` remains the source of ordering.
- `open_pet_notification` marks terminal bubbles read before the main window finishes selecting the session. If Workspace cannot find the session immediately, it still refreshes once; the user can use the Workspace list after focus returns.
- The pet window is intentionally not click-through because bubbles must be clickable.

## Final Verification Checklist

- [ ] `pnpm --filter @ccem/core build` passes.
- [ ] `pnpm --filter @ccem/desktop test` passes.
- [ ] `pnpm --filter @ccem/desktop build` passes.
- [ ] `cd apps/desktop/src-tauri && cargo test` passes.
- [ ] Manual Tauri app test confirms setting opens and hides the transparent pet window.
- [ ] Manual Tauri app test confirms max 5 bubbles and newest update first.
- [ ] Manual Tauri app test confirms terminal bubbles disappear after click and running bubbles remain.
