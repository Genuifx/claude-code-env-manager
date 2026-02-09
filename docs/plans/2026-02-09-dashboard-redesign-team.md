# CCEM Desktop Dashboard Redesign — Agent Team Report

> Created: 2026-02-09
> Process: 4 Proposers (parallel) → Judge (fusion) → Challenger (review)
> Final verdict: **Conditional Pass** — 4 items to resolve before implementation

---

## Team Roster

| Role | Codename | Core Belief |
|------|----------|-------------|
| Proposer A | 数据叙事设计师 | Dashboard 的灵魂是数据，不是按钮 |
| Proposer B | 空间体验设计师 | Dashboard 不是网页，是一个空间 |
| Proposer C | 反直觉挑衅者 | 常规 Dashboard 已经死了 |
| Proposer D | 情感化设计师 | 工具不该只是工具，应该让人感到某种东西 |
| Judge | 品味融合者 | 取各家核心洞察，选更克制的选项 |
| Challenger | 最终审验者 | 找出裁判的盲区，确保方案经得起推敲 |

---

## Phase 1: Four Proposals

### Proposal A — "数据叙事" (Score: 33/50)

**核心理念：** 启动是低频决策（一天几次），查看使用状态是高频需求。现有首页把低频动作放在视觉中心，把高频信息挤到底部——完全倒置。

**布局：**
- 英雄数据条（4 个 countUp 动画数字：Tokens/消费/活跃会话/编码时长）
- 左 60% — 今日活动时间线（纵向，按时间节点展示项目活动）
- 右 40% — "继续上次"高亮卡片 + 收藏/最近项目精简列表
- 底部 — 7 日迷你热力条
- 环境/权限选择器移到 PageHeader 右侧

**评审：**
- ✅ 正确诊断了"优先级倒置"问题
- ✅ 7 日脉搏热力条是精彩的微交互
- ❌ 活动时间线占 60% 面积——日志查看器属于 Analytics 不属于 Dashboard
- ❌ "编码时长"数据 CCEM 当前无法采集（usageStats 中只有 tokens/cost）

---

### Proposal B — "空间体验" (Score: 32/50)

**核心理念：** 将内容组织为三个空间区域，用户通过空间位置记忆导航。最高频动作放在空间的"重力中心"。

**布局 — 三栏：**
- 左栏 300px — Project Dock：收藏+最近合并的智能列表，每行 > 快捷启动
- 中栏 flex-1 — Launch Pad：联动展示选中项目的上下文信息 + 启动按钮
- 右栏 220px — Cockpit：连续仪表面板（ENV/PERM/SESSIONS/TODAY + 7 天 sparkline）

**评审：**
- ✅ Master-Detail 联动是成熟的桌面交互范式
- ✅ "消灭项目四分区，智能混合列表"是正确的简化方向
- ❌ 三栏布局在 max-w-6xl (1152px) 下极其拥挤，880px 最小窗口完全崩溃
- ❌ Cockpit 右栏 4 个仪表面板在 220px 宽度内难以交互

---

### Proposal C — "反直觉挑衅者" (Score: 36/50)

**核心理念：** 环境从下拉框解放为页面视觉主体——可点击的物理开关卡片。启动从按钮变成命令栏。80% 留白，每个像素都指向行动。

**布局 — The Switchboard：**
- 上半 40% — 环境开关组：每个环境一张 140x160px 竖向卡片横排，活跃环境琥珀色高亮 + 连接线延伸到命令栏
- 中央 — 命令栏（⌘K）：全宽 56px 搜索框，输入项目名/路径 + 回车 = 启动
- 命令栏下方 — Recent Dock：单行横向胶囊（6-8 个），单击 = 一键启动
- 底部 — 一行状态文字（sessions · tokens · cost）

**评审：**
- ✅ 环境卡片化是最具辨识度的创意——让核心身份可视化
- ✅ Cmd+K 命令栏极度符合 CLI 用户的肌肉记忆
- ❌ 80% 留白在桌面应用固定窗口中是浪费
- ❌ 环境卡片 140x160px 横排在 5-6 个环境时溢出，且"每卡片内嵌权限"与当前数据模型不符

---

### Proposal D — "情感化设计师" (Score: 37/50)

