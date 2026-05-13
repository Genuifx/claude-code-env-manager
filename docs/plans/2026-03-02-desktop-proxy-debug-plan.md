# Desktop 透明反代调试模式设计文档（Claude + Codex）

日期：2026-03-02  
适用范围：`apps/desktop` + `apps/desktop/src-tauri` + `apps/cli`（隐藏 launch 参数）

---

## 1. 背景与目标

需要在 Desktop 提供一套“反代调试模式”，用于调试 Claude/Codex 请求与 prompt，同时尽量保持对正常使用零影响。

目标如下：

1. Desktop 新增独立 `Proxy Debug` Tab，提供开关、状态和流量日志。
2. 开关开启后，Desktop 启动的 Claude 与 Codex 会话统一走本地 Rust 反代。
3. 反代按“会话级动态 path”路由，精确绑定会话上游（支持 `opus-power` 等特殊环境 base URL）。
4. 记录完整原始请求/响应，支持历史回看。
5. 反代失败时阻止会话启动，避免调试链路绕过代理。

---

## 2. 范围与非范围

### 2.1 范围内

1. 覆盖 Desktop 启动的 Claude 会话。
2. 覆盖 Desktop 启动的 Codex 会话。
3. 新增 Proxy Debug Tab（开关、状态、日志列表、详情查看）。
4. 落盘完整原始流量，滚动保留 500MB。

### 2.2 非范围

1. 不覆盖手动终端启动的 `ccem` / `claude` / `codex`。
2. 不覆盖 Cron/Skills 后台调用链路（后续可扩展）。
3. 不做代理层重试、缓存、改写响应。

---

## 3. 已锁定产品决策

1. 覆盖范围：Claude + Codex 会话。
2. 入口位置：新增 SideRail Tab，不放 Settings。
3. 日志策略：完整原始包落盘。
4. 保留上限：500MB 滚动淘汰。
5. Codex 上游：默认 `https://api.openai.com/v1`，可在 Tab 修改。
6. 启动失败策略：代理不可用时，阻止会话启动并提示错误。

---

## 4. 透明转发与日志采集约束（P0）

代理必须保持“透明转发优先”，日志采集不能改变业务行为。

1. 请求透传：
1. 保持 `method/path/query/body` 原样。
2. 仅处理 RFC 规定的 hop-by-hop headers，不改业务 headers。
2. 响应透传：
1. 保持 `status/headers/body` 原样返回。
2. 不做 JSON 注入、字段改写、格式转换。
3. 流式透传：
1. SSE/长响应按流转发，不做全量缓冲后返回。
2. 禁止代理层重试，避免重复请求和时序变化。
4. 日志旁路：
1. 日志写入失败不影响主链路转发结果。
2. 日志逻辑不参与路由决策。

### 4.1 SSE 推流兼容规范（P0）

当前主流模型请求都依赖 SSE，本模式必须保证 SSE 行为与直连一致。

1. 协议与头透传：
1. 透传 `Content-Type: text/event-stream`。
2. 不改写 `Transfer-Encoding`、`Content-Encoding`、`Cache-Control`。
2. 数据帧透传：
1. 不解析再重组 `data:` 事件，不重写 JSON 片段。
2. 不合并事件帧，不吞掉空行 `\n\n`，保留 heartbeat/comment 帧。
3. 刷新策略：
1. 每个上游 chunk 到达后立即 flush 给下游。
2. 禁止代理层“按大小/时间窗口聚合后再发送”。
4. 生命周期：
1. 客户端断开时，立即取消上游请求（避免僵尸流）。
2. 上游断开时，原样结束下游流并记录结束原因。
5. 超时策略：
1. SSE 路径使用长连接超时配置，不能复用短请求 timeout。
2. 仅在连接建立阶段使用较短超时；已建立流后按 idle timeout 控制。

### 4.2 SSE 日志采集策略（P0）

SSE 场景必须采用“流式 tee”采集，确保日志与转发解耦。

