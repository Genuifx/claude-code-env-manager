# CCEM 全仓重构设计（质量优先）

> 日期：2026-03-01
> 基于：`2026-02-28-whole-repo-refactor-plan-quality-first.md` + FINAL_DELIVERY v2.1 补充
> 原则：不考虑工期，只考虑"是否做对"

---

## 基本原则

- 不考虑重构工期，只考虑"是否做对"。
- 审查方法采用"大胆假设，小心求证"：所有问题必须有代码证据，所有争议点必须标注"成立/不成立/部分成立"。
- 先修数据正确性与安全边界，再做架构升级与体验优化。
- 每一步提交必须带测试；新增/修改代码对应测试覆盖率不低于 80%。

## 当前基线（已验证）

- `pnpm test:coverage` 通过；`@ccem/core` 覆盖率约 83%，`apps/cli` 总覆盖率约 14.75%。
- `pnpm --filter @ccem/desktop build` 通过；主包 `index-*.js` 约 1.86MB（gzip 约 576KB）。
- `cargo test`（desktop tauri）通过；16 个测试，存在未使用代码告警。

---

## 第一部分：问题清单

### P0（数据正确性 + 高危安全）

| # | 问题 | 证据 |
|---|------|------|
| 1 | CLI 配置路径不一致，`ccem load` 可能写到旧路径而主 CLI 读新路径 | `apps/cli/src/index.ts:63`, `apps/cli/src/remote.ts:7` |
| 2 | ESM 运行时隐患：`usage.ts` 使用 `__dirname`，但 CLI 仅打 ESM | `apps/cli/src/usage.ts:46`, `apps/cli/tsup.config.ts:5` |
| 3 | Desktop 远程加载返回语义错误：CLI 分支成功时返回"全量环境"而非"本次导入结果" | `src-tauri/src/main.rs:798`, `src-tauri/src/main.rs:805` |
| 4 | 环境状态不校验：可写入不存在的 `current env`，启动流程对 `env_name` 缺少强校验 | `src-tauri/src/main.rs:75`, `src-tauri/src/main.rs:244` |
| 5 | 安全边界过宽：Tauri 开放通用 `shell:allow-execute` 且 CSP 关闭 | `src-tauri/capabilities/default.json:9`, `src-tauri/tauri.conf.json:31` |
| 6 | 环境对话框"粘贴命令输入框"被写死 `value=""`，无法输入 | `src/components/EnvironmentDialog.tsx:337` |
| 7 | 会话与配置存在并发写入竞态，可能导致后写覆盖先写（数据丢失） | `src-tauri/src/session.rs:71,92`, `src-tauri/src/config.rs:160,174` |
| 8 | `App.tsx` 事件监听器注册存在异步清理漏洞，组件提前卸载时会泄漏监听 | `src/App.tsx:58`, `src/App.tsx:82` |
| 9 | Server 使用 query 参数传密钥，密钥会进入 URL 及代理/访问日志链路 | `server/index.js:103` |
| 10 | CLI launcher 使用 `shell: true` 启动 `claude`，存在不必要 shell 解析面 | `apps/cli/src/launcher.ts:116,118` |

### P1（架构 + 工程质量）

