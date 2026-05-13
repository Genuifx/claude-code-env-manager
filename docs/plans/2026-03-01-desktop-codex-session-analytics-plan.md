# Desktop 接入 Codex：会话与统计规划（重构后）

日期：2026-03-01  
适用仓库：`apps/desktop` + `apps/desktop/src-tauri`

---

## 1. 背景与目标

当前 Desktop 的会话、历史、统计链路都以 Claude 数据为中心。目标是在不破坏现有 Claude 行为的前提下，增加 Codex 作为第二来源，覆盖以下能力：

1. 启动会话时可选 Claude / Codex（默认 Claude）。
2. History 页面支持 Claude + Codex 合并查看，并可按来源筛选。
3. Analytics 页面支持合并总览与来源筛选（Claude/Codex/All）。

---

## 2. 已锁定产品决策

1. 启动入口：每次可选客户端，默认 `claude`。
2. 统计视图：保留合并总览，同时支持来源筛选。
3. 历史视图：合并列表 + 来源标签，支持切换单一来源。
4. 消息保真：Codex 历史包含工具调用与推理事件。
5. 环境绑定：Codex 暂不绑定现有环境配置（直接使用 `~/.codex` 与本机 `codex`）。
6. 权限模式：当客户端为 Codex 时禁用权限模式选择器。
7. Resume：Codex resume 暂不做（仅 Claude 保持现有 resume）。
8. 成本口径：Codex 成本按 `~/.ccem/model-prices.json` 估算；模型无匹配时记为 `0`。

---

## 3. 范围与非范围

### 范围内

1. Desktop 前端：启动入口、History、Analytics 的来源维度改造。
2. Tauri 后端：会话启动命令扩展、Codex 历史解析、Codex 统计聚合。
3. 会话持久化：`sessions.json` 增加客户端标识字段并兼容旧数据。

### 非范围

1. Codex resume 会话。
2. 扩展 CLI `ccem launch` 协议支持 Codex。
3. 对 `src/stores/*` 旧目录的结构性清理（本轮不做顺手重构）。

---

## 4. 当前代码基线（与本规划相关）

1. 启动命令：`launch_claude_code`（Rust/TS 同名）是唯一启动路径。
2. 终端启动：Claude 优先走 `ccem launch`，fallback 到 `claude`。
3. 历史数据：`history.rs` 只读 `~/.claude/history.jsonl` 与 `~/.claude/projects/*/*.jsonl`。
4. 统计数据：`analytics.rs` 只扫 `~/.claude/projects/*/*.jsonl`，按 assistant usage 聚合。
5. 前端状态：主状态源在 `src/store/index.ts`，`src/stores` 未被业务引用。

### 4.1 Codex 样本验证结论（M1 前置）

实施前已用本机真实 `~/.codex/sessions/*.jsonl` 抽样验证，当前可稳定观察到以下事件类型：

1. `event_msg.user_message`
2. `event_msg.agent_message`
3. `event_msg.agent_reasoning`
4. `event_msg.token_count`
5. `response_item.function_call`
6. `response_item.function_call_output`
7. `response_item.reasoning`

约束：Codex 格式可能演进，正式实现必须使用“宽容解析 + 事件分派”，不能把任一字段当强依赖。

---

## 5. 接口与类型变更（兼容优先）

### 5.1 Tauri Command 变更

以下命令采用“新增可选参数，保留默认行为”的方式升级：

1. `launch_claude_code(env_name, perm_mode, working_dir, resume_session_id, client?)`
2. `get_usage_stats(source?)`
3. `get_conversation_history(source?)`
4. `get_conversation_messages(session_id, source?)`
5. `get_conversation_segments(session_id, source?)`

默认策略：

1. `client` 默认 `claude`。
2. `source` 未传时等价 `all`（兼容旧调用，可返回合并视图）。

### 5.2 Rust 数据结构变更

