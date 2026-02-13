# Design Proposal: Dense & Pro — 信息密度

> 设计哲学：面向每天看几十个 session 的重度用户。最大化信息密度和操作效率，玻璃效果只在面板边界使用，内容区域用近乎不透明的背景。参考 VS Code 的信息密度 + Linear 的精致感。

---

## 维度 1: 消息气泡视觉

### 设计理念
去掉传统聊天气泡的"圆润感"，改用左侧色条区分角色。气泡间距压缩，文字紧凑但不拥挤。重度用户需要快速扫描，不需要大量留白。

### 布局重构：去头像，用色条
```tsx
// 不再用 flex-row / flex-row-reverse 的气泡布局
// 改为统一左对齐 + 左侧色条
<div className={cn(
  'py-2 px-4 border-l-2 transition-colors',
  isUser
    ? 'border-l-primary/60 bg-primary/[0.04]'
    : 'border-l-transparent'
)}>
  {/* 角色标签 + 时间 */}
  <div className="flex items-center gap-2 mb-0.5">
    <span className={cn(
      'text-[10px] font-semibold uppercase tracking-wider',
      isUser ? 'text-primary/70' : 'text-muted-foreground/50'
    )}>
      {isUser ? 'You' : message.model || 'Assistant'}
    </span>
    {message.timestamp && (
      <span className="text-[10px] text-muted-foreground/30">
        {formatTime(message.timestamp)}
      </span>
    )}
  </div>
  {/* 内容 */}
  <div className="text-[12.5px] leading-[1.6] text-foreground/90">
    {renderedContent}
  </div>
</div>
```
- 去掉头像和气泡圆角，改为全宽消息 + 左侧 2px 色条
- 用户消息：蓝色左边条 + 极淡蓝色背景 `bg-primary/[0.04]`
- 助手消息：无色条，纯内容
- 角色标签用 10px 大写字母，不占空间但清晰
- 文字从 13px 降到 12.5px，行高 1.6 保持可读

### 代码块
```css
.dense-code-block {
  background: hsl(var(--surface-sunken));  /* 不透明，最大可读性 */
  border: 1px solid hsl(var(--border-subtle));
  border-radius: var(--radius);  /* 6px，更紧凑 */
  padding: 8px 10px;
  margin: 4px 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  line-height: 1.5;
  overflow-x: auto;
}
```
- 背景完全不透明，代码可读性最高
- padding 和 margin 都压缩
- 字号 11.5px，比其他方案更小但仍可读

### 消息间距
- 同角色连续：`py-1`（上下各 4px）
- 角色切换：`py-2`（上下各 8px）+ 1px 分隔线
- 整体比 Clarity First 紧凑约 40%

---

## 维度 2: 工具调用展示

### 设计理念
重度用户需要快速扫描大量工具调用。默认全部折叠为单行，支持"全部展开/折叠"。工具调用区域用更紧凑的排版，视觉权重极低。

### 折叠态 — 极致紧凑
```tsx
<div className="flex items-center gap-1 py-0.5 text-[11px] text-muted-foreground/50
  hover:text-muted-foreground/70 cursor-pointer group">
  {/* 最小状态指示 */}
  <span className={cn(
    'w-1 h-1 rounded-full shrink-0',
    isError ? 'bg-destructive/60' : 'bg-success/40'
  )} />
  {/* 工具名 — 不加粗 */}
  <span className="font-mono">{block.name}</span>
  {/* 摘要 — 更短 */}
  {summary && (
    <span className="truncate opacity-60">{summary}</span>
  )}
  {/* 展开指示 — 只在 hover 时显示 */}
  <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50
    transition-opacity shrink-0 ml-auto" />
</div>
```
- 状态点只有 1px，几乎不可见但信息在
- 工具名用 font-mono 不加粗，视觉权重极低
- 展开箭头默认隐藏，hover 才显示
- 整行高度只有约 24px（py-0.5 + text-[11px]）

### 批量操作
```tsx
// 连续工具调用区域的头部
{toolCallCount > 0 && (
  <div className="flex items-center justify-between py-1 px-1">
    <span className="text-[10px] text-muted-foreground/40">
      {toolCallCount} tools
    </span>
    <button
      onClick={toggleAllTools}
      className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70"
    >
      {allExpanded ? 'Collapse all' : 'Expand all'}
    </button>
  </div>
)}
```