1. 流式 tee 架构：
1. 每个上游 chunk 同时流向两条路径：主转发路径 + 日志旁路路径。
2. 主转发路径优先级最高，必须立即 flush，不等待日志写入完成。
3. 日志写入采用单独 writer 任务（有界队列），禁止“每 chunk spawn 一个任务”。
2. 临时文件策略：
1. 响应开始时创建 `bodies/<id>-res.tmp`。
2. chunk 逐步追加写入 `.tmp` 文件。
3. 流正常结束后原子重命名为 `bodies/<id>-res.bin`。
4. 流中断时保留 `.tmp` 并在索引中标记 `response_incomplete=true`。
3. 日志写入失败处理：
1. 旁路写入失败时标记 `log_dropped=true`，主链路继续。
2. 不允许因日志失败影响客户端接收。
4. 背压处理：
1. 日志 writer 队列满时允许丢弃日志 chunk，不能阻塞主路径。
2. 索引中标记 `log_partial=true` 并累计 `log_dropped_bytes`。
5. 内存控制：
1. 不缓存完整响应体到内存。
2. chunk 写入后立即释放。
3. 单流日志缓冲设置硬上限（建议 16MB）；超限后停止该流日志采集并打标。

---

## 5. 端口管理策略（P0）

### 5.1 监听端口规则

1. 首选固定端口：`127.0.0.1:17890`（便于调试与日志定位）。
2. 若固定端口被占用，自动回退到动态端口：`127.0.0.1:0`（由 OS 分配空闲端口）。

### 5.2 冲突避免

1. 启动时先尝试 bind 固定端口。
2. 失败后 fallback 动态端口并记录实际端口。
3. 代理服务运行期间，端口仅由当前 Desktop 进程维护，不跨进程共享。

### 5.3 端口传递

1. `ensure_proxy_running()` 返回运行态，其中包含 `listen_port`。
2. 会话启动逻辑基于 `listen_port` 生成代理入口 URL。
3. 前端通过 `get_proxy_debug_state` 获取并展示当前端口。

---

## 6. 代理生命周期管理（P0）

### 6.1 启动时机

1. Desktop 启动时读取 settings。
2. 若 `proxyDebugEnabled=true`，后台尝试启动代理（非阻塞 UI）。
3. 用户在 Tab 中开启开关时，立即触发启动。
4. 启动会话前执行 `ensure_proxy_running()` 作为强校验。

### 6.2 停止时机

1. 用户关闭开关时，主动停止代理并清空路由注册表。
2. Desktop 退出时（`RunEvent::Exit`）主动停止代理。

### 6.3 崩溃清理

1. 代理以内嵌任务运行在 Desktop 进程内，不是独立 daemon。
2. Desktop 崩溃时代理会随进程退出，不产生孤儿代理进程。

---

## 7. 会话级动态路由设计

### 7.1 核心思路

每个会话启动时分配唯一 `route_id`，并绑定一份“上游快照”。客户端实际访问本地代理路径，代理按 `route_id` 查表转发。

### 7.2 路由格式

1. Claude：`http://127.0.0.1:<port>/proxy/claude/<route_id>`
2. Codex：`http://127.0.0.1:<port>/proxy/codex/<route_id>`

### 7.3 路由注册信息

1. `route_id`
2. `session_id`
3. `client`（claude|codex）
4. `env_name`（Claude 场景）
5. `upstream_base_url`
6. `created_at`
7. `proxy_enabled`

### 7.4 为什么用会话级而不是环境级

1. 同一环境可并发多个会话，隔离更清晰。
2. 会话启动后冻结上游，后续环境改动不会影响已运行会话。
3. 可精准支持 `opus-power` 这类特殊 base URL 环境。

---

## 8. 启动链路改造

### 8.1 Desktop Rust `launch_claude_code`

1. 若 `proxyDebugEnabled=true`，先 `ensure_proxy_running()`。
2. 启动代理失败则立即返回错误，阻止会话启动。
3. 成功后创建 `route_id` 并注册上游快照。