1. `Session` 新增 `client: String`（`claude|codex`）。
2. `HistorySession` 新增 `source: String`（`claude|codex`）。
3. 旧 `sessions.json` 无 `client` 时按 `claude` 处理（反序列化默认值）。
4. `Session.client` 必须显式声明 serde 默认值，避免旧数据反序列化失败：
   - `#[serde(default = "default_client")]`
   - `fn default_client() -> String { "claude".to_string() }`

### 5.3 前端类型与 store 变更

1. 新增类型：`type LaunchClient = 'claude' | 'codex'`。
2. `Session` 新增 `client: LaunchClient`。
3. `HistorySessionItem` 新增 `source: LaunchClient`。
4. Store 新增：
   - `launchClient: LaunchClient`（默认 `claude`）
   - `setLaunchClient(client)`
5. `TauriSession` 的 `client` 字段先按可选处理（`client?: string`），兼容后端灰度阶段。

---

## 6. 实现设计

## 6.1 启动链路（Dashboard / Sessions / Tray 触发）

### 后端

1. `launch_claude_code` 接收 `client`，按客户端分流：
   - `claude`：沿用现有逻辑（`ccem launch` -> fallback `claude`）。
   - `codex`：直接执行 `codex`，不注入 `ANTHROPIC_*` 环境变量，不应用 permission mode。
2. `codex` 分支不依赖 `env_name` 存在性（避免“环境异常导致 Codex 启动失败”）。
3. 会话入库时写入 `client` 字段。
4. 新增 Codex 可执行路径解析函数，复用 `resolve_ccem_path` 思路：
   - 优先 `shell -li/-l -c "which codex"`；
   - fallback 常见路径：`~/.local/bin/codex`、`~/.npm-global/bin/codex`、`~/.cargo/bin/codex`、`/usr/local/bin/codex`、`/opt/homebrew/bin/codex`。
5. 新增 `check_codex_installed` 命令（或并入现有检测接口），避免前端盲启动。
6. 若 `client == codex && resume_session_id.is_some()`，后端直接返回可读错误（不做隐式忽略）。

### 前端

1. LaunchStrip 增加客户端选择器（Claude/Codex）。
2. 客户端为 Codex 时：
   - 权限模式选择器禁用；
   - 启动调用传 `client='codex'`；
   - UI 提示“Codex 不使用该权限模式设置”。
3. Session 卡片/列表增加来源徽标，避免混淆。

## 6.2 历史链路（History）

### 数据源

1. Claude：保持原有读取方式。
2. Codex：
   - 列表：`~/.codex/history.jsonl`
   - 消息：`~/.codex/sessions/YYYY/MM/DD/*.jsonl`

### Codex 消息映射

1. `event_msg.user_message` -> user 文本消息。
2. `event_msg.agent_message` -> assistant 文本消息。
3. `event_msg.agent_reasoning` / `response_item.reasoning` -> thinking 折叠块。
4. `response_item.function_call` / `response_item.custom_tool_call` -> tool_use。
5. `response_item.function_call_output` / `response_item.custom_tool_call_output` -> tool_result（通过 `call_id` 配对）。

### 交互策略

1. History 列表默认显示合并结果，按时间倒序。
2. 增加来源筛选：`all | claude | codex`。
3. 详情查询命令统一携带 `source`，避免跨来源同 ID 碰撞。
4. Codex 会话上禁用 Resume 按钮并显示“暂不支持”文案。
5. 前端列表 key 和选中态使用复合键：`{source}:{id}`，从渲染层彻底规避同 ID 冲突。

## 6.3 统计链路（Analytics）

### 数据聚合

1. 扫描路径：
   - Claude：`~/.claude/projects/*/*.jsonl`
   - Codex：`~/.codex/sessions/**/*.jsonl`
2. Codex token 使用 `token_count.info.total_token_usage` 差分累计：
   - `input_tokens -> inputTokens`
   - `cached_input_tokens -> cacheReadTokens`
   - `output_tokens + reasoning_output_tokens -> outputTokens`
   - `cacheCreationTokens = 0`
3. 成本：
   - 模型匹配成功：按 `model-prices.json` 计算。
   - 匹配失败：`cost = 0`，避免误用 Claude fallback 单价。
