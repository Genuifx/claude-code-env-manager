# History Page — Markdown Rendering & Plan Mode Cards

## Overview

为 History 页面的消息气泡添加 Markdown 渲染支持，并为 Claude Code plan 模式的"接受执行"消息提供特殊的 Glass 引用卡片渲染。

## Dependencies

- `react-markdown` — Markdown → React
- `remark-gfm` — GFM 扩展（表格、任务列表、删除线）
- `react-syntax-highlighter` — Prism 代码高亮

## Changes

### 1. Rust Backend — `history.rs`

- 解析 JSONL 时提取顶层 `planContent` 字段
- `ConversationMessage` 新增 `plan_content: Option<String>`
- 序列化传给前端

### 2. Frontend Types & Hook

- `ConversationMessageData` 新增 `planContent?: string`
- `useTauriCommands.ts` 映射 `plan_content` → `planContent`

### 3. New Component — `MarkdownRenderer.tsx`

位置：`src/components/history/MarkdownRenderer.tsx`

封装 `react-markdown` + `remark-gfm` + `react-syntax-highlighter/prism`，自定义 components 映射到 glass 设计系统样式：

| Element | Style |
|---------|-------|
| h1–h3 | `text-lg/base/sm font-semibold mt-4 mb-2` |
| p | `text-[13px] leading-[1.65] mb-2` |
| inline code | `glass-subtle rounded px-1.5 py-0.5 text-[12px] font-mono text-primary` |
| code block | `react-syntax-highlighter` + `glass-subtle rounded-lg` + 语言标签 + 复制按钮 |
| ul/ol | `pl-5 list-disc/list-decimal text-[13px]` |
| a | `text-primary underline-offset-2 hover:underline` |
| table | `glass-subtle rounded-lg overflow-hidden` |
| blockquote | `border-l-2 border-primary/30 pl-3 italic` |

### 4. MessageBubble Changes

- `renderTextContent()` 改为调用 `<MarkdownRenderer />`
- 新增 Plan 卡片渲染分支：检测 `planContent` 有值时渲染为 Glass 引用卡片
  - 外层：`glass-card glass-noise rounded-2xl border-l-[3px] border-primary`
  - 头部：`ClipboardList` 图标 + "Plan" 标签
  - 内容：`<MarkdownRenderer content={planContent} />`
  - 长内容折叠：`max-h-[400px]` + 渐变遮罩 + 展开按钮

### 5. i18n

新增 key：`history.plan`、`history.expandAll`（复用）、`history.collapse`、`history.copyCode`

## Plan Message Detection

JSONL 中 plan 消息有确切的顶层 `planContent` 字段（非空字符串），无需正则匹配。
