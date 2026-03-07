# Auth Token + Tier 模型配置迁移设计文档

日期：2026-03-07
适用范围：`packages/core` + `apps/cli` + `apps/desktop` + `apps/desktop/src-tauri` + `server`

---

## 1. 背景

当前环境配置仍基于旧字段：

1. 鉴权使用 `ANTHROPIC_API_KEY`
2. 模型使用 `ANTHROPIC_MODEL`
3. 轻量模型使用 `ANTHROPIC_SMALL_FAST_MODEL`

这套结构已经落后于当前 Claude Code 官方推荐的配置方式。最新推荐做法是：

1. 鉴权以 `ANTHROPIC_AUTH_TOKEN` 为主
2. 模型 tier 通过 `ANTHROPIC_DEFAULT_OPUS_MODEL`
3. 模型 tier 通过 `ANTHROPIC_DEFAULT_SONNET_MODEL`
4. 模型 tier 通过 `ANTHROPIC_DEFAULT_HAIKU_MODEL`
5. 运行时模型入口继续使用 `ANTHROPIC_MODEL`
6. 高级用户可额外配置 `CLAUDE_CODE_SUBAGENT_MODEL`

---

## 2. 目标

1. 在 CLI 和 desktop 中统一切换到 `ANTHROPIC_AUTH_TOKEN`
2. 将环境模型配置升级为 tier-based 结构
3. 自动迁移用户已有配置，不要求手工重建环境
4. 扩充主流 preset，并让 preset 直接生成新结构
5. 保持 UI 默认简单，高级配置可展开

---

## 3. 范围

### 3.1 范围内

1. `EnvConfig` 字段升级
2. preset 结构升级
3. CLI 配置读写、导出、启动链路升级
4. desktop 前端环境表单、展示和 IPC 升级
5. Tauri Rust 配置落盘、启动链路、remote import 升级
6. README 和 `server/environments.json` 示例升级

### 3.2 非范围

1. 不引入 Bedrock / Vertex 专用认证变量
2. 不支持双写新旧字段
3. 不保留旧 UI 文案中的 `API Key`

---

## 4. 新环境配置契约

### 4.1 新持久化字段

环境配置统一改为以下字段：

1. `ANTHROPIC_BASE_URL`
2. `ANTHROPIC_AUTH_TOKEN`
3. `ANTHROPIC_DEFAULT_OPUS_MODEL`
4. `ANTHROPIC_DEFAULT_SONNET_MODEL`
5. `ANTHROPIC_DEFAULT_HAIKU_MODEL`
6. `ANTHROPIC_MODEL`
7. `CLAUDE_CODE_SUBAGENT_MODEL`

### 4.2 旧字段处理

以下字段不再作为新结构的一部分：

1. `ANTHROPIC_API_KEY`
2. `ANTHROPIC_SMALL_FAST_MODEL`

它们仅在迁移读取时兼容。

### 4.3 运行时约定

1. `ANTHROPIC_MODEL` 默认写入 `opus`
2. `ANTHROPIC_DEFAULT_SONNET_MODEL` 默认与 `ANTHROPIC_DEFAULT_OPUS_MODEL` 相同
3. `CLAUDE_CODE_SUBAGENT_MODEL` 默认留空
4. 新启动链路不再导出 `ANTHROPIC_API_KEY`

---

## 5. 迁移规则

### 5.1 鉴权迁移

1. 旧 `ANTHROPIC_API_KEY` 迁移到 `ANTHROPIC_AUTH_TOKEN`
2. 若新字段已存在，则保留新字段，不覆盖

### 5.2 模型迁移

1. 旧 `ANTHROPIC_MODEL` 同时写入：
   1. `ANTHROPIC_DEFAULT_OPUS_MODEL`
   2. `ANTHROPIC_DEFAULT_SONNET_MODEL`
2. 旧 `ANTHROPIC_SMALL_FAST_MODEL` 写入：
   1. `ANTHROPIC_DEFAULT_HAIKU_MODEL`
3. 若旧配置没有 `ANTHROPIC_MODEL`，则新 `ANTHROPIC_MODEL` 默认写入 `opus`
4. 若旧配置没有 `CLAUDE_CODE_SUBAGENT_MODEL`，保持为空

### 5.3 持久化策略

1. 读取旧配置后，内存中先完成归一化
2. 首次成功读取后自动原子回写新结构
3. 回写后移除旧字段

---

## 6. UI 结构

### 6.1 默认表单

desktop 默认仅展示：

1. Name
2. Base URL
3. Auth Token
4. Default Opus Model
5. Default Haiku Model

### 6.2 高级表单

高级展开中展示：

1. Default Sonnet Model
2. Runtime Model (`ANTHROPIC_MODEL`)
3. Subagent Model (`CLAUDE_CODE_SUBAGENT_MODEL`)