4. 去重策略：按 `session_id + timestamp + usage tuple` 去重，重复快照只计一次。
5. 差分策略：对每个会话维护 `last_seen_total`，`delta = max(0, current - last)`，防止累积值被重复累计。

### 前端展示

1. Analytics 页面增加来源筛选（All/Claude/Codex）。
2. 统计请求携带 `source` 参数。
3. 保持现有图表组件，不新增新图种，仅改变输入数据。

---

## 7. 文件改动清单（实施时参考）

### Rust

1. `apps/desktop/src-tauri/src/main.rs`
2. `apps/desktop/src-tauri/src/terminal.rs`
3. `apps/desktop/src-tauri/src/session.rs`
4. `apps/desktop/src-tauri/src/history.rs`
5. `apps/desktop/src-tauri/src/analytics.rs`
6. `apps/desktop/src-tauri/src/codex.rs`（建议新增，放 Codex 专用解析与映射）

### Frontend

1. `apps/desktop/src/store/index.ts`
2. `apps/desktop/src/hooks/useTauriCommands.ts`
3. `apps/desktop/src/components/dashboard/LaunchStrip.tsx`
4. `apps/desktop/src/pages/Sessions.tsx`
5. `apps/desktop/src/components/sessions/SessionCard.tsx`
6. `apps/desktop/src/components/sessions/SessionList.tsx`
7. `apps/desktop/src/pages/History.tsx`
8. `apps/desktop/src/components/history/HistoryList.tsx`
9. `apps/desktop/src/pages/Analytics.tsx`
10. `apps/desktop/src/lib/tauri-ipc.ts`
11. `apps/desktop/src/locales/zh.json`
12. `apps/desktop/src/locales/en.json`

---

## 8. 测试与验收

## 8.1 Rust 测试

1. `history.rs`
   - Codex 列表解析成功。
   - tool call / output 配对正确。
   - reasoning 事件映射正确。
   - 损坏行容错不 panic。
   - `source` 过滤正确（all/claude/codex）。
   - 缺失字段时可降级，不 panic。
2. `analytics.rs`
   - token_count 差分去重正确。
   - 来源筛选 all/claude/codex 返回一致。
   - 模型缺失价格时成本为 0。
   - 累积快照重复输入不会翻倍。
3. `terminal.rs`
   - `codex` 启动命令拼接与转义正确。
   - `resolve_codex_path` 在 login shell 与 fallback 路径下均可命中。
4. `session.rs`
   - 旧会话数据无 `client` 字段可正常读取并默认 `claude`。

## 8.2 手工回归

1. Dashboard/Sessions 可分别启动 Claude 与 Codex。
2. Codex 模式权限选择器禁用，切回 Claude 恢复。
3. History 默认合并显示，来源筛选可切换。
4. Codex 历史展示用户、助手、工具、推理事件。
5. Analytics 来源切换后总览、趋势、分布一致联动。

## 8.3 验收命令

1. `pnpm -C apps/desktop build`
2. `cd apps/desktop/src-tauri && cargo test`

---

## 9. 风险与回滚

### 主要风险

1. Codex JSONL 格式后续升级导致解析字段漂移。
2. `token_count` 事件并非每段都会稳定出现，可能造成统计偏差。
3. History 合并后同时间高密度消息导致页面渲染压力上升。

### 缓解策略

1. 解析器采用“宽容解析 + 单元测试快照”。
2. 对关键字段缺失做降级，不中断整页数据。
3. 前端大列表保持虚拟化改造预留（本轮先不改）。

### 回滚策略

1. 若 Codex 解析出现线上问题，可临时将来源筛选默认锁定 Claude（前端降级）。
2. 后端保留 Claude 原命令路径，Codex 分支可按 flag 快速禁用。

---

## 10. 里程碑

1. M1：启动链路接入 Codex（可启动 + 会话可见）。
2. M2：History 合并与来源筛选上线。
3. M3：Analytics 来源筛选 + Codex 统计上线。
4. M4：测试补齐与文案/i18n 收口。
