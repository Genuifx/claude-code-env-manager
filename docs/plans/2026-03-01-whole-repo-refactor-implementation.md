# CCEM 全仓重构实施计划（质量优先，可执行版）

> 日期：2026-03-01
> 基线分支：当前分支（用户确认为最新）
> 原则：不考虑工期，只考虑“是否做对”
> 执行纪律：大胆假设，小心求证；所有结论必须有代码证据

---

## 0. 本次修订说明

本文件替换了上一版 implementation 的以下问题：

- 修复了与当前代码不一致的 Tauri command 类型映射（`save_settings`、`set_preferred_terminal`、`sync_jetbrains_projects`、`retry_cron_task`、`load_from_remote` 等）。
- 修复了错误文件路径与结构体归属（例如 `TerminalInfo` 在 `terminal.rs`，`LoadResult` 在 `main.rs`，不存在 `apps/desktop/stauri/...`）。
- 修复了文档中的损坏代码块、拼写错误与不可执行示例（如 `typescr`、`set_prefe_terminal`、`taskIing`、`unsh`、`inueries` 等）。
- 合并两轮审查意见：补入并上调严重性后的 P0/P1 项（并发竞态、监听器泄漏、query 传密钥、`shell: true`、ErrorBoundary、i18n 一致性、`as any`、超大文件清单、巨型 store 拆分）。
- 调整实施顺序：`Step 1a / 1b` 拆分、并发安全前置、前端改造拆成 `4a / 4b / 4c`、测试从“最后补”改为“每步强制带测试”。

---

## 1. 强制约束（每一步都必须满足）

- 新增/修改代码必须同步新增/修改测试，改动覆盖率目标 `>= 80%`。
- 每一步必须通过以下门禁后才能进入下一步：
  - `pnpm -r test:run`
  - `pnpm -r build`
  - `cd apps/desktop/src-tauri && cargo test`
- 不允许把测试集中到最后一步补；测试必须随改动一起提交。
- 对用户可见行为变化必须在 PR 描述中写明迁移说明。
- 默认禁止“先重构后修 bug”；必须先止血后重构。

---

## 2. 当前代码基线（实施前锁定）

### 2.1 关键事实（已复核）

- CLI 包名是 `ccem`，不是 `@ccem/cli`。
- `apps/cli/src/remote.ts` 仍使用 legacy `Conf` 初始化，未统一 `cwd`。
- `apps/cli/src/usage.ts` 仍使用 `__dirname`（ESM 风险）。
- `apps/cli/src/launcher.ts` 启动 claude 时仍 `shell: true`。
- `server/index.js` 使用 `req.query.key` 传密钥。
- `SessionManager` 与 `config.rs` 都缺少跨进程写入锁；存在并发覆盖风险。
- `App.tsx` 事件监听注册存在异步 cleanup 竞态，卸载早于 `await listen` 完成时会泄漏。
- `App.tsx` 并非“全量订阅 store”，仅订阅必要字段；但 `key={activeTab}` 强制 remount 问题成立。

### 2.2 Tauri 命令签名基线（以当前代码为准）

以下签名是后续 `tauri-ipc` 类型映射唯一真源（source of truth）：

- `set_preferred_terminal(terminal_type: TerminalType)`
- `sync_jetbrains_projects() -> Result<Vec<JetBrainsProject>, String>`
- `save_settings(app: AppHandle, settings: DesktopSettings)`
- `load_from_remote(url: String, secret: String) -> Result<LoadResult, String>`
- `get_cron_task_runs(task_id: String)`
- `retry_cron_task(id: String, app: AppHandle)`

注：前端参数名可保持 camelCase（Tauri 参数映射），但命令名和参数语义必须与 Rust 定义严格一致。

---

## 3. 问题清单（最终版）

## P0（数据正确性 / 安全 / 数据丢失）

1. CLI 配置路径不一致，`remote.ts` 写入路径与主流程不一致。
2. `usage.ts` 使用 `__dirname`，ESM 运行时不安全。
3. `load_from_remote` 成功语义错误（返回“全量”而非“本次导入结果”）。
4. `set_current_env` / `launch_claude_code` 对环境存在性校验不足。
5. Tauri 安全边界过宽（`shell:allow-execute` + `csp: null`）。
6. `EnvironmentDialog` server 粘贴输入框 `value=""` 硬编码。
7. `session.rs` 与 `config.rs` 并发写入竞态，可能数据覆盖丢失。
8. `App.tsx` 事件监听器异步注册泄漏。
9. Server 用 query 参数传密钥，密钥可能进入 URL/日志链路。
10. CLI launcher 使用 `shell: true`，存在不必要 shell 注入面。

