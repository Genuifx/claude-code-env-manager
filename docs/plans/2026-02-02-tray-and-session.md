# 托盘与会话管理实现计划

> 让 CCEM Desktop 的系统托盘真正可用

## 目标

实现完整的系统托盘功能：
- 动态显示环境列表和当前选中
- 点击切换环境/权限模式
- 在 Terminal.app 中启动 Claude
- 显示和管理活跃会话

## 当前问题

| 问题 | 现状 |
|------|------|
| 托盘菜单硬编码 | 环境列表写死，不从配置读取 |
| 点击无响应 | 只 `println!`，无实际功能 |
| 无终端集成 | `spawn("claude")` 在后台运行，不可见 |
| 会话只在内存 | 重启应用丢失，无 PID 监控 |

## 实现步骤

### Step 1: 动态托盘菜单

**目标**: 托盘菜单从配置文件读取环境列表

**修改 `tray.rs`**:
```rust
// 从配置读取环境列表
fn build_env_menu(app: &AppHandle, current: &str, envs: Vec<String>) -> Submenu
// 重建菜单的公开函数
pub fn rebuild_tray_menu(app: &AppHandle) -> Result<(), Error>
```

**验收**: 添加新环境后，托盘菜单能显示

---

### Step 2: 托盘事件处理

**目标**: 点击菜单项能切换环境/权限

**实现**:
- 托盘点击 → 调用 `set_current_env`
- 发送事件到前端 → 前端刷新状态
- 更新托盘菜单显示（重建菜单）

**新增 Tauri 事件**:
```rust
app.emit("env-changed", &new_env)?;
app.emit("perm-changed", &new_perm)?;
```

**验收**: 托盘切换环境，主窗口同步更新

---

### Step 3: 终端集成 (Terminal.app + iTerm2)

**目标**: 在用户选择的终端中启动 Claude

**新增 `terminal.rs`**:
```rust
pub enum TerminalType { TerminalApp, ITerm2 }

pub fn detect_terminals() -> Vec<TerminalType>  // 检测已安装终端

pub fn launch_in_terminal(
    terminal: TerminalType,
    env_vars: HashMap<String, String>,
    working_dir: &str,
    session_name: &str,  // iTerm2 用于设置 Tab 标题
) -> Result<u32, Error>
```

**Terminal.app AppleScript**:
```applescript
tell application "Terminal"
    do script "cd /path && export KEY=val && claude"
    activate
end tell
```

**iTerm2 AppleScript** (增强体验):
```applescript
tell application "iTerm2"
    create window with default profile
    tell current session of current window
        set name to "Claude: official + dev"
        write text "cd /path && export KEY=val && claude"
    end tell
end tell
```

**iTerm2 优势**:
- 可设置 Tab/窗口标题
- 精确聚焦到指定会话
- 更好的会话管理

**新增 Tauri Command**:
```rust
#[tauri::command]
fn detect_terminals() -> Vec<TerminalInfo>

#[tauri::command]
fn get_preferred_terminal() -> TerminalType

#[tauri::command]
fn set_preferred_terminal(terminal: TerminalType)
```

**验收**:
- Terminal.app 能启动 Claude
- 安装了 iTerm2 时能选择使用
- iTerm2 窗口有正确的标题

---

### Step 4: 会话状态监控

**目标**: 跟踪会话是否还在运行

**实现**:
- 定时检查 PID 是否存活（每 5 秒）
- 进程结束时更新状态为 "stopped"
- 发送事件通知前端

**新增**:
```rust
// 后台任务检查会话状态
fn start_session_monitor(app: AppHandle, manager: Arc<SessionManager>)
```

**验收**: Claude 退出后，会话状态自动变为 stopped

---

### Step 5: 托盘显示活跃会话

**目标**: 托盘菜单显示运行中的会话

**菜单结构**:
```
├─ 活跃会话 (2)
│  ├─ official + dev    [聚焦]
│  └─ GLM + yolo        [聚焦]
├─ ─────────
├─ ▶ 启动 Claude
```

**聚焦功能**: AppleScript 激活对应 Terminal 窗口

**验收**: 启动多个 Claude，托盘能看到并聚焦

---

### Step 6: 前端集成

**目标**: Dashboard 显示会话，能停止会话

**修改 `SessionsCard.tsx`**:
- 调用 `list_sessions` 获取会话
- 监听 `session-updated` 事件刷新
- 停止按钮调用 `stop_session`

**验收**: 主窗口和托盘数据同步

---

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `src-tauri/src/tray.rs` | 重写：动态菜单 + 事件处理 |
| `src-tauri/src/terminal.rs` | 新增：Terminal.app 集成 |
| `src-tauri/src/session.rs` | 扩展：PID 监控 |
| `src-tauri/src/main.rs` | 添加：事件发送、监控启动 |
| `src/components/dashboard/SessionsCard.tsx` | 修改：调用后端命令 |
| `src/hooks/useTauriEvents.ts` | 新增：监听后端事件 |

## 不做的事情

- ❌ iTerm2 集成（后续优化）
- ❌ 权限模式应用（只记录，不修改 settings.json）
- ❌ 用量统计集成
- ❌ Skills 管理

## 验收标准

1. 托盘显示真实环境列表
2. 托盘切换环境，前端同步
3. 点击启动，Terminal.app 打开 Claude
4. 托盘显示运行中的会话
5. 能聚焦/停止会话