| # | 问题 | 证据 |
|---|------|------|
| 11 | `key={activeTab}` 强制 remount 导致重复副作用和状态重置 | `src/App.tsx:22,265` |
| 12 | Loading 设计失效：domain loading flags 从未被正确驱动 | `src/store/index.ts:161`, `src/hooks/useTauriCommands.ts:79` |
| 13 | Skills 页双 tab `forceMount`，无效页面持续挂载 | `src/pages/Skills.tsx:25` |
| 14 | History 消息合并使用 `JSON.parse(JSON.stringify(...))` 深拷贝 | `src/pages/History.tsx:39` |
| 15 | Cron 运行态轮询与 store 访问模式不稳定 | `src/pages/CronTasks.tsx:223,227` |
| 16 | CLI skills 安装链路仍有 shell 拼接/`execSync`/`process.exit` | `apps/cli/src/skills.ts:40,211` |
| 17 | 本地"加密"是固定密码+固定盐可逆方案，本质是弱保护 | `packages/core/src/utils.ts:7`, `src-tauri/src/crypto.rs:8` |
| 18 | Server 启动日志打印 secret、缺少鉴权审计层与测试基线 | `server/index.js:166,101` |
| 19 | CLI/Desktop React 主版本分叉（CLI React 19，Desktop React 18） | `apps/cli/package.json:38`, `apps/desktop/package.json:26` |
| 20 | Rust 热路径存在不必要整体克隆，随会话规模增长放大轮询成本 | `src-tauri/src/session.rs:73,115` |
| 21 | CLI 未声明 `engines.node`，与 `tsup target=node18` 约束脱节 | `apps/cli/tsup.config.ts:7` |
| 22 | 12 个 >500 行超大文件尚未纳入拆分计划 | `index.ts`, `terminal.rs`, `main.rs`, `cron.rs`, `ui.ts` 等 |
| 23 | Desktop 缺少应用级/页面级 ErrorBoundary | `src/main.tsx:6` |
| 24 | CI 无 i18n key 一致性校验步骤 | `src/locales/zh.json`, `src/locales/en.json` |
| 25 | TypeScript 严格模式被 `as any` 绕过（2 处） | `src/App.tsx:73`, `src/components/analytics/ModelDistribution.tsx:81` |
| 26 | Zustand 单一巨型 store 承载过多领域状态 | `src/store/index.ts:93` |
| 27 | Cron 命令执行链路需要纳入安全审计基线 | `src-tauri/src/cron.rs:390,796` |

### 补充问题（源自 FINAL_DELIVERY v2.1 审查）

| # | 问题 | 严重度 | 说明 |
|---|------|--------|------|
| 28 | Tray 菜单与主窗口状态不同步 | P1 | 前端修改环境/权限后 tray 菜单不更新，必须重启 app |

---

## 第二部分：目标架构

### 全仓层级

```
packages/core           → 纯业务模型与规则，不含 Node/Tauri IO
packages/config-runtime → 统一配置仓储：迁移、锁、加密、序列化策略（新增）
apps/cli                → 命令路由 + 应用服务 + 基础设施三层
apps/desktop/src        → 视图层 + TanStack Query 数据层（无 Zustand）
apps/desktop/src-tauri  → 按领域拆分 command：env/session/cron/skills/settings/analytics/remote
server                  → 可配置、可测试、可观测服务
```

### Desktop 前端数据层设计

**核心决策：TanStack Query 全量接管，不引入 Zustand。**

所有通过 IPC 获取的数据都是 server state，由 TanStack Query 管理。当前分支关键状态的实际归属：

| 原 Zustand 状态 | 实际来源 | 正确方案 |
|-----------------|---------|---------|
| `permissionMode` | `get_settings` 返回 `defaultMode` + `perm-changed` 事件（运行时切换） | `useSettings()` query + 轻量运行时状态（事件驱动） |
| `preferredTerminal` | `get_preferred_terminal` / `set_preferred_terminal` IPC | `usePreferredTerminal()` query + mutation |
| `locale` | `localStorage` + Context | 维持现有 `LocaleProvider` |
| `selectedWorkingDir` | 用户瞬态选择 + `get_default_working_dir` 默认值 | 默认值用 query，当前选择用组件内 `useState` |