## P1（架构 / 可维护性 / 工程质量）

11. `key={activeTab}` 导致强制 remount 与副作用重复。
12. loading 状态管理失真。
13. Skills `forceMount` 导致无效页面常驻。
14. History 深拷贝实现低效且脆弱。
15. Cron 轮询与状态同步模型可维护性差。
16. CLI skills 仍存在 `execSync` + 字符串命令拼接链路。
17. 本地“加密”策略强度不足（固定密码/盐路线）。
18. Server 安全加固与审计能力不足。
19. CLI React 19 / Desktop React 18 大版本分裂。
20. Rust 热路径存在不必要 `clone`。
21. CLI 缺少 `engines.node` 声明。
22. 超大文件（>500 行）清单不完整且未纳入治理。
23. Desktop 缺少 ErrorBoundary。
24. CI 缺少 i18n key 一致性校验。
25. TS strict 下仍有 `as any` 绕过（2 处）。
26. Zustand 单一巨型 store（God Store）需拆分或瘦身。
27. Cron 命令构造链路需要纳入安全审计。

---

## 4. 分阶段实施计划（按依赖顺序）

## Step 0：基线与门禁先行

目标：冻结当前行为、建立重构护栏。

实施项：

- 补齐并固化基础命令：
  - `pnpm -r test:run`
  - `pnpm -r build`
  - `cd apps/desktop/src-tauri && cargo test`
- 在 CI 中预埋两个门禁（先可 warning，后强制）：
  - i18n key 一致性检查（`zh.json` vs `en.json`）
  - 单文件行数门禁（>500 行需豁免）
- 为 P0 高风险点先补“失败即红”的回归测试骨架。

完成标准：

- 所有后续步骤都必须在同一套门禁下执行并通过。

---

## Step 1a：Stop-the-bleeding（确定性止血）

目标：先修数据正确性与高危安全，避免继续出错。

覆盖：P0 #1 #3 #4 #6 #9 #10

实施项：

1. 统一 CLI 配置路径（`remote.ts` 对齐 `getCcemConfigDir()`）。
2. 修复 `load_from_remote` 返回语义，返回“本次导入结果”。
3. 为 `set_current_env` / `launch_claude_code` 增加强校验与错误返回。
4. 修复 `EnvironmentDialog` 的 `value=""` 硬编码。
5. Server 改为 `Authorization` 或 `X-CCEM-Key` header 传密钥：
   - 迁移窗口内兼容 query + header；
   - 下个发布窗口移除 query。
6. `apps/cli/src/launcher.ts` 改为 `shell: false`，直接执行二进制。

测试要求（最少）：

- CLI/Server 互通测试：header 路径成功，query 路径兼容且有 deprecation 提示。
- launcher 参数包含空格/特殊字符路径时不被 shell 解释。
- 环境不存在时，桌面端启动命令稳定报错，不进入未知状态。

完成标准：

- P0 止血项可复现、可回归、可观测。

---

## Step 1b：Stop-the-bleeding（安全边界与运行时）

目标：收口能力边界，修复运行时兼容风险。

覆盖：P0 #2 #5

实施项：

1. `usage.ts` 改 ESM 兼容路径解析（`import.meta.url`）。
2. 收紧 Tauri shell capability 白名单（禁止泛化执行）。
3. 启用 CSP（禁止 `null`），按实际资源最小放行。

测试要求：

- CLI ESM 运行与打包测试。
- Tauri 功能回归：白名单内可用、白名单外被拒绝。
- WebView 前端资源与 CSP 兼容性验证。

完成标准：

- 安全边界收口后，核心用户流程不退化。

---

## Step 2：并发安全与配置完整性（前置于架构重构）

目标：先解决“数据丢失级”问题。

覆盖：P0 #7

实施项：

1. `config.rs` 读写引入跨进程文件锁（`flock`/`fs2` 二选一，推荐 `fs2`）。
2. `session.rs` 改造为原子写入路径：
   - 锁内完成读取-修改-持久化快照，避免“锁外 save 覆盖”。
   - 落盘采用“临时文件 + rename”保证原子替换。
3. 为 CLI + Desktop 并发读写增加集成测试。

测试要求：

- 并发压测：同时触发 add/update/remove，不丢条目、不回滚。
- 故障注入：中途 kill 进程后文件结构仍可恢复读取。

完成标准：

- “并发运行不丢配置/会话”成为可重复验证结论。

---

## Step 3：Rust 序列化与 IPC 契约统一

目标：建立稳定、可类型化、可迁移的前后端契约。

覆盖：P0 #3（残留）、P1 #20（部分）

实施项：