### 8.2 Claude 启动注入

1. 读取当前环境真实 `ANTHROPIC_BASE_URL` 作为 upstream。
2. 给会话注入代理入口 URL 到 `ANTHROPIC_BASE_URL`。

### 8.3 Codex 启动注入

1. 使用 `proxyDebugCodexUpstreamBaseUrl` 作为 upstream。
2. 给会话注入代理入口 URL 到 `OPENAI_BASE_URL`。

### 8.4 CLI 隐藏 launch 扩展

1. 新增隐藏参数：`ccem launch --proxy-base-url <url>`（Desktop 专用）。
2. 兼容策略：保留 `--anthropic-base-url` 作为一个发布周期 alias，后续移除。

---

## 9. 性能与并发限制（P1）

### 9.1 并发目标

1. 设计目标：稳定支持 20 个并发会话（含流式响应）。
2. 压测目标：10 会话并发流式场景无超时/崩溃。

### 9.2 运行策略

1. 采用异步 HTTP 服务器 + 异步上游客户端连接池。
2. 每请求独立转发，不引入请求队列阻塞主链路。
3. 日志写入通过独立任务处理，避免影响转发延迟。

### 9.3 过载降级

1. 当活跃连接数超过阈值（如 200）时，新请求返回 `503 PROXY_OVERLOADED`。
2. 过载时仍保持已有流式连接稳定，不主动断流。

---

## 10. 错误响应规范（P1）

所有代理层错误统一返回 JSON：

```json
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Route not found",
    "request_id": "uuid"
  }
}
```

状态码定义：

1. `404 ROUTE_NOT_FOUND`：`route_id` 不存在或已清理。
2. `410 ROUTE_EXPIRED`：路由存在但关联会话已结束且不可继续转发。
3. `502 UPSTREAM_CONNECT_ERROR`：无法连接上游或上游握手失败。
4. `504 UPSTREAM_TIMEOUT`：上游超时。
5. `503 PROXY_OVERLOADED`：代理过载保护触发。

客户端感知：

1. Claude/Codex 会将其视作 HTTP 失败并在会话中展示错误。
2. Desktop 同时通过 `proxy-status`/日志列表显示错误详情。

---

## 11. 数据结构与接口变更

### 11.1 `DesktopSettings` 新增字段

1. `proxyDebugEnabled: bool`
2. `proxyDebugCodexUpstreamBaseUrl: string`
3. `proxyDebugLogMaxBytes: u64`（默认 `524288000`）
4. `proxyDebugRecordMode: "full" | "metadata"`（默认 `"full"`）

### 11.2 Tauri 新命令

1. `get_proxy_debug_state() -> ProxyDebugState`
2. `set_proxy_debug_enabled(enabled: bool) -> ProxyDebugState`
3. `update_proxy_debug_config(codex_upstream_base_url: String, record_mode: Option<String>) -> ProxyDebugState`
4. `list_proxy_traffic(limit: u32, cursor: Option<String>) -> ProxyTrafficPage`
5. `get_proxy_traffic_detail(id: String) -> ProxyTrafficDetail`
6. `clear_proxy_traffic() -> Result<(), String>`

### 11.3 Tauri 新事件

1. `proxy-status`
2. `proxy-traffic`

---

## 12. 日志存储、查询与保留

### 12.1 存储路径

`~/.ccem/proxy-debug/`

### 12.2 文件组织

1. `traffic.jsonl`：流量索引（元数据）
2. `traffic.idx`：偏移索引（`timestamp,id,offset`）
3. `bodies/<id>-req.bin`：原始请求体
4. `bodies/<id>-res.tmp`：响应流写入中的临时文件（SSE/流式）
5. `bodies/<id>-res.bin`：响应流完整结束后的最终文件

### 12.3 索引字段

