# 多会话分屏启动技术方案

## 概述

本文档描述在 CCEM Desktop 中实现「多会话分屏启动」功能的技术原理，支持两种使用场景：
- **Worktree 模式**：同一项目的多个 git worktree 并行开发
- **多项目模式**：多个独立项目同时启动

## iTerm2 AppleScript API

### 核心能力

| 操作 | AppleScript | 说明 |
|------|-------------|------|
| 创建窗口 | `create window with default profile` | 返回 window 对象 |
| 水平分割 | `split horizontally with default profile` | 左右分屏，新 session 在右边 |
| 垂直分割 | `split vertically with default profile` | 上下分屏，新 session 在下边 |
| 执行命令 | `write text "command"` | 在 session 中执行命令 |
| 获取窗口 ID | `id of window` | 用于后续操作 |

### 限制

1. **无法合并已有窗口**：只能在现有 session 基础上分割创建新 session，无法将已运行的 session 移动到其他窗口
2. **分屏数量限制**：理论上无限制，但实际受屏幕空间限制，建议最多 4-6 个
3. **仅限 iTerm2**：Terminal.app 不支持这些高级功能

## 分屏布局实现

### 2 分屏（左右）

```applescript
tell application "iTerm2"
    set newWindow to (create window with default profile)
    tell newWindow
        tell current session
            write text "cd /path/to/project1 && claude"
            set session2 to (split horizontally with default profile)
        end tell
        tell session2
            write text "cd /path/to/project2 && claude"
        end tell
    end tell
    return id of newWindow
end tell
```

布局结果：
```
┌─────────────┬─────────────┐
│  Project 1  │  Project 2  │
└─────────────┴─────────────┘
```

### 4 分屏（2x2 网格）

```applescript
tell application "iTerm2"
    set newWindow to (create window with default profile)
    tell newWindow
        -- 第一个 session（左上）
        tell current session
            write text "cd /path/to/project1 && claude"
            -- 水平分割，创建右边的 session
            set rightSession to (split horizontally with default profile)
        end tell

        -- 第二个 session（右上）
        tell rightSession
            write text "cd /path/to/project2 && claude"
        end tell

        -- 回到左上，垂直分割创建左下
        tell session 1 of current tab
            set bottomLeftSession to (split vertically with default profile)
        end tell

        -- 第三个 session（左下）
        tell bottomLeftSession
            write text "cd /path/to/project3 && claude"
        end tell

        -- 回到右上，垂直分割创建右下
        tell rightSession
            set bottomRightSession to (split vertically with default profile)
        end tell

        -- 第四个 session（右下）
        tell bottomRightSession
            write text "cd /path/to/project4 && claude"
        end tell
    end tell
    return id of newWindow
end tell
```

布局结果：
```
┌─────────────┬─────────────┐
│  Project 1  │  Project 2  │
├─────────────┼─────────────┤
│  Project 3  │  Project 4  │
└─────────────┴─────────────┘
```

### 3 分屏（1+2 布局）

```applescript
-- 左边一个大的，右边上下两个
tell application "iTerm2"
    set newWindow to (create window with default profile)
    tell newWindow
        tell current session
            write text "cd /path/to/main && claude"
            set rightSession to (split horizontally with default profile)
        end tell
        tell rightSession
            write text "cd /path/to/sub1 && claude"
            set bottomRightSession to (split vertically with default profile)
        end tell
        tell bottomRightSession
            write text "cd /path/to/sub2 && claude"
        end tell
    end tell
end tell
```

布局结果：
```
┌─────────────┬─────────────┐
│             │   Sub 1     │
│    Main     ├─────────────┤
│             │   Sub 2     │
└─────────────┴─────────────┘
```

## Git Worktree 检测

### 获取 Worktree 列表

```bash
git worktree list --porcelain
```

输出格式：
```
worktree /Users/user/project
HEAD abc123def456
branch refs/heads/main

worktree /Users/user/project-feature-a
HEAD def456abc123
branch refs/heads/feature-a

worktree /Users/user/project-feature-b
HEAD 789xyz123abc
branch refs/heads/feature-b
```

### Rust 实现

