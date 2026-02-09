# CCEM Desktop 视觉重设计 — Agent Team 方案

> 创建日期: 2026-02-08
> 目标: 打造有辨识度、有品味的桌面应用视觉系统

---

## Agent Team Prompt

复制以下内容到启用了 Agent Teams 的 Claude Code session 中使用：

```
我正在对 CCEM Desktop（apps/desktop/）进行全面视觉重设计。
这是一个 Tauri v2 + React + Tailwind CSS + shadcn/ui 的桌面应用，用于管理 Claude Code 的多环境配置。

当前视觉风格存在的问题：
- Emerald/Teal 配色缺乏辨识度，和无数开发工具撞脸
- glassmorphism 背景 blob 有些过时
- shadcn/ui 默认样式太泛化，没有产品个性
- 信息层级和视觉节奏感不够好

设计目标：
- 打造像 Linear / Raycast / Warp 那样有"开发者高级感"的视觉系统
- 辨识度：用户截图发推特时，别人一眼就知道是 CCEM
- 克制：好品味是减法，不是堆特效
- 可实现：方案必须能用 Tailwind CSS + CSS 变量落地

请创建一个 agent team，4 个队友从不同维度并行探索，最终融合成一份统一的视觉重设计方案：

### 队友 1: 🎨 Visual Identity（视觉身份设计师）
研究并提出 CCEM Desktop 的独特视觉身份：
- 分析 10+ 款优秀开发者桌面应用（Linear, Raycast, Warp, Arc, Fig, TablePlus, Tower, Dash, Proxyman, RapidAPI）的视觉语言
- 提出 3 套完整配色方案（不要绿色系），每套包含：primary, accent, semantic colors, neutral scale
- 字体方案：推荐 1-2 款有个性的开发者字体（可以是 Google Fonts 或系统字体）
- Logo/品牌标识的视觉方向（CC 的处理方式）
- 整体 mood board：这个应用应该给人什么感觉？

请先阅读 docs/plans/2026-02-07-desktop-app-design.md 了解产品定位，
然后阅读 apps/desktop/src/index.css 和 tailwind.config.js 了解当前配色。

### 队友 2: 🏗️ Layout & Composition（布局与构图大师）
重新思考整体空间利用和信息架构的视觉呈现：
- 导航模式：当前顶部导航 vs 左侧极简边栏 vs 其他创新方案，给出推荐
- 页面内的网格系统和间距韵律（spacing rhythm）
- 卡片、列表、表格等容器的视觉层次
- 空状态、加载状态、错误状态的设计
- 信息密度：如何在有限空间内优雅展示数据

请阅读 apps/desktop/src/components/layout/ 和各 pages/ 文件了解当前布局结构。

### 队友 3: ✨ Micro-interactions & Motion（微交互与动效设计师）
设计让应用"活起来"的微交互系统：
- 页面切换的过渡动效（当前用了 fade-in + slide-in-from-bottom）
- 按钮的 hover/active/focus 状态层次
- 卡片的 hover 变化（不要只是加阴影）
- 数据加载和刷新的动画
- 成就达成、里程碑的庆祝动效（Analytics 页面）
- 会话状态变化的实时视觉反馈
- 所有动效要能用 Tailwind + CSS transition/animation 实现，给出具体代码

请阅读各组件文件了解当前的交互状态。

### 队友 4: 🔍 Design Critic（设计评论家 / 品味守门人）
作为挑剔的设计评审者，你的职责是：
- 等其他 3 位队友产出初步方案后，逐一审查
- 用以下标准打分（1-10）：辨识度、克制感、一致性、可实现性、"会让开发者截图发推"指数
- 指出每个方案中"看起来好但其实没品味"的部分
- 参考 Dieter Rams 十项设计原则、原研哉的"白"哲学、深泽直人的"无意识设计"
- 提出融合建议：从 3 位队友的方案中取各自最好的部分，组合成最终方案
- 最终输出一份统一的视觉设计规范

先阅读 docs/plans/2026-02-07-desktop-app-design.md 理解产品上下文，
然后等待并审查队友们的产出。

---

最终产出要求：
将融合后的视觉设计规范写入 docs/plans/2026-02-08-visual-redesign-spec.md，包含：
1. 设计理念（一句话概括应用的视觉个性）
2. 配色系统（完整的 CSS 变量定义）
3. 字体系统
4. 间距与布局网格
5. 组件样式指南（Button, Card, Input, Badge, Navigation 等核心组件）
6. 动效规范
7. 各页面的视觉改造要点
8. 与当前实现的 diff 清单（哪些文件需要改，改什么）
```

---

## Team 架构说明

```
┌─────────────────────────────────────────────────────────────────┐
│                        Team Lead (你)                           │
│                    协调 + 综合最终方案                            │
└──────────┬──────────┬──────────┬──────────┬────────────────────┘
           │          │          │          │
     ┌─────▼────┐┌────▼─────┐┌──▼───────┐┌▼──────────────┐
     │ 🎨 Visual ││ 🏗️ Layout ││ ✨ Motion ││ 🔍 Critic     │
     │ Identity  ││ & Compo-  ││ & Micro-  ││ (等待其他     │
     │           ││ sition    ││ interact  ││  队友产出后    │
     │ 配色/字体/ ││ 导航/网格/ ││ 动效/过渡/ ││  统一审查)    │
     │ 品牌/调性  ││ 层次/密度  ││ 状态反馈   ││               │
     └──────────┘└──────────┘└──────────┘└───────────────┘
          │            │            │              │
          ▼            ▼            ▼              ▼
     ┌─────────────────────────────────────────────────────┐
     │          docs/plans/2026-02-08-visual-               │
     │          redesign-spec.md                            │
     │          (最终融合的视觉设计规范)                      │
     └─────────────────────────────────────────────────────┘
```

## 为什么这样分工？

| 队友 | 为什么需要独立探索 | 对标参考 |
|------|-------------------|---------|
| 🎨 Visual Identity | 配色和品牌是最主观的决策，需要广泛调研后收敛 | Stripe 的品牌设计流程 |
| 🏗️ Layout | 布局影响所有页面，需要整体思考而非逐页修补 | Linear 的空间利用哲学 |
| ✨ Motion | 动效容易过度或不足，需要专注推敲每个状态 | Framer 的动效设计标准 |
| 🔍 Critic | 避免"设计师自嗨"，需要冷静的第三方视角 | Jony Ive 在 Apple 的审查角色 |

## 使用前检查

```bash
# 1. 确认 Agent Teams 已启用
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# 2. 建议在项目根目录下运行
cd /Users/wzt/G/Github/claude-code-env-manager

# 3. 直接在 Claude Code 中粘贴上面的 prompt
```

## 预期效果

- 4 个队友并行工作约 5-10 分钟
- 前 3 个队友各自产出方向性方案
- Critic 队友审查并融合
- 最终输出一份可直接落地的视觉设计规范文档

---

> 这个 Team 的核心设计理念是 **"分歧即力量"** ——
> 让不同视角的碰撞产生比单一设计师更好的结果。
