# Workspace Sidebar Session Icon Upgrade — Design Plan

## Overview

升级 Workspace 左侧项目树里“会话标题左边的 icon”，让它同时表达：

- 会话身份：当前到底是 Claude / Codex / OpenCode，还是某个具体环境提供商
- 会话状态：是否正在生成、是否在等待用户输入/审批/Review

目标不是单纯把 `MessageSquare` 换成另一个图标，而是把这个 16px 入口变成一眼可读的状态信号位。

## Current State

### 1. 当前前端渲染仍是固定图标

- 文件：`apps/desktop/src/components/workspace/ProjectTree.tsx`
- 当前会话行左侧固定渲染 `MessageSquare`
- 编辑标题时也还是同一个固定图标

### 2. Workspace 侧边栏吃的是历史数据，不是运行态数据

- 文件：`apps/desktop/src/pages/Workspace.tsx`
- 侧边栏数据来自 `fetchHistorySessions('all')`
- 类型：`HistorySessionItem`
- 当前字段只有：
  - `id`
  - `source`
  - `display`
  - `timestamp`
  - `project`
  - `projectName`
  - `envName`
  - `configSource`

这意味着：

- “基础身份”勉强能从 `source` / `envName` 推断
- “正在生成 / 等待输入”这种实时状态，当前数据源拿不到

### 3. 运行态状态其实已经存在，只是 Workspace 没接

后端现有能力：

- `list_unified_sessions`
- `get_session_events`

关键类型：

- `UnifiedSessionInfo`
  - `id`
  - `status`
  - `project_dir`
  - `env_name`
  - `client`
  - `claude_session_id`
- `SessionEventPayload`
  - `tool_use_started` with `needs_response`
  - `permission_required`
  - `terminal_prompt_required`

也就是说，后端已经能判断：

- 会话是否 `processing`
- 是否在等审批
- 是否在等用户输入
- 是否在等 plan review

只是 Workspace 没把这些信号映射到会话树。

### 4. 品牌 icon 基础设施也已经有了

- `apps/desktop/src/components/history/HistoryList.tsx`
  - 已有 Claude / Codex / OpenCode 的 lobe icon 渲染
- `apps/desktop/src/components/history/ModelIcon.tsx`
  - 已有 OpenAI / Claude / DeepSeek / GLM / Qwen / Kimi 等 provider icon 解析
- `apps/desktop/src/hooks/useTauriCommands.ts`
  - 加载环境时会拿到 `baseUrl` / `defaultOpusModel` / `runtimeModel`

所以这次不需要再造一套 brand icon 体系，重点是“统一解析规则 + 接入运行态状态”。

## UX Direction

### 设计原则

左侧 icon 只保留一个主槽位，不扩展列表宽度，不新增第二列状态徽标。

这个槽位采用“身份基底 + 状态覆盖”的语义：

1. 有强状态时，优先显示状态
2. 没有强状态时，显示会话身份

### 状态优先级

建议优先级如下：

1. `attention`
2. `processing`
3. `identity`

其中：

- `attention` = 当前会话需要用户行动
- `processing` = 当前会话正在生成/处理中
- `identity` = 当前会话是谁

### 身份 icon 规则

默认规则建议如下：

1. 如果会话匹配到活跃 runtime，且 `client` 是 `codex`，显示 `Codex` icon
2. 如果会话匹配到活跃 runtime，且 `client` 是 `opencode`，显示 `OpenCode` icon
3. 否则优先按环境配置解析 provider icon
   - 优先使用 `runtimeModel`
   - 其次 `defaultOpusModel`
   - 再其次 `baseUrl`
4. 如果环境解析失败，则退回历史 `source` icon
5. 最后兜底才用通用 icon

这样可以满足：

- 开的是 Codex，会明确显示 Codex
- Claude 走 GLM / Kimi / Qwen 这类环境时，可以显示 provider 对应的 lobe icon
- 自定义环境也能通过 model/baseUrl 尽量命中 provider，而不是只能靠环境名猜