1. `id`
2. `timestamp`
3. `client`
4. `session_id`
5. `env_name`
6. `method`
7. `path`
8. `query`
9. `status`
10. `duration_ms`
11. `request_headers`
12. `response_headers`
13. `request_body_size`
14. `response_body_size`
15. `request_body_file`
16. `response_body_file`
17. `prompt_preview`
18. `log_dropped`（日志写入过载时标记）
19. `response_incomplete`（响应是否中断）
20. `log_partial`（日志是否部分丢失）
21. `log_dropped_bytes`（丢失字节数）

### 12.4 分页与 cursor 规范（P2）

1. `cursor` 使用 `"{timestamp_ms}:{id}"`。
2. 查询按 `timestamp desc, id desc` 排序。
3. `list_proxy_traffic` 先用内存索引定位，再按 offset 回读，避免全文件扫描。
4. 启动时若 `traffic.idx` 缺失，单次重建索引后驻留内存。

### 12.5 `prompt_preview` 提取策略

1. Claude：优先从请求 JSON 的 `messages` 中提取最后一条 user 文本。
2. Codex：优先从请求 JSON 的 `input`（string/array）提取文本。
3. 解析失败时 fallback 请求体前缀文本（UTF-8 best effort）。
4. 最终统一截断（例如 300 字符）用于列表展示。

### 12.6 SSE 日志查看策略（Raw + Reduced）

SSE 场景下日志采用“双轨”：

1. `Raw SSE`：
1. 保留完整原始事件流（用于协议级排障）。
2. 可按事件帧逐条查看，不做语义改写。
2. `Reduced`（默认展示）：
1. 后台在流结束后做一次归约，生成“可读结果”。
2. UI 默认先展示 Reduced，Raw 作为高级调试切换。

归约产物字段（新增）：

1. `final_text`：助手最终文本（按事件顺序拼接后的结果）。
2. `tool_calls`：归并后的工具调用列表（name/args/result/状态）。
3. `usage`：token 统计快照（若上游提供）。
4. `finish_reason`：完成原因（stop/length/error/interrupted）。
5. `stream_status`：`completed | interrupted | upstream_error | client_cancelled`。
6. `first_token_ms` / `total_stream_ms`：流式时延指标。

归约规则：

1. Claude：
1. 按 `content_block_delta` 文本增量拼接 `final_text`。
2. 工具调用按 `tool_use` / `tool_result` 进行关联。
2. Codex/Responses：
1. 按文本 delta 事件顺序拼接 `final_text`。
2. 结合完成事件提取 `finish_reason` 和 usage。
3. 流被中断时：
1. 仍保存“部分 Reduced 结果”。
2. `stream_status` 标记为非 completed，避免误判为完整回答。

### 12.7 500MB 滚动策略

1. 每次新增日志后计算总占用。
2. 超限时按时间从旧到新删除，直到回到阈值内。
3. 删除顺序保持 `traffic.jsonl` / `traffic.idx` / `bodies/` 一致性。

---

## 13. Codex 上游地址验证规则（P2）

保存配置时做静态校验：

1. 必须是合法 URL。
2. 协议只允许 `http` / `https`。
3. 必须包含 host。
4. 允许自定义路径前缀（例如 `/v1`）。
5. 校验失败直接阻止保存并展示错误。

连通性校验策略：

1. 不在“保存”时强制探活，避免网络抖动导致配置无法保存。
2. 启动会话时若上游不可达，由代理返回标准错误（502/504）。

---

## 14. 安全与隐私保护（P0）

1. UI 首次开启时弹出强警告：日志可能包含密钥、prompt、响应内容。
2. 提供记录模式：
1. `full`：完整包记录（默认）。
2. `metadata`：仅记录元数据，不落 body 文件。
3. 日志文件权限：
1. 目录权限 `700`。
2. 文件权限 `600`。
4. 提供“一键清空日志”操作。
5. 文档与 UI 明确说明该模式仅建议在受控开发环境启用。

---

## 15. 可观测性

代理内部维护并暴露以下指标：

1. 请求总数（按 client 维度）。
2. 成功数/失败数。
3. 路由未命中数。
4. 平均响应时间（移动窗口）。
5. 当前活跃连接数。

