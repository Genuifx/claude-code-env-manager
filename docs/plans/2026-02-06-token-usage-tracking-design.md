# Token Usage Tracking 设计方案

## 背景

### 问题

当前 ccem 的 token 统计依赖解析 Claude Code 的 JSONL 日志文件，但发现：

1. **从 Claude Code 2.1.19 开始，JSONL 中的 `output_tokens` 全部为 0**
2. 官方 `~/.claude/stats-cache.json` 有准确的 `outputTokens`，但它是实时在内存中累加的，不是从 JSONL 回溯计算
3. 官方 stats-cache 没有按项目维度的统计

### 官方 stats-cache 结构

```json
{
  "dailyActivity": [{ "date": "2026-01-02", "messageCount": 342, "sessionCount": 5, "toolCallCount": 109 }],
  "dailyModelTokens": [{ "date": "2026-01-02", "tokensByModel": { "claude-opus-4-5": 4483882 } }],
  "modelUsage": {
    "claude-opus-4-5": {
      "inputTokens": 125573289,
      "outputTokens": 13955496,
      "cacheReadInputTokens": 0,
      "cacheCreationInputTokens": 0
    }
  }
}
```

- `dailyModelTokens`: 按日期+模型，但只有总 tokens，不区分 input/output/cache
- `modelUsage`: 按模型有完整分类，但没有日期/项目维度

## 方案对比

| 方案 | 数据准确性 | 项目维度 | 日期维度 | 复杂度 | 历史数据 |
|------|------------|----------|----------|--------|----------|
| A. 共享代理 + session token | 完全准确 | ✅ | ✅ | 中 | 仅新数据 |
| B. Token 估算 | 近似 | ✅ | ✅ | 低 | 可回溯 |
| C. 混合方案 | 准确 | 部分 | ✅ | 低 | 可回溯 |

---

## 方案 A: 共享代理 + Session Token

### 原理

在 Claude Code 和 Anthropic API 之间插入一个代理层，拦截所有 API 响应并记录 usage 数据。

```
Claude Code → 共享代理 (localhost:8080) → Anthropic API
                    ↓
              记录 usage 到本地
              (带 session/project/env 信息)
```

### 核心设计

#### 1. Session Token 机制

每个终端窗口通过 URL 参数传递 session 信息：

```bash
# ccem env 输出
export ANTHROPIC_BASE_URL="http://localhost:8080?session=abc123&project=claude-code-env-manager&env=official"
export ANTHROPIC_API_KEY="sk-xxx"
```

代理从 URL 参数提取 session 信息，记录到 usage 日志。

#### 2. 代理服务

```typescript
// src/proxy.ts
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

interface SessionInfo {
  session: string;
  project: string;
  env: string;
}

function parseSessionFromUrl(url: string): SessionInfo | null {
  const params = new URL(url, 'http://localhost').searchParams;
  const session = params.get('session');
  const project = params.get('project');
  const env = params.get('env');
  if (!session || !project || n null;
  return { session, project, env };
}

const app = express();

// 拦截 /v1/messages 请求
app.use('/v1/messages', async (req, res, next) => {
  const sessionInfo = parseSessionFromUrl(req.url);

  // 代理到真实 API
  const targetUrl = process.env.REAL_ANTHROPIC_BASE_URL || 'https://api.anthropic.com';

  // 使用 proxy middleware，但在响应时记录 usage
  // ...
});

app.listen(8080);
```

#### 3. Usage 日志格式

```jsonl
{"timestamp":"2026-02-06T10:00:00Z","session":"abc123","project":"claude-code-env-manager","env":"official","model":"claude-opus-4-5","usage":{"input_tokens":1000,"output_tokens":500,"cache_read_input_tokens":200,"cache_creation_input_tokens":0}}
```

#### 4. ccem env 命令修改

```typescript
// 生成 session token
function generateSessionToken(): string {
  return crypto.randomUUID();
}

// 检测当前项目
function detectProject(): string {
  // 从 cwd 或 git remote 检测
  const cwd = process.cwd();
  return path.basename(cwd);
}

export function getEnvWithProxy(): Record<string, string> {
  const session = generateSessionToken();
  const project = detectProject();
  const env = getCurrentEnv();

  const proxyUrl = `http://localhost:8080?session=${session}&project=${encodeURIComponent(project)}&env=${env}`;

  return {
    ANTHROPIC_BASE_URL: proxyUrl,
    ANTHROPIC_API_KEY: getApiKey(),
    // ...
  };
}
```

#### 5. 代理生命周期管理

**启动方式：**
- `ccem proxy start` - 手动启动代理服务
- `ccem proxy stop` - 停止代理服务
- `ccem proxy status` - 查看代理状态

**或自动管理：**
- `ccem env` 时检查代理是否运行，未运行则自动启动
- 使用 PID 文件 (`~/.ccem/proxy.pid`) 管理进程

### 优点

1. **数据完全准确** - 直接从 API 响应获取
2. **支持任意维度** - session/project/env/model/date 都可以记录
3. **实时记录** - 不需要后处理

### 缺点

1. **需要运行代理服务** - 额外的进程
2. **只能记录新数据** - 历史数据无法回溯
3. **网络延迟** - 多一跳（本地，影响很小）
4. **需要处理代理故障** - 代理挂了会影响 Claude Code

### 实现复杂度

- 代理服务: ~200 行
- ccem 集成: ~100 行
- 总计: ~300 行

---

## 方案 B: Token 估算

### 原理

从 JSONL 中读取 assistant 消息的 `content`，使用 tokenizer 估算 output tokens。

### 核心设计

#### 1. Tokenizer 选择

```typescript
// 使用 tiktoken 或 claude-tokenizer
import { encode } from 'gpt-tokenizer'; // 或其他兼容的 tokenizer