**核心理念：** 首页是"门槛"——从日常跨入 AI 协作创造的过渡时刻。用时间锚点、连续性、一键就位制造"跨过门槛"的感受。

**布局 — Threshold：**
- 顶部 — Greeting Moment：时间感知问候语（下午好）+ 日期，py-6 克制高度
- Launch Strip（核心创新）：水平带，环境 badge → 权限 badge → 工作目录 → 启动按钮。自动记忆
- Continuity 区：3 个最近项目卡片，第一个用 border-l-2 primary 标记
- 底部双栏：左 Pulse（sparkline + 今日数字 + 昨日对比），右 Active（运行中会话极简列表）

**评审：**
- ✅ Launch Strip 是本轮最优秀的单一设计元素——一次水平扫视确认所有参数
- ✅ 克制度最高——每个决策都在做减法，且每次减法都有理由
- ❌ 问候语对每天打开几十次的工具来说很快变成视觉噪音
- ❌ 底部双栏（Pulse + Active）的信息密度偏低

---

## Phase 2: Judge Fusion — "The Launchpad"

### Score Summary

| 维度 | A (数据叙事) | B (空间体验) | C (反直觉) | D (情感化) |
|------|:-:|:-:|:-:|:-:|
| Distinctiveness | 7 | 6 | 9 | 5 |
| Practicality | 6 | 7 | 5 | 8 |
| Restraint | 5 | 5 | 7 | 8 |
| Coherence | 7 | 8 | 6 | 9 |
| Tweet-worthy | 8 | 6 | 9 | 7 |
| **Total** | **33** | **32** | **36** | **37** |

### Fusion Decisions

| Decision | Adopted | Rejected | Reasoning |
|----------|---------|----------|-----------|
| 环境展示 | Badge dropdown (D) | 卡片矩阵 (C) | 卡片在小窗口溢出，badge 在任何宽度都工作 |
| 统计数据 | 底部一行 Pulse Bar | 英雄数据条 (A) / 右栏仪表 (B) | 统计是"扫一眼"需求，一行足够 |
| 项目列表 | 2 列 grid，最多 6 个 | 时间线 (A) / 三栏联动 (B) / 单行 Dock (C) | Grid 信息密度适中，6 个覆盖大多数场景 |
| 问候语 | 不采用 | 时间感知问候 (D) | 顶部像素是黄金地段，问候语信息量为零 |
| 布局方式 | 单栏自然流 | 三栏 (B) | 880px 最小窗口下三栏崩溃 |
| 键盘快捷键 | 支持但不作为主入口 | 命令栏核心 UI (C) | v1 阶段 < 30 个 actionable items，命令栏过度设计 |

### Fusion Layout

```
+--+----------------------------------------------------------+
|  | PageHeader: "Dashboard"              [env▾] [perm▾] [48px]|
|S |----------------------------------------------------------|
|i |                                                          |
|d | LAUNCH STRIP  (全宽水平带，h-14，bg-surface-elevated)      |
|e | +------------------------------------------------------+ |
|R | | [env-badge ▾]  [perm-badge ▾]  ~/proj/path [...]  [启动]| |
|a | +------------------------------------------------------+ |
|i |                                                          |
|l | RECENT PROJECTS  (最多 6 个，2x3 grid)                    |
|  | +------------------+  +------------------+               |
|6 | | * last-project   |  |   project-b      |               |
|4 | |   ~/path/to/proj |  |   ~/path/to/b    |               |
|p | |   3h ago  [启动>] |  |   昨天    [启动>] |               |
|x | +------------------+  +------------------+               |
|  | +------------------+  +------------------+               |
|  | |   project-c      |  |   project-d      |               |
|  | |   ~/path/to/c    |  |   ~/path/to/d    |               |
|  | |   2天前   [启动>] |  |   3天前   [启动>] |               |
|  | +------------------+  +------------------+               |
|  |                                                          |
|  | PULSE BAR  (单行，text-sm)                                |
|  | ┌────────────────────────────────────────────────────────┐|
|  | │ ■■■■■□□  12.4K tokens  $1.23 today  2 sessions active │|
|  | └────────────────────────────────────────────────────────┘|
|  |                                                          |
+--+----------------------------------------------------------+
```