这些指标在 Proxy Debug Tab 的“运行状态”区域展示。

---

## 16. 分阶段实施建议

建议拆分 3 个 PR：

1. P0：代理核心 + Claude 支持（`proxy_debug.rs` + 路由注册 + 透明转发 + 端口/生命周期）。
2. P1：Codex 支持 + 日志存储（完整流量记录 + 500MB 滚动 + 错误规范）。
3. P2：前端 UI（Proxy Debug Tab + 实时日志 + 详情查看 + 指标展示）。

---

## 17. 测试与验收标准

### 17.1 单元测试

1. 路由注册/查找逻辑。
2. 端口 fallback 逻辑（固定端口占用 -> 动态端口）。
3. 日志滚动清理逻辑。
4. cursor 分页逻辑。
5. URL 校验逻辑。

### 17.2 集成测试

1. 启动 2 个 Claude 会话 + 1 个 Codex 会话，验证路由隔离。
2. `opus-power` 特殊 base URL 环境命中正确上游。
3. 无效 route、超时、上游不可达错误码符合规范。

### 17.3 压力测试

1. 10 会话并发流式请求，验证无崩溃。
2. 验证代理过载保护触发和恢复行为。

### 17.4 透明性验收（必须）

1. 请求方法、路径、query、body 与上游收到的一致。
2. 响应状态、headers、body 与客户端收到的一致。
3. SSE/流式响应在实时性与分块行为上不被破坏。

### 17.5 SSE 专项验收（必须）

1. `text/event-stream` 响应头在代理前后保持一致。
2. 首包延迟（TTFB）与直连相比不出现明显放大（定义阈值如 <200ms 增量）。
3. 连续 token 推送无明显卡顿，不出现“批量突发输出”。
4. heartbeat/comment 帧可被客户端观察到，不被代理吞掉。
5. 客户端主动中断后，上游连接在短时间内被正确取消。
6. 10 个并发 SSE 流、每流 10MB 响应时：
1. 客户端收到的数据与上游一致。
2. 日志文件大小与响应大小一致（若背压触发则 `log_partial=true`）。
3. 主路径不被日志拖慢（日志开启相对关闭的 TTFB 增量 <50ms）。

---

## 18. 风险与注意事项

1. 完整原始包落盘会包含敏感信息，必须强化用户告知。
2. 流量体积大时磁盘增长快，必须严格执行滚动清理。
3. 代理透明性是核心约束，任何“便利性改写”都应禁止。

---

## 19. 实施文件清单（含改动点）

1. `apps/desktop/src-tauri/src/main.rs`：接入代理生命周期与启动链路校验。
2. `apps/desktop/src-tauri/src/config.rs`：新增 Proxy Debug 设置字段与默认值。
3. `apps/desktop/src-tauri/src/terminal.rs`：注入代理 base URL 到 Claude/Codex 启动命令。
4. `apps/desktop/src-tauri/src/proxy_debug.rs`（新增）：代理核心、路由表、日志、指标。
5. `apps/desktop/src-tauri/Cargo.toml`：新增代理所需依赖。
6. `apps/cli/src/index.ts`：隐藏 `launch` 命令新增 `--proxy-base-url`。
7. `apps/desktop/src/store/index.ts`：新增 Proxy Debug 页面状态类型。
8. `apps/desktop/src/hooks/useTauriCommands.ts`：新增 Proxy Debug IPC 封装。
9. `apps/desktop/src/App.tsx`：注册新页面路由。
10. `apps/desktop/src/components/layout/SideRail.tsx`：新增 `Proxy Debug` 导航入口。
11. `apps/desktop/src/pages/ProxyDebug.tsx`（新增）：开关、状态、日志列表、详情与指标。
12. `apps/desktop/src/locales/zh.json`：新增 Proxy Debug 文案。
13. `apps/desktop/src/locales/en.json`：新增 Proxy Debug 文案。