function estimateTokens(text: string): number {
  return encode(text).length;
}
```

#### 2. 从 content 估算 output tokens

```typescript
interface AssistantMessage {
  type: 'assistant';
  message: {
    content: Array<{ type: string; text?: string; input?: object }>;
    usage: { input_tokens: number; output_tokens: number };
  };
}

function estimateOutputTokens(content: AssistantMessage['message']['content']): number {
  let total = 0;

  for (const block of content) {
    if (block.type === 'text' && block.text) {
      total += estimateTokens(block.text);
    } else if (block.type === 'tool_use' && block.input) {
      // tool_use 的 input 也算 output tokens
      total += estimateTokens(JSON.stringify(block.input));
    }
  }

  return total;
}
```

#### 3. 解析 JSONL 时使用估算值

```typescript
async function parseJSONLFile(filePath: string): Promise<FileStats> {
  // ...
  for await (const line of rl) {
    const entry = JSON.parse(line);

    if (entry.type === 'assistant' && entry.message) {
      const rawUsage = entry.message.usage;

      // 如果 output_tokens 为 0，使用估算值
      let outputTokens = rawUsage.output_tokens || 0;
      if (outputTokens === 0 && entry.message.content) {
        outputTokens = estimateOutputTokens(entry.message.content);
      }

      // ...
    }
  }
}
```

### 估算准确性

| 内容类型 | 估算准确性 | 说明 |
|----------|------------|------|
| text | ~90-95% | tokenizer 差异 |
| tool_use | ~85-90% | JSON 序列化格式可能不同 |
| thinking | 无法估算 | thinking 内容不在 JSONL 中 |

**注意：** Claude 的 thinking tokens 不会出现在 JSONL 的 content 中，所以 thinking 模型的 output tokens 会严重低估。

### 优点

1. **可以回溯历史数据** - 从现有 JSONL 计算
2. **无需额外服务** - 纯计算
3. **实现简单** - ~50 行代码

### 缺点

1. **不够准确** - tokenizer 差异、thinking tokens 缺失
2. **thinking 模型严重低估** - opus-thinking 的 thinking tokens 无法估算
3. **依赖 JSONL 结构** - 如果 Claude Code 改变 JSONL 格式会失效

### 实现复杂度

- tokenizer 集成: ~30 行
- 估算逻辑: ~50 行
- 总计: ~80 行

---

## 方案 C: 混合方案

### 原理

结合官方 stats-cache 和 JSONL 数据：

1. **总量数据** - 从官方 `modelUsage` 获取（准确）
2. **日期分布** - 从官方 `dailyModelTokens` 获取
3. **input/output 比例** - 从 `modelUsage` 计算，应用到日期数据
4. **项目维度** - 从 JSONL 的 input_tokens 分布估算

### 核心设计

```typescript
interface OfficialStats {
  modelUsage: Record<string, {
    inputTokens: number;
    outputTokens: number;
    cacheReadInputTokens: number;
  }>;
  dailyModelTokens: Array<{
    date: string;
    tokensByModel: Record<string, number>;
  }>;
}

function computeDetailedStats(official: OfficialStats): DetailedStats {
  const result: DetailedStats = {};

  for (const daily of official.dailyModelTokens) {
    for (const [model, totalTokens] of Object.entries(daily.tokensByModel)) {
      const modelStats = official.modelUsage[model];
      if (!modelStats) continue;

      // 计算该模型的 input/output 比例
      const totalModelTokens = modelStats.inputTokens + modelStats.outputTokens + modelStats.cacheReadInputTokens;
      const inputRatio = modelStats.inputTokens / totalModelTokens;
      const outputRatio = modelStats.outputTokens / totalModelTokens;
      const cacheRatio = modelStats.cacheReadInputTokens / totalModelTokens;

      // 应用比例到日期数据
      result[daily.date] = result[daily.date] || {};
      result[daily.date][model] = {
        inputTokens: Math.round(totalTokens * inputRatio),
        outputTokens: Math.round(totalTokens * outputRatio),
        cacheReadTokens: Math.round(totalTokens * cacheRatio),
      };
    }
  }

  return result;
}
```

### 优点

1. **总量准确** - 来自官方数据
2. **有日期维度** - 来自官方数据
3. **无需额外服务**
4. **可以回溯历史**

### 缺点

1. **没有项目维度** - 官方数据不包含
2. **日期级别的 input/output 分布是估算的** - 假设比例恒定
3. **依赖官方 stats-cache 格式** - 可能变化

### 实现复杂度

- 读取官方 stats-cache: ~30 行
- 比例计算: ~50 行
- 总计: ~80 行

---

## 推荐

| 场景 | 推荐方案 |
|------|----------|
| 需要精确的项目级统计 | 方案 A (代理) |
| 只需要大致了解消耗 | 方案 C (混合) |
| 需要回溯历史 + 项目维度 | 方案 A + B 结合 |

### 渐进式实现建议

1. **第一阶段**: 实现方案 C（混合），快速获得按日期+模型的统计
2. **第二阶段**: 实现方案 A（代理），获得精确的项目级统计
3. **第三阶段**: 方案 B 作为 fallback，处理代理未运行时的数据

---

## 待决定

1. 是否需要项目维度的统计？
2. 是否接受运行代理服务的开销？
3. 历史数据的重要性？
4. thinking tokens 的处理方式？
