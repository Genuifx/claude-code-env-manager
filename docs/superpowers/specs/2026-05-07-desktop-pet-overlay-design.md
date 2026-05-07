# 桌面宠物悬浮窗设计

日期：2026-05-07

## 概要

给 CCEM Desktop 增加一个可选的桌面宠物。宠物是一只金渐层小猫，放在独立的透明 Tauri 置顶窗口里。猫旁边显示会话通知流：正在运行的会话、已经结束但用户还没看过的会话、失败或中断的会话，以及需要用户审批或回答的会话。

第一版控制范围，不做太满：

- 通过设置里的开关显示或隐藏宠物窗口。
- 宠物窗口独立于 CCEM 主窗口。
- 通知最多显示 5 条。
- 有新更新的会话实时排到最前面。
- 完成、失败、中断类通知在用户打开后标记为已读并消失。
- 运行中和待处理通知只要状态还在，就继续显示。

## 已确认的用户决策

- 使用独立的 Tauri `pet` webview window。
- 默认关闭，不在升级后突然弹出。
- 使用已确认的扁平金渐层猫图，不使用之前的蓝色机器人参考图。
- 使用堆叠通知流，不做单条主气泡，也不做小仪表盘。
- 最多显示 5 条气泡。
- 按最近更新时间排序，最新更新排在最前。
- 显示运行中、未读完成、失败/中断、需要处理这几类会话。
- 完成、失败、中断气泡打开对应会话后自动消失。

## 不做的事

- 第一版不做拖拽和位置记忆。
- 不做复杂宠物动画。最多保留很轻的 CSS hover 或 idle 效果。
- 不做宠物选择、命名或换装。
- 不同步已读状态到其他设备。
- 不替代系统通知。系统通知还是原来的系统通知。

## 视觉设计

宠物窗口是一个很紧凑的小场景：

- 金渐层猫固定在窗口右下角。
- 会话气泡堆叠在猫左侧。
- 气泡使用深色半透明底，保证在不同桌面背景上都能读清。
- 状态颜色：
  - 需要处理：橙色 `!`
  - 失败/中断：红色 `x`
  - 未读完成：绿色对勾
  - 运行中：金色 live dot
- 如果可显示的会话超过 5 条，第一版只取最近更新的 5 条。

当前确认的猫图是设计阶段产物：

`/Users/zkyo/Desktop/projects/claude-code-env-manager/.artifacts/ccem-pet-cat-selected-transparent.png`

实现时要把最终 PNG 复制到可提交的桌面端资源目录，例如：

`apps/desktop/src/assets/pet/golden-cat.png`

## 窗口行为

新增一个 label 为 `pet` 的 Tauri webview window。

目标窗口属性：

- 透明背景
- 无系统窗口装饰
- always-on-top
- 在 Tauri 支持的情况下不出现在任务栏或 Dock
- 不可调整大小
- `desktopPetEnabled` 为 `true` 时才显示
- 默认位置在屏幕右下角，离屏幕边缘留一点距离

第一版可以使用固定大小的窗口，只要能容纳猫和 5 条气泡即可。需要注意：有些平台上透明区域也会拦截点击，所以窗口矩形要尽量紧凑，减少对桌面的遮挡。

## 设置

扩展 `~/.ccem/settings.json` 里的桌面设置：

```json
{
  "desktopPetEnabled": false
}
```

Rust 侧：

- 给 `DesktopSettings` 增加 `desktop_pet_enabled: bool`。
- 默认值为 `false`。
- 更新 `save_settings`，合并并持久化这个字段。
- 保存设置后同步宠物窗口的显示状态。

前端侧：

- 扩展 `DesktopSettings` 类型。
- 在 Settings 页增加“桌面宠物”开关，建议放在 Application 卡片里。
- 继续使用 Settings 页现有的自动保存流程。

## 前端架构

主窗口和宠物窗口可以复用同一个 React bundle。启动时读取当前 Tauri window label：

- `main` 渲染现有 App。
- `pet` 渲染轻量的 `PetOverlayApp`。

`PetOverlayApp` 负责：

- 加载宠物通知。
- 监听通知更新事件。
- 渲染金渐层猫图和堆叠气泡。
- 处理气泡点击，调用打开会话的命令。

这个新功能要和现有的 `components/pet/*` 侧边栏 RPG 宠物原型分开。旧原型从 `~/.claude.json` 读取 Claude companion 数据；这次做的是桌面会话宠物，不依赖那份数据。

## 通知模型

新增一组 Rust/TypeScript 共用的通知结构：

```ts
type PetNotificationKind = 'attention' | 'failed' | 'completed' | 'running';

interface PetNotification {
  id: string;
  sessionId: string;
  runtimeKind?: 'interactive' | 'headless' | 'native' | 'terminal';
  client: 'claude' | 'codex' | 'opencode' | string;
  title: string;
  subtitle: string;
  projectDir: string;
  kind: PetNotificationKind;
  updatedAt: string;
  read: boolean;
  openTarget: {
    tab: 'workspace' | 'sessions';
    sessionId: string;
  };
}
```

`id` 要能稳定指向某个会话的某个通知状态。终端会话的完成/失败事件可以把 session id 和状态一起放进去；运行中和需要处理的通知可以直接使用 runtime/session id。

`updatedAt` 表示这个会话通知最近一次“用户可见变化”的时间。状态变化、新输出、出现权限审批、出现问题提问、任务完成、失败或中断，都应该刷新它。不要只用会话创建时间。