### 状态 icon 规则

#### 1. Processing

触发条件：

- runtime `status` 为 `processing`
- 可选地把 `initializing` 也视为 loading 态

视觉建议：

- 使用 `LoaderCircle` / `Loader2`
- 保持 14-16px
- `animate-spin`
- 颜色跟随当前 item 的选中态/普通态

#### 2. Attention

触发条件：

- `permission_required`
- `terminal_prompt_required`
- `tool_use_started.needs_response === true`

视觉建议：

- 用 `BadgeAlert` 或 `TriangleAlert`
- 主色走 amber / warning，不走灰色
- 加轻量 glow 或 pulse，让它“醒目一点”
- 如果后续要更细分，可以再区分：
  - 输入请求
  - 审批请求
  - plan review

第一版不必在视觉上分三种图形，先统一成高优先级提醒即可。

## State Model

建议在 Workspace 层引入一个衍生状态模型，而不是把逻辑硬塞进 `ProjectTree.tsx`。

```ts
type SessionVisualState = 'identity' | 'processing' | 'attention';

type SessionAttentionKind =
  | 'input_required'
  | 'plan_review'
  | 'permission_required';

interface WorkspaceSessionDecoration {
  sessionKey: string;
  runtimeId?: string;
  client?: 'claude' | 'codex' | 'opencode';
  visualState: SessionVisualState;
  attentionKind?: SessionAttentionKind;
}
```

`ProjectTree` 只负责消费：

- 当前行的 decoration
- 当前行的 identity icon

不自己做状态推导。

## Matching Strategy

历史会话和运行态会话需要先匹配上，状态才能覆盖到正确的列表项。

建议匹配顺序：

1. `history.id === unified.claude_session_id`
2. 若 session id 还没稳定写入，则 fallback：
   - `project`/`project_dir` 一致
   - `envName`/`env_name` 一致
   - `client`/`source` 尽量一致
   - 选择最新活跃 runtime

说明：

- `claude_session_id` 这个字段名虽然历史包袱很重，但当前实现里对 Codex/OpenCode 也在复用
- 第一版可以继续复用，不必为了这次需求先做字段重命名

## Event Derivation

建议只对“当前活跃 runtime”拉事件，不要对全部历史会话做 replay。

### Attention 推导

判定某个 runtime 需要提醒时：

- 存在未解决的 `permission_required`
- 存在未解决的 `terminal_prompt_required`
- 最新未闭合的 `tool_use_started(needs_response=true)`

闭合条件：

- `permission_responded`
- `terminal_prompt_resolved`
- 后续进入完成态/停止态
- runtime 消失

### Processing 推导

可直接使用 unified runtime summary：

- `processing`
- 可选包含 `initializing`

### 为什么不只看 summary

因为：

- `waiting for input`
- `plan review required`
- `approval required`

这些状态在 summary 里并不完整，真正的细粒度语义在 event replay 里。

## Implementation Plan

### Step 1. 抽出统一 icon resolver

新增一个 Workspace 专用 icon helper，建议放在：

- `apps/desktop/src/components/workspace/sessionTreeIcons.tsx`

职责：

- 渲染 source/client lobe icon
- 根据 `Environment` 解析 provider icon
- 根据 decoration 渲染 loading / attention 状态 icon

同时把 `HistoryList.tsx` 里已有的 source icon 逻辑抽成可复用函数，避免 Workspace 和 History 两边各写一份。

### Step 2. 给 Workspace 增加 decoration 层

建议新增 hook：

- `apps/desktop/src/components/workspace/useWorkspaceSessionDecorations.ts`

职责：

- 拉取 `list_unified_sessions`
- 仅针对活跃 runtime 拉 `get_session_events`
- 维护 `eventsByRuntime`
- 生成 `decorationBySessionKey`