### Element Attribution

| Element | Source Proposal | Modifications |
|---------|---------------|---------------|
| Launch Strip | D (情感化) | 去掉问候语，环境/权限也保留在 PageHeader 中 |
| 7 日脉搏 WeekDots | A (数据叙事) | 压缩为 PulseBar 中的微型指示器 |
| 智能混合列表 | B (空间体验) | 不分收藏/最近/IDE 四区，统一排序 |
| 统计压缩为一行 | C (反直觉) | 从三张 Card 变为底部一行信息带 |
| 克制的项目数量 | D (情感化) | 3 个 → 扩展为 6 个（覆盖更多场景） |

### Component Breakdown

```
src/pages/Dashboard.tsx              -- 页面容器
src/components/dashboard/
  LaunchStrip.tsx                    -- 环境badge + 权限badge + 目录 + 启动按钮
  RecentProjects.tsx                 -- 2x3 grid 项目卡片列表
  ProjectCard.tsx                    -- 单个项目卡片
  PulseBar.tsx                       -- 底部信息带
  WeekDots.tsx                       -- 7个小方块的迷你活跃度指示器
  BadgeDropdown.tsx                  -- 可点击 badge + 下拉选择器（通用）
```

---

## Phase 3: Challenger Review

### Verdict: Conditional Pass (需修改)

方向正确，但存在 5 个需要解决的问题。

### Issue 1 (P0): 最小窗口 880x640 垂直溢出

垂直空间算术：PageHeader 48px + py-6 上 24px + Launch Strip 56px + gap 24px + Projects 标题 28px + 3 行卡片 272px + gap 24px + Pulse Bar 36px + py-6 下 24px = **~536px**。640px 窗口高度不够。

**Resolution:** 接受 Pulse Bar 在最小窗口下需要滚动，但确保 Launch Strip 和前两行 Projects（4 个）在首屏可见。在窗口 >= 800px 高度时才显示第三行。

### Issue 2 (P0): Recent Projects 点击启动的环境/权限歧义

项目卡片点击后用哪个环境/权限启动？当前选中的？还是上次用该项目时的？

**Resolution:** 采用"智能填充"方案——点击项目卡片后，将该项目的目录 + 上次使用的环境/权限组合填入 Launch Strip 并高亮"已更新"的字段，让用户快速确认后点击启动。保持效率的同时消除歧义。

### Issue 3 (P1): Launch Strip 四控件一行的认知负荷

四个决策点（环境/权限/目录/启动）挤在 h-14 水平带中，工作目录路径在窄窗口截断。

**Resolution:** 考虑拆为两层——上层只读状态确认（badge + 路径），下层操作按钮。或通过原型验证单行方案是否可接受。

### Issue 4 (P1): 视觉焦点引力问题

Recent Projects 面积最大但不一定是最重要的操作，可能在视觉上"压制" Launch Strip。

**Resolution:** 让"上次使用"的第一个卡片始终在左上角。考虑第一个卡片 `col-span-2` 占满两列宽度，作为真正的"继续上次"英雄入口。

### Issue 5 (P2): 环境身份从卡片到 badge 的过度简化

CCEM 的核心身份是"多环境管理"，压缩成 badge 丢失了身份感。

**Resolution:** 在 Launch Strip 中为当前环境添加 `chart-{N}` 颜色的 2px 左边框或底部色条，不占额外空间但传达环境身份。

### Pass Conditions (放行前必须确认)

1. ✅ 明确 Recent Projects 排序规则（按最近使用时间，最近的在左上角）
2. ✅ 明确项目卡片点击的完整行为（智能填充 Launch Strip + 高亮更新字段）
3. ✅ 在 880x640 下做纸面原型验证，确认首屏内容优先级
4. ✅ Pulse Bar 的"详情>"链接携带 navigation intent（timeRange: 'day'）

---

## One-liner

**"Launch Strip — 一条水平带确认所有参数，一次点击继续上次项目。"**

---

## Next Steps

1. 解决 Challenger 提出的 4 个放行条件
2. 基于融合方案 + Challenger 修改建议，编写详细实现 spec
3. 创建 git worktree 并实现 Dashboard v2