### TanStack Query 缓存策略

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,           // 本地 IPC <5ms，数据永不过期
      gcTime: 10 * 60 * 1000,        // 10 分钟后清理未使用缓存
      refetchOnWindowFocus: false,   // Tauri 自定义标题栏，focus 事件不可靠
      retry: 1,                      // 本地 IPC 失败重试 1 次即可
    },
  },
});
```

**策略论证**：

- **`staleTime: Infinity`**：数据来自本地 Rust 后端（<5ms），不是远端 API。数据永不"过期"，只通过显式 `invalidateQueries` 刷新。
- **`refetchOnWindowFocus: false`**：Tauri 使用 `titleBarStyle: "Overlay"` + `transparent: true` 自定义标题栏，macOS 的 `focus` 事件行为与标准浏览器不同，需要真机验证。Plan B：用 Tauri 的 `window.onFocusChanged` 事件手动触发 invalidation。
- **乐观更新**：本地 IPC <5ms，乐观更新的收益极低。仅对 `toggleCronTask`（UI 开关需要即时反馈）保留乐观更新，其余 8 个 mutation 使用简单的 `await + invalidate` 模式。

### 事件驱动的缓存失效

`staleTime: Infinity` 要求所有数据刷新都通过事件驱动 `invalidateQueries`。完整映射表：

| 后端事件 | 触发时机 | invalidate 的 queryKey |
|---------|---------|----------------------|
| `env-changed` | Tray 切换环境 | `['environments']`, `['current-env']`, `['sessions']` |
| `perm-changed` | Tray 切换权限 | `['settings']` + 运行时权限状态 |
| `tray-launch-claude` | Tray 启动 Claude | `['sessions']` |
| `session-updated` | Session 状态变化 | `['sessions']` |
| `session-interrupted` | Session 异常中断 | `['sessions']` |
| `task-completed` | Session 任务完成 | `['sessions']` |
| `task-error` | Session 任务出错 | `['sessions']` |
| `cron-task-started` | Cron 任务开始 | `['cron-tasks']`, `['cron-runs']` |
| `cron-task-completed` | Cron 任务完成 | `['cron-tasks']`, `['cron-runs']` |
| `cron-task-failed` | Cron 任务失败 | `['cron-tasks']`, `['cron-runs']` |

Mutation 的 `onSuccess` 回调中也触发对应 invalidation（如 `useAddEnvironment` 成功后 invalidate `['environments']`）。

### IPC 调用分类

| 类型 | 数量 | 管理方式 |
|------|------|---------|
| Queries（读取 server state） | ~15 | TanStack Query `useQuery` hooks |
| Mutations（修改 server state） | ~8 | TanStack Query `useMutation` hooks |
| Actions（imperative 操作，无缓存语义） | ~15 | 独立 `useTauriActions` hook |

Actions 包括：`openDirectoryDialog`、`focusSession`、`minimizeSession`、`closeSession`、`arrangeSessions`、`searchSkillsStream`（流式）、`syncVscodeProjects`、`syncJetbrainsProjects` 等。这些是纯命令式操作，没有"缓存→失效"的语义，不适合 TanStack Query。

### Rust 端序列化策略

**关键陷阱：磁盘持久化数据的向后兼容**

`Session` struct 既用于 IPC 响应，也用于 `sessions.json` 磁盘持久化（历史数据是 snake_case）。直接用 `#[serde(rename_all = "camelCase")]` 会导致旧数据无法反序列化。

**正确做法——逐字段 rename + alias**：

```rust
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Session {
    pub id: String,

    #[serde(rename = "envName", alias = "env_name")]
    pub env_name: String,

    #[serde(rename = "workingDir", alias = "working_dir")]
    pub working_dir: Option<String>,

    #[serde(rename = "startTime", alias = "start_time")]
    pub start_time: String,

    // ... 所有多词字段同理
}
```

- `rename`：序列化输出 camelCase（给前端）
- `alias`：反序列化时同时接受 snake_case（读旧 `sessions.json`）
- 强制适用 struct：`Session`（磁盘持久化）
- 条件适用 struct：仅当历史客户端/存量数据存在字段命名差异时，才对其他 IPC struct（如 `LoadResult`）加 alias

**对于仅用于 IPC 响应、不做磁盘持久化的 struct**（如 `TerminalInfo`、`AppConfig`），可以直接用 `#[serde(rename_all = "camelCase")]`。

**审计命令**（仅审计 IPC 对外结构体与持久化结构体，不要求所有 Serialize 都 rename）：

```bash
rg '#\[derive.*Serialize' apps/desktop/src-tauri/src/ -A 5 | rg -v 'rename_all|rename ='
# 输出应为空
```

**前端字段转换策略**：当前分支未引入 `transformKeys` 全量递归转换，后续也不应引入类似全局自动转换；字段命名兼容应在 Rust 端通过 serde 明确定义，避免黑盒转换破坏 `ANTHROPIC_BASE_URL` 等大写常量字段。

### Tray 菜单同步

前端修改环境/权限后，Tray 菜单不更新。修复方式：在实际存在的 Tauri command 处理函数末尾调用 `tray::rebuild_tray_menu(&app)`：

- `set_current_env`
- `add_environment`
- `update_environment`
- `delete_environment`
- `save_settings`（当 `defaultMode` 发生变化时）

增加防抖逻辑（300ms 内多次调用只重建一次），避免批量操作时频繁重建。