1. `Session` 使用逐字段 `rename + alias`（兼容旧 `sessions.json` 的 snake_case）。
2. `TerminalInfo` 在 `terminal.rs` 上补 `rename_all = "camelCase"`（若决定统一输出）。
3. 新建 `apps/desktop/src/lib/tauri-ipc.ts`，命令映射以真实签名为准：
   - `save_settings: [{ settings: DesktopSettings }, void]`
   - `set_preferred_terminal: [{ terminalType: TerminalType }, void]`
   - `sync_jetbrains_projects: [void, JetBrainsProject[]]`
   - `load_from_remote: [{ url: string; secret: string }, LoadResult]`
   - `get_cron_task_runs: [{ taskId: string }, CronTaskRun[]]`
   - `retry_cron_task: [{ id: string }, void]`
4. 禁止引入全局“自动 key 转换”黑盒函数。

测试要求：

- Rust serde 回归测试（序列化 camelCase、反序列化兼容 snake_case）。
- TypeScript 类型测试：错误命令名/错误 payload 在编译期失败。

完成标准：

- IPC 契约可由类型系统约束，不靠运行时猜测。

---

## Step 4a：前端稳定性修复（纯 bug 修复）

目标：消除已知崩溃/泄漏/重复渲染问题。

覆盖：P0 #8，P1 #11 #13 #23 #25

实施项：

1. 去掉 `key={activeTab}` 强制 remount。
2. 清理 `forceMount` 非必要场景。
3. 修复 `useTauriEvents`/`App.tsx` 监听器异步清理竞态。
4. 修复两处 `as any`（改类型守卫或补正确类型定义）。
5. 增加应用级与页面级 ErrorBoundary。

测试要求：

- tab 切换不重置本地状态。
- 页面抛错被边界拦截并展示可恢复 UI。
- 挂载/卸载循环后监听器数量稳定。

完成标准：

- Desktop 连续运行 >1h 无明显监听器泄漏趋势。

---

## Step 4b：前端数据层重构（Query 化 + Store 瘦身）

目标：将 server state 从巨型 Zustand 中剥离。

覆盖：P1 #12 #15 #24 #26

实施项：

1. 引入 TanStack Query v5 管理 server state：
   - environments / sessions / app config / cron / skills / analytics
2. 新建 `useTauriActions`，承接纯命令式调用（无缓存语义）。
3. Zustand 只保留 UI/运行时瞬态状态；拆分为 domain store：
   - `uiStore`（tab、dialog、临时输入）
   - `runtimeStore`（运行时 permission 之类）
4. 事件驱动 invalidation：
   - 必含：`env-changed`、`perm-changed`、`tray-launch-claude`
   - session：`session-updated`、`session-interrupted`、`task-completed`、`task-error`
   - cron：`cron-task-started`、`cron-task-completed`、`cron-task-failed`
   - skills：`skill-install-done`、`skill-uninstall-done`
   - 明确不使用不存在事件 `session-stopped`

测试要求：

- hooks 单测 + 关键页面集成测试。
- 事件触发后 query 缓存正确失效。

完成标准：

- server state 迁移完成，store 不再承担后端数据缓存职责。

---

## Step 4c：路由与包体优化

目标：在稳定数据层后做体积与首屏优化。

覆盖：P1 #22（部分）

实施项：

1. 路由级懒加载（重页面优先：History / Analytics / CronTasks）。
2. 拆分重组件，减少初始包体。
3. 校验 Vite target 配置与平台兼容逻辑。

测试要求：

- 桌面冷启动性能对比。
- 功能回归不受懒加载影响。

完成标准：

- 首屏与交互指标稳定改善，无功能回退。

---

## Step 5：CLI 架构与安全重构

目标：CLI 具备长期可维护结构，并继续收口命令执行风险。

覆盖：P1 #16 #21

实施项：

1. `index.ts` 拆分为命令模块与应用服务层。
2. 去掉库函数内 `process.exit`，统一错误类型和退出码。
3. `package.json` 增加 `engines.node` 并在启动时做版本检查。
4. skills 下载链路减少 `execSync` 与字符串命令拼接。

测试要求：

- 命令行为回归测试（成功/失败/异常分支）。
- 非 18+ Node 版本给出明确错误提示。

完成标准：

- CLI 层次清晰，命令逻辑可单测。

---

## Step 6：Server 与 Cron 安全深化

目标：从“止血”升级到“可审计、可防御”。

覆盖：P1 #18 #27

实施项：

1. Server：
   - 移除日志中的敏感信息；
   - 引入鉴权失败审计字段（不泄漏 secret）；
   - 强化输入校验与限流策略测试。