### Step 3. 在 Workspace 中桥接环境配置

`Workspace.tsx` 需要把环境配置也纳入 icon 决策输入：

- 从 store 读取 `environments`
- 传给 decoration/icon resolver

这样 provider icon 不再依赖环境名字符串碰运气。

### Step 4. 改造 `ProjectTree.tsx`

把当前固定的 `MessageSquare` 改成：

- 正常态：身份 icon
- 生成中：spinner
- 待输入/审批/Review：attention icon

并保持：

- item 高度不变
- 文字截断行为不变
- selected / hover 样式不被 icon 抢掉

编辑态也复用同一套身份 icon，不再退回通用气泡。

### Step 5. 交互和可访问性补足

建议补：

- `title` / `aria-label`
  - 例如：`Codex · waiting for input`
  - 或中文文案：`Codex · 等待输入`
- 选中态下图标颜色压一层，不要比文字更抢

## Proposed File Touches

预计涉及：

- `apps/desktop/src/components/workspace/ProjectTree.tsx`
- `apps/desktop/src/pages/Workspace.tsx`
- `apps/desktop/src/components/workspace/sessionTreeIcons.tsx`（新增）
- `apps/desktop/src/components/workspace/useWorkspaceSessionDecorations.ts`（新增）
- `apps/desktop/src/components/history/HistoryList.tsx`
- `apps/desktop/src/components/history/ModelIcon.tsx` 或新的解析 helper

如果要补文案，还会涉及：

- `apps/desktop/src/locales/zh.json`
- `apps/desktop/src/locales/en.json`

## Risks

### 1. 历史会话与活跃 runtime 匹配存在短暂不稳定窗口

刚启动会话时，runtime 可能先有，history 投影稍后才刷出来。

应对：

- 优先用 `claude_session_id`
- fallback 用 project/env/client
- 允许短时间内先显示 identity fallback，再切换到实时状态

### 2. 同一历史会话被重复 resume 时可能出现多 runtime 竞争

应对：

- 只选择最新且活跃的 runtime

### 3. 自定义环境不能只靠 `envName` 判别 provider

应对：

- 使用环境配置里的 `runtimeModel` / `defaultOpusModel` / `baseUrl`

### 4. 事件订阅拆分在 interactive/headless 两条链路

第一版建议不要直接接实时 desktop event stream，优先采用低频轮询：

- `list_unified_sessions`
- `get_session_events`

理由：

- Workspace 只需要 sidebar badge 级别的新鲜度
- 实现更直接，和当前 `HeadlessSessionsPanel` 的 replay 模式一致

后续如果觉得 2-3 秒轮询仍不够实时，再统一接入 live event。

## Validation Plan

实现时至少验证以下路径：

1. Claude + GLM/Kimi/Qwen 环境
   - 侧边栏显示 provider 对应 icon
2. Codex 会话
   - 侧边栏显示 Codex icon
3. OpenCode 会话
   - 侧边栏显示 OpenCode icon
4. 会话正在生成
   - icon 切换为 loading
5. 会话等待用户输入 / 审批 / plan review
   - icon 切换为高优先级提醒
6. 状态解除后
   - icon 正确回退到身份 icon

建议验证命令：

```bash
pnpm --filter @ccem/core build
cd apps/desktop && pnpm build
cd apps/desktop && pnpm tauri dev
```

然后通过 Tauri MCP 自测 Workspace 会话树的状态切换。

## Recommendation

建议按“两阶段”推进：

### Phase 1

- 先做 identity icon + processing + attention 三态
- 先用 polling 打通
- 先统一 attention 视觉，不细分图标

### Phase 2

- 再区分 attention 子类型
- 再考虑 live event 订阅替代 polling
- 再看是否给列表项右侧加极轻量 secondary badge

第一阶段就能把“无意义 icon”升级成真正有信息密度的入口，而且实现风险可控。