### 6.3 Sonnet 默认行为

1. 新建环境时，Sonnet 字段默认不在基础表单展示
2. 若用户不填写 Sonnet，保存时自动写成与 Opus 相同
3. 不做实时联动，不做双向同步

### 6.4 文案策略

1. 所有 `API Key` 文案改为 `Auth Token`
2. 帮助文案写为 `Paste the provider token or key`
3. `Model` / `Small Model` 文案改成 tier 文案

---

## 7. Preset 设计

### 7.1 设计原则

1. preset 直接生成新结构
2. Sonnet 初始值默认等于 Opus
3. Haiku 使用该厂商可用的较轻量模型
4. `ANTHROPIC_MODEL` 默认写入 `opus`

### 7.2 首批 preset

1. `GLM`
   1. Opus: `glm-5`
   2. Sonnet: `glm-5`
   3. Haiku: `glm-4.5-air`
2. `KIMI`
   1. Opus: `kimi-k2-thinking-turbo`
   2. Sonnet: `kimi-k2-thinking-turbo`
   3. Haiku: `kimi-k2-turbo-preview`
3. `MiniMax`
   1. Opus: `MiniMax-M2.5`
   2. Sonnet: `MiniMax-M2.5`
   3. Haiku: `MiniMax-M2.5-highspeed`
4. `DeepSeek`
   1. Opus: `deepseek-chat`
   2. Sonnet: `deepseek-chat`
   3. Haiku: `deepseek-chat`
5. `阿里云百炼`
   1. Opus: `qwen3-coder-plus`
   2. Sonnet: `qwen3-coder-plus`
   3. Haiku: `qwen3-coder-flash`
6. `阿里云 Coding Plan`
   1. Opus: `qwen3-coder-plus`
   2. Sonnet: `qwen3-coder-plus`
   3. Haiku: `qwen3-coder-plus`
7. `OpenRouter`
   1. Opus: `anthropic/claude-opus-4-1`
   2. Sonnet: `anthropic/claude-opus-4-1`
   3. Haiku: `anthropic/claude-3.5-haiku`

### 7.3 官方默认环境

新装 `official` 默认环境改为：

1. `ANTHROPIC_DEFAULT_OPUS_MODEL=claude-opus-4-1-20250805`
2. `ANTHROPIC_DEFAULT_SONNET_MODEL=claude-opus-4-1-20250805`
3. `ANTHROPIC_DEFAULT_HAIKU_MODEL=claude-3-5-haiku-20241022`
4. `ANTHROPIC_MODEL=opus`

---

## 8. 实现路径

### 8.1 Shared / core

1. 更新 `EnvConfig`
2. 更新 `ENV_PRESETS`
3. 将桌面端硬编码 preset 描述和 token URL 收敛到 shared metadata
4. 更新 preset 测试

### 8.2 CLI

1. 配置读写改为新字段
2. 启动导出改为新字段
3. 交互式新增/编辑表单改为新 UI 结构
4. 环境展示面板改成 Opus / Sonnet / Haiku 视图
5. remote import 兼容旧 payload 并迁移

### 8.3 Desktop

1. 环境 store / IPC 类型升级
2. 环境弹窗改为基础 + 高级模型配置
3. 环境列表和详情展示改为 tier 字段
4. locales 文案升级

### 8.4 Tauri / Rust

1. 配置结构升级
2. 启动时注入新字段
3. cron / skills / session launch 全部切到新字段
4. remote load 兼容旧字段并迁移保存

### 8.5 文档与示例

1. README 样例更新
2. `server/environments.json` 更新
3. 去掉示例中的旧字段名

---

## 9. 测试策略

1. `packages/core` 单测覆盖新 preset 结构
2. CLI 测试覆盖配置迁移和 env 导出
3. remote import 测试覆盖旧 payload -> 新结构
4. desktop / Tauri 手工验证：
   1. 新建环境
   2. 编辑旧环境
   3. 选择 preset 自动填充
   4. 启动 Claude 会话
   5. 运行 cron / skills

---

## 10. 已锁定决策

1. 使用 `ANTHROPIC_AUTH_TOKEN`，不继续保留 `ANTHROPIC_API_KEY` 为新主路径
2. 新模型结构采用 Opus / Sonnet / Haiku tier 变量
3. 默认运行时模型为 `opus`
4. 默认表单显示 Opus + Haiku，Sonnet 放在高级
5. Sonnet 默认等于 Opus
6. 高级表单包含 `ANTHROPIC_MODEL` 和 `CLAUDE_CODE_SUBAGENT_MODEL`
7. 旧 `ANTHROPIC_MODEL` 迁移到 Opus + Sonnet
8. 旧 `ANTHROPIC_SMALL_FAST_MODEL` 迁移到 Haiku
9. `official` 新装默认环境切到真正的 Opus / Haiku 结构