2. Cron：
   - 全面审计命令构造与执行参数；
   - 明确允许命令边界与拒绝策略。

测试要求：

- 关键攻击面单测/集成测（注入、绕过、日志泄漏）。

完成标准：

- 关键安全路径有自动化测试与审计日志支持。

---

## Step 7：工程卫生与架构债务清理

目标：把“能跑”升级为“可持续维护”。

覆盖：P1 #19 #20 #22 #24 #25

实施项：

1. React 版本策略统一（明确 monorepo 允许/禁止的大版本并存规则）。
2. Rust 热路径减少不必要克隆（以 profiling 数据驱动）。
3. 超大文件治理（>500 行）：
   - 列出完整清单；
   - 拆分或出具豁免说明。
4. 继续清理类型绕过与隐式 `any`。

测试要求：

- 性能回归基准（session/cron 场景）。
- 文件拆分后行为回归。

完成标准：

- 超大文件与类型绕过有明确收敛趋势并可验证。

---

## Step 8：CI 门禁与存量补测

目标：把规则固化为自动化，不依赖人工记忆。

覆盖：全局

实施项：

1. CI 强制门禁：
   - Typecheck
   - Unit/Integration tests
   - Build（CLI + Desktop）
   - Cargo tests
   - i18n key 一致性
   - 文件大小门禁
2. 依赖卫生检查：
   - 无大版本冲突
   - 无已知高危 CVE
3. 存量薄弱区域补测（优先 session/config/remote/security）。

完成标准：

- 主分支合并前自动拦截质量退化。

---

## 5. 关键实施细则

### 5.1 `tauri-ipc` 契约生成规则

- 只收录当前分支真实存在的 command。
- 每新增/修改一个 command，必须同时更新：
  - `src-tauri` command 定义
  - `src/lib/tauri-ipc.ts` 类型映射
  - 对应 hook/action
  - 回归测试

### 5.2 监听器泄漏修复模式

- 所有 `listen()` 注册必须可取消。
- `useEffect` 内异步 setup 必须有 `cancelled` 标志保护。
- cleanup 时仅调用已注册成功的 unlisten 函数。

### 5.3 并发写入保护模式

- 文件级锁 + 原子写（tmp + rename）。
- 禁止“先解锁再写盘再加锁”的跨临界区流程。
- 对失败路径进行可恢复设计（回滚/重试/告警）。

---

## 6. 验收门槛（必须全部满足）

1. 数据正确性：CLI 与 Desktop 配置路径完全一致，无“双写双读分叉”。
2. 远程加载语义正确：返回值仅包含本次导入结果。
3. 安全边界：无 query 传密钥；`shell: true` 从 launcher 移除；Tauri shell 权限最小化。
4. 并发安全：CLI 与 Desktop 同时运行时配置/会话不丢失（集成测试覆盖）。
5. 运行稳定性：Desktop 连续运行 >1h 无监听器泄漏趋势（heap 快照验证）。
6. 错误恢复：所有页面受 ErrorBoundary 保护，崩溃后可恢复或给出明确提示。
7. i18n 完整性：`zh.json` / `en.json` key 100% 匹配，无新增硬编码字符串。
8. 类型安全：移除已知 `as any` 绕过，新增类型绕过必须有豁免说明。
9. 架构目标：server state 由 TanStack Query 管理，Zustand 不再承载后端缓存。
10. 文件治理：单文件不超过 500 行，超限必须有拆分计划或豁免理由。
11. 依赖卫生：无未解释的大版本冲突、无已知高危 CVE。
12. CI 门禁：上述规则在 CI 中自动执行并阻断回归。

---

## 7. 执行顺序（不可打乱）

1. Step 0（门禁）
2. Step 1a（确定性止血）
3. Step 1b（安全边界/运行时）
4. Step 2（并发安全）
5. Step 3（序列化与 IPC 契约）
6. Step 4a（前端稳定性）
7. Step 4b（数据层重构）
8. Step 4c（性能与包体）
9. Step 5（CLI 架构）
10. Step 6（Server/Cron 安全深化）
11. Step 7（工程卫生）
12. Step 8（CI 固化与补测）

---

## 8. 风险与回滚策略

- 高风险改动（权限模型、配置写入、序列化格式）必须 feature flag 或分阶段发布。
- 对磁盘格式变更（`sessions.json` / config）提供迁移与回滚脚本。
- 任一步骤若触发关键回归，立即回滚该步骤并保留测试资产。

---

## 9. 本文档维护规则

- 任何实施偏差必须先更新本文件，再执行代码改动。
- 若真实代码签名变化，本文件 24 小时内同步更新。
- 文档中的命令示例必须在当前分支可执行；不可执行片段禁止保留。