### 展开态 — 紧凑代码视图
```tsx
{open && (
  <div className="ml-2 my-0.5 text-[11px] font-mono">
    {/* Input — 直接显示，不加标签 */}
    <pre className="text-muted-foreground/60 whitespace-pre-wrap
      max-h-[120px] overflow-y-auto leading-snug pl-2 border-l border-white/[0.04]">
      {formatInput(block.input)}
    </pre>
    {/* Result */}
    {hasResult && (
      <pre className={cn(
        'whitespace-pre-wrap max-h-[120px] overflow-y-auto leading-snug pl-2 border-l-2 mt-0.5',
        isError ? 'border-destructive/30 text-destructive/50' : 'border-success/20 text-muted-foreground/60'
      )}>
        {formatResult(block._result)}
      </pre>
    )}
  </div>
)}
```
- 不加 INPUT/OUTPUT 标签，用边线粗细区分（1px = input, 2px = output）
- max-h 只有 120px，快速预览
- 无背景色，无圆角，最小视觉开销

---

## 维度 3: 会话列表交互

### 设计理念
列表是工作台，不是画廊。支持键盘导航、快捷键、批量操作。信息密度高但层次清晰。考虑虚拟化以支持上千条记录。

### 键盘导航
```tsx
// 在 HistoryList 中注册键盘事件
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === '/' && !e.metaKey) {
      e.preventDefault();
      searchRef.current?.focus();
      return;
    }
    if (document.activeElement === searchRef.current) return;

    const currentIdx = filtered.findIndex(s => s.id === selectedId);
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      const next = Math.min(currentIdx + 1, filtered.length - 1);
      onSelect(filtered[next].id);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      const prev = Math.max(currentIdx - 1, 0);
      onSelect(filtered[prev].id);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [filtered, selectedId, onSelect]);
```
- `j/k` 或 `↑/↓` 切换会话
- `/` 聚焦搜索框
- `Escape` 清空搜索

### 列表项 — 极致紧凑
```tsx
<button className={cn(
  'w-full text-left px-3 py-1.5 transition-colors duration-75',
  selectedId === session.id
    ? 'bg-primary/8 border-l-2 border-l-primary'
    : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
)}>
  <div className="flex items-center gap-2">
    <p className="text-[12px] leading-tight truncate flex-1 min-w-0">
      {session.display}
    </p>
    <span className="text-[10px] text-muted-foreground/30 shrink-0 tabular-nums">
      {formatCompactTime(session.timestamp)}
    </span>
  </div>
</button>
```
- py 从 2.5 压到 1.5，每项高度约 28px（vs 当前 ~40px）
- 项目名和 segment 数移到第二行，默认隐藏，hover 时显示
- 时间用更紧凑的格式：`2h` / `3d` / `Jan 5`
- transition 从 150ms 降到 75ms，响应更快

### 项目分组 — 折叠式
```tsx
{projectGroups.map(group => (
  <div key={group.name}>
    <button
      onClick={() => toggleGroup(group.name)}
      className="w-full flex items-center gap-1.5 px-3 py-1 text-[10px]
        text-muted-foreground/40 hover:text-muted-foreground/60"
    >
      <ChevronRight className={cn(
        'w-2.5 h-2.5 transition-transform',
        expandedGroups.has(group.name) && 'rotate-90'
      )} />
      <span className="uppercase tracking-wider font-medium">{group.name}</span>
      <span className="text-muted-foreground/20 ml-auto">{group.count}</span>
    </button>
    {expandedGroups.has(group.name) && group.sessions.map(s => (
      <SessionItem key={s.id} session={s} />
    ))}
  </div>
))}
```
- 按项目分组，可折叠
- 分组标题只有 ~20px 高

### 虚拟化
```tsx
// 当列表超过 100 条时启用虚拟滚动
// 使用 @tanstack/react-virtual
const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: filtered.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 28,  // 每项 28px
  overscan: 10,
});
```

---

## 维度 4: 整体布局与动效

### 设计理念
考虑三栏布局：列表 | 消息流 | 工具详情侧栏。动效最小化，只在必要时使用。速度感优先。