---

## 第三部分：执行计划（按依赖顺序）

### 全局门禁（所有步骤前置条件）

- 每步提交必须带测试；新增/修改代码覆盖率 ≥80%。
- 未通过 typecheck/test/build/cargo test 的变更不得合并。
- 对外行为变化必须有迁移说明与回归用例。
- CI 强制 i18n key 一致性检查与单文件行数门禁（>500 行需豁免单）。

### Step 1a: Stop-the-bleeding（数据正确性与高危安全）

修复 P0 #1-6, #9-10。

- 统一 CLI/remote 配置路径
- 修复 `load_from_remote` 返回语义
- 修复 `EnvironmentDialog` 输入框
- `set_current_env`/`launch_claude_code` 增加强校验
- Server 改为 header 传密钥（迁移期同时兼容 query+header，一个发布窗口后移除 query）
- `launcher.ts` 改为 `shell: false`
- **完成标准**：数据正确性与高危安全类 P0 可复现可回归，且回归用例稳定通过。

### Step 1b: Stop-the-bleeding（安全边界与运行时）

修复 P0 #5, #2。

- 收紧 shell 能力白名单
- 启用 CSP
- 修复 ESM `__dirname` 问题
- **完成标准**：权限模型与运行时兼容回归通过。

### Step 2: Config/Secret 重构（含并发安全）

修复 P0 #7。

- 抽出统一配置仓储接口
- 引入跨进程文件锁（`flock`/`fs2`）
- `session` 读改写改为原子事务（锁内完成快照与写入）
- 敏感字段升级为 Keychain 引用或版本化 KDF 密文
- **完成标准**：CLI 与 Desktop 同时运行时配置/会话不丢失；迁移逻辑单点、可回滚、可观测。

### Step 3: CLI 架构拆分

修复 P1 #16, #21。

- `index.ts` 拆为命令模块（env/perms/setup/skill/usage/remote/launch）
- 去除库函数内 `process.exit`，改 typed error + 统一退出码处理
- 补 `engines.node` 与启动期版本检查
- **完成标准**：`index.ts` 仅 orchestrator 职责；命令层可单测。

### Step 4a: Desktop 前端稳定性修复

修复 P0 #8, P1 #11, #13。

- 去掉 `key={activeTab}`，改为条件渲染或 CSS display 切换（保留页面状态）
- 清理 `forceMount` 场景
- 修复事件监听器泄漏（异步 `listen()` 的 cleanup 竞态）
- 收敛副作用生命周期
- **完成标准**：切 tab 不重置页面本地状态、不重复注册监听、内存曲线稳定。

### Step 4b: Desktop 数据层重构

修复 P1 #12, #15, #25, #26, #28。

- 引入 TanStack Query 托管所有 IPC 异步数据
- **完全移除 Zustand**（所有状态归入 query 结果、Context 或组件 useState）
- 实现事件→Query invalidation 完整映射（10 个后端事件）
- 实现 `useTauriActions` hook 保留 15 个 imperative actions
- 补应用级与页面级 ErrorBoundary
- 移除 `as any` 绕过并补类型守卫
- Tray 菜单同步修复（5 个 command + rebuild_tray_menu）
- **完成标准**：异步状态统一可观测；崩溃可隔离可恢复；类型检查无 `as any` 新增；Tray 与主窗口状态一致。

### Step 4c: Desktop 包体积与加载策略优化

- 路由/页面懒加载（`React.lazy`）
- 重依赖分包、按功能拆 chunk
- 首屏路径做预算约束
- **完成标准**：首屏 JS 明显下降并有预算门禁。

### Step 5: Tauri 后端模块化

修复 P1 #22（main.rs 超大文件）。

- 拆分 `main.rs` 为领域模块
- 统一 command DTO 与错误码
- Rust 端 serde 序列化统一（含向后兼容：逐字段 rename + alias）
- `TerminalInfo` 等仅 IPC 的 struct 直接 `rename_all = "camelCase"`
- **`Session` 必须用逐字段 alias 保证旧数据可读；其他 struct 仅在存在历史兼容需求时加 alias**
- 系统命令调用抽到 adapter
- 输入校验与审计日志标准化
- **完成标准**：`main.rs` 仅初始化与装配；领域逻辑可单测、可追踪；序列化兼容契约测试通过。