```rust
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitWorktree {
    pub path: String,
    pub branch: String,
    pub head: String,
    pub is_main: bool,
}

pub fn list_worktrees(repo_path: &str) -> Result<Vec<GitWorktree>, String> {
    let output = Command::new("git")
        .args(["-C", repo_path, "worktree", "list", "--porcelain"])
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        return Err("Not a git repository or git worktree not supported".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut worktrees = Vec::new();
    let mut current = GitWorktree {
        path: String::new(),
        branch: String::new(),
        head: String::new(),
        is_main: false,
    };

    for line in stdout.lines() {
        if line.starts_with("worktree ") {
            if !current.path.is_empty() {
                worktrees.push(current.clone());
            }
            current.path = line.strip_prefix("worktree ").unwrap().to_string();
            current.is_main = worktrees.is_empty(); // 第一个是主 worktree
        } else if line.starts_with("HEAD ") {
            current.head = line.strip_prefix("HEAD ").unwrap().to_string();
        } else if line.starts_with("branch ") {
            let branch = line.strip_prefix("branch refs/heads/").unwrap_or(
                line.strip_prefix("branch ").unwrap()
            );
            current.branch = branch.to_string();
        }
    }

    if !current.path.is_empty() {
        worktrees.push(current);
    }

    Ok(worktrees)
}
```

## Tauri 命令设计

### 获取 Worktrees

```rust
#[tauri::command]
fn get_worktrees(repo_path: String) -> Result<Vec<GitWorktree>, String> {
    git::list_worktrees(&repo_path)
}
```

### 多会话分屏启动

```rust
#[derive(Debug, Deserialize)]
pub struct MultiLaunchConfig {
    pub projects: Vec<ProjectConfig>,
    pub layout: SplitLayout,
    pub env_name: String,
    pub perm_mode: String,
}

#[derive(Debug, Deserialize)]
pub struct ProjectConfig {
    pub path: String,
    pub name: Option<String>,  // 可选的显示名称
}

#[derive(Debug, Deserialize)]
pub enum SplitLayout {
    Horizontal2,      // 左右 2 分屏
    Vertical2,        // 上下 2 分屏
    Grid4,            // 2x2 网格
    LeftMain3,        // 左大右小 (1+2)
    Custom(Vec<Split>), // 自定义布局
}

#[tauri::command]
fn launch_multi_session(
    state: State<Arc<SessionManager>>,
    config: MultiLaunchConfig,
) -> Result<Vec<Session>, String> {
    // 1. 构建 AppleScript
    // 2. 执行并获取 window ID
    // 3. 为每个分屏创建 Session 记录
    // 4. 返回所有 Session
}
```

## 会话追踪

多分屏窗口中的会话追踪方式：

### 方案 A：单窗口多会话

- 存储 `window_id`，所有分屏共享同一个 window
- 关闭窗口时一起关闭所有会话
- 适合：作为一个整体管理

```rust
pub struct MultiSession {
    pub window_id: String,
    pub sessions: Vec<Session>,  // 每个分屏一个 session
    pub layout: SplitLayout,
}
```

### 方案 B：独立会话 + 分组

- 每个分屏创建独立的 Session 记录
- 添加 `group_id` 字段关联同一窗口的会话
- 适合：需要独立追踪每个分屏的状态

```rust
pub struct Session {
    // ... 现有字段
    pub group_id: Option<String>,  // 同一窗口的会话共享 group_id
    pub pane_index: Option<u32>,   // 在窗口中的位置 (0-3)
}
```

## 前端组件设计

### 对话框结构

```tsx
interface MultiLaunchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 两个 Tab
// Tab 1: Worktree 模式
//   - 项目选择器（检测是否有 worktree）
//   - Worktree 列表（多选）
//   - 分屏布局选择

// Tab 2: 多项目模式
//   - 项目列表（从收藏/最近/手动添加）
//   - 分屏布局选择
```

### 状态管理

```typescript
interface MultiLaunchState {
  mode: 'worktree' | 'projects';

  // Worktree 模式
  mainRepo: string | null;
  selectedWorktrees: string[];

  // 多项目模式
  selectedProjects: string[];

  // 通用
  layout: '2h' | '2v' | '4' | '3left';
  envName: string;
  permMode: string;
}
```

## 实现步骤

### Phase 1: 后端基础

1. 添加 `git.rs` 模块，实现 worktree 检测
2. 添加分屏启动 AppleScript 生成函数
3. 添加 `launch_multi_session` Tauri 命令

### Phase 2: 前端 UI

1. 创建 `MultiLaunchDialog` 组件
2. 实现 Worktree 模式 UI
3. 实现多项目模式 UI
4. 集成到 Dashboard

### Phase 3: 会话管理

1. 扩展 Session 结构支持分组
2. 更新 SessionsCard 显示分组会话
3. 添加"关闭分组"操作

## 参考资料

- [iTerm2 AppleScript API](https://iterm2.com/documentation-scripting.html)
- [Git Worktree 文档](https://git-scm.com/docs/git-worktree)