### 三栏布局（可选）
```tsx
<div className="flex h-[calc(100vh-48px-24px)] gap-0 -mx-6 -mb-6">
  {/* 左栏：会话列表 */}
  <div className="w-[240px] shrink-0 flex flex-col glass-subtle glass-noise
    border-r border-white/[0.06]">
    <HistoryList ... />
  </div>

  {/* 中栏：消息流 */}
  <div className="flex-1 flex flex-col min-w-0">
    {/* header + segment nav + messages */}
  </div>

  {/* 右栏：工具详情（条件渲染） */}
  {selectedTool && (
    <div className="w-[320px] shrink-0 flex flex-col glass-subtle glass-noise
      border-l border-white/[0.06] overflow-y-auto">
      <ToolDetailPanel tool={selectedTool} onClose={() => setSelectedTool(null)} />
    </div>
  )}
</div>
```
- 左栏从 280px 压到 240px
- 右栏 320px，点击工具调用时滑出
- 中栏的工具调用只显示折叠态，点击后在右栏展示完整 input/output
- 这样消息流更干净，工具详情有足够空间

### Segment 导航 — Tab Bar
```tsx
// 用 tab bar 替代 pill buttons，节省垂直空间
<div className="flex items-center border-b border-white/[0.06] shrink-0">
  {segmentOptions.map(item => (
    <button
      key={item.index ?? 'all'}
      onClick={() => setActiveSegment(item.index)}
      className={cn(
        'px-4 py-2 text-[11px] transition-colors relative',
        activeSegment === item.index
          ? 'text-primary font-medium'
          : 'text-muted-foreground/50 hover:text-muted-foreground/70'
      )}
       {item.label}
      {/* 底部指示线 */}
      {activeSegment === item.index && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  ))}
</div>
```
- Tab bar 风格，选中态用底部蓝色指示线
- 不用 pill buttons，节省约 8px 垂直空间
- 与 header 合并为一行（header 左侧标题，右侧 tab bar）

### 动效 — 最小化
```css
/* 唯一的动画：segment 切换时消息列表的淡入 */
.dense-fade-in {
  animation: dense-fade var(--duration-instant) var(--ease-default);
}
@keyframes dense-fade {
  from { opacity: 0.6; }
  to { opacity: 1; }
}
```
- 只有一个动画：segment 切换时 80ms 的淡入
- 不做消息入场动画、不做滚动动画
- 速度感 > 视觉效果

---

## 维度 5: 玻璃拟态平衡

### 设计理念
玻璃效果最小化——只在面板边界和分隔线上使用。内容区域用近乎不透明的背景，信息密度和可读性是第一优先级。

### 分层策略

| 区域 | 玻璃级别 | 不透明度 | blur | 原因 |
|------|---------|---------|------|------|
| 左侧面板 | glass-subtle | 0.22 | 16px | 面板边界，可以有效果 |
| 右侧工具面板 | glass-subtle | 0.22 | 16px | 同上 |
| 对话区背景 | 无 | 近乎不透明 | — | 内容区，可读性优先 |
| 消息区域 | 无 | — | — | 无气泡，无玻璃 |
| 对话 header | 无 | — | — | 用 border-b 分隔即可 |
| Segment tab bar | 无 | — | — | 底部指示线即可 |
| 搜索框 | 无 | — | — | 简单 bg-white/[0.04] |

### 暗色/亮色差异
```css
:root {
  --dense-msg-user-bg: 211 100% 50% / 0nse-msg-user-border: 211 100% 50% / 0.40;
}
.light {
  --dense-msg-user-bg: 211 100% 50% / 0.04;
  --dense-msg-user-border: 211 100% 50% / 0.50;
}
```
- 用户消息的蓝色背景和左边条在亮色模式下需要调整
- 亮色模式背景更淡（0.04 vs 0.06），边条更深（0.50 vs 0.40）

### 关键原则
1. **玻璃效果只在面板边界** — 内容区域不用 blur
2. **信息密度 > 视觉美感** — 但不能丑
3. **色条 > 气泡** — 用 2px 色条区分角色，不用圆角气泡
4. **不透明背景** — 代码块、工具详情都用不透明背景
5. **最小动效** — 只有 segment 切换的 80ms 淡入
6. **不用 `dark:` 前缀** — 遵循项目规范