### Step 6: Cron/Session 稳定性重构

修复 P1 #15, #20, #27。

- 统一任务执行器与生命周期管理
- 替换手写轮询为可取消任务
- 会话状态机明确化（running/stopped/interrupted/error）
- Rust 热路径 clone 优化
- **完成标准**：无孤儿 interval/thread；异常恢复、重试、幂等等关键路径可测。

### Step 7: Skills 与外部命令执行安全化

修复 P1 #16, #27。

- 从字符串拼接改为参数数组执行
- 限制命令集合
- 统一 PATH 解析与缓存
- stdout/stderr 结构化
- 补做 `cron.rs` 命令构造链路安全审计（含 shell 参与点）
- **完成标准**：不再出现 `execSync("...${userInput}...")` 模式。

### Step 8: Server 升级

修复 P1 #18。

- 输入 schema 校验
- 鉴权/审计中间层
- 敏感信息禁打日志
- 补测试与健康指标
- **完成标准**：通过基础安全审计，具备最小生产可用性。

### Step 9: 质量基建与存量补测

修复 P1 #19, #22, #24。

- 建立 monorepo 统一 CI：typecheck、test、coverage、build、cargo test、clippy、依赖审计
- i18n key 一致性检查
- 单文件行数门禁
- 补存量高风险模块测试
- **完成标准**：各包测试门禁常态化；历史债务有豁免清单与清偿计划。

### Step 10: 文档交付

- 新增 `docs/desktop-2.0/` 与 `docs/architecture/`
- 覆盖：架构图、数据流、命令协议、迁移说明、故障排查
- 更新 `CLAUDE.md` 反映新架构
- **完成标准**：新成员可仅凭文档完成启动、调试、发布与故障定位。

---

## 第四部分：强制验收门槛

以下 13 条必须全部满足：

1. **正确性**：所有 P0 缺陷 100% 关闭，且有回归测试。
2. **并发安全**：CLI 与 Desktop 同时运行的集成测试中，配置与会话数据不丢失、不回滚。
3. **安全性**：去除高风险通用执行权限或最小化到白名单；敏感信息不明文日志。
4. **内存稳定性**：Desktop 连续运行 >1h，监听器数量与堆内存无持续增长趋势。
5. **依赖卫生**：无大版本冲突导致的运行风险；无已知高危/严重 CVE。
6. **性能**：Desktop 首屏包显著下降并启用按页/按功能分包；高频路径有基准对比。
7. **可维护性**：超大文件拆解完成并受行数门禁约束（>500 行需要豁免理由）。
8. **测试体系**：CLI/Core/Desktop/Tauri/Server 均有可执行测试基线，CI 常态化。
9. **错误恢复**：关键页面具备 ErrorBoundary 保护，异常时可恢复或给出明确提示。
10. **i18n 完整性**：`zh/en` locale key 100% 匹配，并有 CI 自动校验。
11. **文件大小约束**：单文件不超过 500 行，超限文件有拆分计划或豁免单。
12. **序列化兼容**：旧 `sessions.json`（snake_case）在升级后可正常读取（serde alias 验证）。
13. **Tray 一致性**：主窗口任何环境/权限修改后，tray 菜单立即反映变化。

---

## 第五部分：核验记录

### 已确认不成立的问题

- Vite 构建目标"逻辑反转"不成立：当前 windows 使用 `chrome105`，其他平台使用 `safari13`。证据: `apps/desktop/vite.config.ts:19`
- i18n key 不一致不成立：当前 `zh/en` 各 421 个 key，完全一致。规划新增的是"防回归门禁"。

### 从 FINAL_DELIVERY v2.1 补充的 4 个问题

| # | 内容 | 整合位置 |
|---|------|---------|
| 1 | Rust serde 磁盘数据向后兼容（逐字段 rename + alias） | Step 5 + 第二部分序列化策略 + 验收门槛 #12 |
| 2 | Tray 菜单不同步 | P1 #28 + Step 4b + 验收门槛 #13 |
| 3 | TanStack Query 缓存策略论证（staleTime/refetchOnWindowFocus/乐观更新） | 第二部分缓存策略 |
| 4 | 事件→缓存失效完整映射表 | 第二部分事件驱动失效 + Step 4b |