## 排序和显示条件

显示条件：

- 显示运行中的会话。
- 显示还有审批、计划确认、问题回答或 prompt 等待处理的会话。
- 完成会话只在未读时显示。
- 失败或中断会话只在未读时显示。

排序规则：

1. 先按 `updatedAt` 倒序排列。
2. 如果时间相同，或落在一个很短的防抖窗口里，比如 1 秒内，再按状态优先级排序：
   - attention
   - failed
   - completed
   - running
3. 最后只取前 5 条。

核心规则是“最新更新排最前”。状态优先级只用于时间接近时打破并列，所以任何会话只要有新动态，都可以顶到最前面。

## 已读状态

已读状态属于 UI 状态，不是用户偏好，不放进 `settings.json`。

推荐保存到：

`~/.ccem/pet-notifications.json`

结构示例：

```json
{
  "read": {
    "terminal:session-123:completed": "2026-05-07T10:12:00Z"
  }
}
```

规则：

- 用户点击完成、失败、中断气泡并打开会话后，标记为已读。
- 如果用户从主窗口手动打开同一个会话，也标记为已读。
- 运行中的通知不因为点击而标记已读。
- 需要处理的通知只有在待处理状态消失后才移除。

## IPC

IPC 是 “inter-process communication”，也就是进程间通信。这个项目里可以理解为：React 前端通过命令调用 Rust 后端，Rust 后端也可以发事件给前端窗口。桌面宠物会用这条通道连接主窗口、宠物窗口和 Rust 里的会话状态。

新增或扩展命令：

- `get_pet_notifications() -> Vec<PetNotification>`
- `open_pet_notification(notification_id: String) -> Result<(), String>`
- `mark_pet_notification_read(notification_id: String) -> Result<(), String>`
- `sync_pet_window_visibility(enabled: bool) -> Result<(), String>`，如果保存设置时不直接调用内部 helper，可以加这个命令。

事件：

- `pet-notifications-updated`
- `pet-open-session`

预期流程：

1. Rust 里的会话状态变化，或前端会话视图观察到有意义的新动态。
2. 后端发出 `pet-notifications-updated`。
3. `PetOverlayApp` 重新加载通知。
4. 用户点击某个气泡。
5. 宠物窗口调用 `open_pet_notification`。
6. 后端显示并聚焦主窗口，然后向主窗口发 `pet-open-session`。
7. 主窗口跳到对应会话。
8. 如果是完成、失败、中断类通知，后端标记为已读，并再次发通知更新事件。

## 打开会话

主窗口收到 `pet-open-session` 后：

- 把主窗口拉到前台。
- native/headless/workspace 会话优先跳到 Workspace。
- legacy terminal/tmux 会话如果 Workspace 不能直接展示，就跳到 Sessions。
- 选中或聚焦目标会话。

如果目标会话已经不存在，仍然拉起主窗口，跳到 History 或 Sessions，并用非阻塞 toast 提示。

## 数据来源

优先使用现有会话状态：

- `list_native_sessions`
- `list_unified_sessions`
- legacy terminal session events：`task-completed`、`task-error`、`session-interrupted`
- interactive/headless/native event replay，用来判断是否有待处理状态

第一版建议做一个后端统一的通知聚合器。这样主窗口和宠物窗口看到的是同一份状态，已读标记也集中管理。宠物前端不应该复制 Workspace 里复杂的 transcript 重建逻辑。

## 错误处理

- 猫图加载失败时不要显示破图图标；隐藏宠物图片区域，气泡仍可用。
- 通知加载失败时，只显示猫，并在下一次事件或轮询时重试。
- 打开会话失败时，保留气泡；如果能显示主窗口，就用紧凑 toast 报错。
- `pet` 窗口创建失败时，不要让应用崩溃。设置可以保持开启，但 Settings 里要提示窗口创建失败。

## 测试

单元测试：

- `desktopPetEnabled` 默认序列化为 `false`。
- 通知按最近更新时间排在前面。
- 时间相同或接近时，排序优先级为 attention > failed > completed > running。
- 完成/失败/中断通知标记已读后不再显示。
- 运行中通知即使被点击，也仍然保持可显示。

前端测试：

- 宠物通知列表最多渲染 5 条气泡。
- 点击气泡会用 notification id 调用打开命令。
- 不同状态映射到正确的样式 class。

桌面手动自测：

1. 在 `apps/desktop` 运行 `pnpm tauri dev`。
2. 打开 Settings，启用桌面宠物。
3. 确认右下角出现透明、置顶的宠物窗口。
4. 启动至少两个会话，确认运行中气泡出现。
5. 让一个会话完成，确认它作为未读完成气泡出现。
6. 点击完成气泡，确认主窗口打开对应会话，并且气泡消失。
7. 触发或模拟失败、中断、需要处理状态，确认它们显示出来，并在更新时排到最前。
8. 关闭桌面宠物开关，确认宠物窗口隐藏。

## 实现备注

- 选中的猫图目前在 `.artifacts/` 下，该目录被忽略。实现时必须复制到可提交的资源目录。
- 旧的侧边栏 `PetEntry` 不在本次范围内，除非实现时自然清理死代码。不要把旧 companion 原型和桌面宠物混成一个功能。
- `.superpowers/brainstorm/` 是视觉 companion 的临时目录，不要提交。
