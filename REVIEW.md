# Analytics Glassmorphism Contest -- Review Report

**Reviewer**: Arbiter (Critic)
**Date**: 2026-02-10
**Scope**: Analytics page glassmorphism overhaul -- three competing worktree branches

---

## Review Summary

Three solutions competed to refactor the Analytics page away from off-brand hardcoded amber colors toward the project's Frosted Glass / macOS Sequoia design system. The baseline had three key violations: (1) hardcoded `AMBER`/`AMBER_LIGHT` HSL constants in `TokenChart.tsx` (line 18-19: `hsl(38 92% 50%)`, `hsl(45 93% 58%)`), (2) `text-orange-500` Tailwind class on Flame icons in `Analytics.tsx` (line 437), and (3) six hardcoded amber Tailwind classes on the dev-mode demo data banner (line 371: `border-amber-300`, `bg-amber-50`, `text-amber-800`, etc.). All three solutions successfully eliminated the TokenChart amber constants. They diverge significantly on how thoroughly they addressed the remaining violations and how creatively they expressed the glass hierarchy.

---

## Scheme Scores

### Aurora

| Dimension | Score | Comments |
|------|------|------|
| Design System Compliance | 5/10 | Replaced TokenChart amber with `--chart-1`/`--chart-2` CSS vars (good). However, **did not fix** `text-orange-500` on the Flame icon (Analytics.tsx line 455) -- a direct violation of "never hardcoded Tailwind colors." **Did not fix** the demo banner's six amber Tailwind classes (line 375: `border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300`). The HeatmapCalendar rework **abandoned** the bespoke `--heatmap-*` CSS variable tokens (defined in `index.css` lines 104-109) in favor of generic `bg-primary/20` Tailwind opacity classes -- this is a regression from a more specific, theme-aware token system to a less precise one. |
| Glassmorphism Effect Quality | 7/10 | Good use of `stat-card glass-noise` on hero card. Cards via `<Card>` inherit `glass-card glass-noise`. The `LEVEL_GLOW` map (HeatmapCalendar.tsx lines 19-25) applying `--primary-glow` box-shadow halos to heatmap cells at levels 2-4 is a genuinely creative aurora-themed enhancement. Three-stop vertical gradient fill + horizontal stroke gradient on TokenChart creates visual depth. Missing `glass-shimmer` on hero card. No glass panel wrapping for the milestone section, breaking the 3-tier hierarchy opportunity. |
| Visual Consistency | 6/10 | Chart colors use system blue-cyan spectrum (`--chart-1`/`--chart-2`), but the surviving `text-orange-500` on the Flame icon creates a jarring warm accent against the cool palette. The amber demo banner (when visible in dev mode) further breaks the blue unity. The aurora gradient on DailyTokenBar matches TokenChart well. |
| Code Quality | 7/10 | Clean, focused changes. Interfaces preserved. No type issues. The granularity controls were moved out of the Card header into a standalone row (line 383-394) -- a layout change that was not strictly required and alters the baseline UI structure. Removing `LEVEL_STYLES` inline styles in favor of `LEVEL_COLORS` Tailwind classes is an unnecessary refactor that discards a working, token-based pattern. |
| Creativity & Detail | 8/10 | The aurora theme is well-expressed: three-stop fill gradient simulating aurora curtains (TokenChart.tsx lines 35-39), horizontal stroke gradient for color sweep (lines 40-43), `LEVEL_GLOW` halo effects on active heatmap cells (HeatmapCalendar.tsx lines 19-25). The milestone progress bar enhancement with `linear-gradient(90deg, --chart-1, --chart-2)` and `--primary-glow` box-shadow (Analytics.tsx lines 82-83) is a thoughtful luminous touch. The most creatively ambitious heatmap treatment of the three solutions. |
| **Weighted Total** | **6.30/10** | (5x0.30 + 7x0.25 + 6x0.20 + 7x0.15 + 8x0.10) = 1.50+1.75+1.20+1.05+0.80 |

---

### Prism

| Dimension | Score | Comments |
|------|------|------|
| Design System Compliance | 7/10 | Fully removed TokenChart amber constants. **Fixed** `text-orange-500` by replacing with `text-chart-4` (Analytics.tsx lines 58, 451) -- system purple (`--chart-4: 250 45% 60%`), staying within the chart color palette. Heatmap tokens correctly left untouched (baseline already compliant with `--heatmap-*` vars). However, **did not fix** the demo banner amber Tailwind classes (line 371). Tooltip shadow uses hardcoded `hsl(0 0% 0% / 0.15)` in both TokenChart.tsx (line 59) and DailyTokenBar.tsx (line 77) instead of the proper `--glass-shadow-base` token -- a minor but real token violation. All `t()` i18n usage maintained. |
| Glassmorphism Effect Quality | 9/10 | **Best glass hierarchy** of all three solutions. Hero card uses `stat-card glass-noise glass-shimmer` (line 393: heaviest frost + ambient light sweep animation). Chart cards use `<Card>` (`glass-card glass-noise`, medium frost + hover lift). Milestone section wrapped in `glass-subtle glass-noise rounded-xl p-4` (line 499: lightest frost). This is a textbook 3-tier glass stack: heavy -> medium -> light. Individual `card-stagger` on each Card element (lines 467, 483, 490) produces correct staggered entrance animations. The `glass-shimmer` addition on the hero card adds a premium ambient light sweep that neither of the other solutions included. |
| Visual Consistency | 7/10 | Three-color prism gradient (`--chart-1` -> `--chart-2` -> `--chart-3`, blue -> cyan -> green) creates a wider but still cool-tone spectrum sweep across charts. The per-bar color interpolation in DailyTokenBar (lines 26-40) echoes the prism refraction theme. `text-chart-4` for streak icons is within the chart palette but introduces purple, which is a slight departure from pure blue. The surviving amber demo banner is the sole warm-tone holdout. |
| Code Quality | 8/10 | The `getBarColor()` utility function (DailyTokenBar.tsx lines 32-40) is cleanly isolated and well-typed. The `Cell` import from recharts for per-bar coloring is the correct API for this pattern. `card-stagger` applied to individual `<Card>` elements rather than the grid container produces more correct stagger timing. The `glass-subtle glass-noise` wrapper on NextMilestone (line 499) is well-scoped. All component interfaces preserved. No unnecessary structural changes. |
| Creativity & Detail | 9/10 | The prism metaphor is thoroughly executed: three-color refraction gradient on the area chart fill AND stroke (TokenChart.tsx lines 32-42), per-bar color sweep across 14 days in DailyTokenBar creating a left-to-right spectral gradient (lines 85-90), `glass-shimmer` ambient light sweep on the hero card, and a deliberate 3-tier glass hierarchy. The `getBarColor()` interpolation function is a creative approach to per-bar coloring that avoids SVG gradient limitations in recharts Bar components. |
| **Weighted Total** | **7.85/10** | (7x0.30 + 9x0.25 + 7x0.20 + 8x0.15 + 9x0.10) = 2.10+2.25+1.40+1.20+0.90 |

---

### Glacier

| Dimension | Score | Comments |
|------|------|------|
| Design System Compliance | 9/10 | **Most thorough compliance fix.** Removed TokenChart amber constants. **Fixed** `text-orange-500` by replacing the Flame icon entirely with `Zap` using `text-primary` (Analytics.tsx line 58, line 451). **Fixed the demo banner** -- the only solution to do so -- replacing all six amber Tailwind classes with `glass-subtle glass-noise` and `border: 1px solid hsl(var(--glass-border-light) / 0.3)` inline style (line 371). Tooltip glass treatment uses ALL correct design tokens: `--glass-bg` for background, `--glass-border-light` for border, `--glass-shadow-base` for shadow (TokenChart.tsx lines 50-55) -- not hardcoded black like Prism. Only minor deduction: the demo banner's inline `style={{ border: ... }}` could have relied on `glass-subtle`'s own border rule. |
| Glassmorphism Effect Quality | 6/10 | `stat-card glass-noise` on hero card is correct but baseline-level. Cards via `<Card>` provide `glass-card glass-noise`. Tooltip has the **strongest glass treatment** of all three: `blur(24px) saturate(200%)` with proper `--glass-bg` opacity and `--glass-border-light` border. However, the chart area gradient uses ultra-low opacity (0.15 -> 0.03, TokenChart.tsx line 35-36), making the fill nearly invisible -- this prioritizes translucency over visual impact. No `glass-shimmer` on the hero card. The milestone section has **no glass wrapping** at all (line 499), missing the opportunity for a 3-tier hierarchy. Only 2 tiers exist: stat-card -> glass-card. |
| Visual Consistency | 9/10 | **Most consistent color palette.** Everything is glacier blue: mono-blue hero gradient (`--chart-1` to `--chart-1/0.7`, line 399), mono-blue chart stroke and fill, `text-primary` for the streak icon, `glass-subtle` for the demo banner. The Zap icon with `text-primary` matches the blue spectrum perfectly. No warm accents anywhere on the entire page. The demo banner fix means even dev mode maintains visual consistency. Minor risk: the mono-blue approach may feel monotonous across a full page of analytics content with multiple chart types. |
| Code Quality | 8/10 | Minimal, surgical changes. DailyTokenBar only changed the tooltip styling (bar fill was already compliant at baseline). The Flame -> Zap icon swap is a semantic change (fire -> lightning) that could be debated -- the "streak" concept is traditionally associated with fire/flame iconography, and changing the icon changes the user metaphor. The milestone bar thinning (`h-2` -> `h-1`, `bg-muted` -> `bg-muted/40`, `bg-primary` -> `bg-primary/80`, line 77-81) is a considered minimalist detail. All component interfaces preserved. |
| Creativity & Detail | 7/10 | The "ice-clear" mono-blue aesthetic is a coherent artistic vision. The ultra-low-opacity chart gradient creates a genuine translucent ice effect. The demo banner transformation from amber to `glass-subtle` is the most impactful single change across all solutions -- it demonstrates deep understanding of the design system's intent. The thinner milestone bar at reduced opacity is a refined minimalist touch. Less visually striking than Aurora's glow effects or Prism's spectral sweep, but more architecturally pure. |
| **Weighted Total** | **7.90/10** | (9x0.30 + 6x0.25 + 9x0.20 + 8x0.15 + 7x0.10) = 2.70+1.50+1.80+1.20+0.70 |

---

## Final Ranking

1. **Glacier** -- 7.90/10
2. **Prism** -- 7.85/10
3. **Aurora** -- 6.30/10

Glacier and Prism are separated by only 0.05 points. Glacier wins on design system compliance (the only solution to fix ALL three baseline violations including the demo banner) and visual consistency (zero warm-tone holdouts anywhere on the page). Prism wins decisively on glassmorphism effect quality (best 3-tier hierarchy with `glass-shimmer`) and creativity (prism refraction gradients, per-bar Cell coloring). Aurora finishes third due to leaving two of three design system violations unfixed and regressing the heatmap from bespoke `--heatmap-*` CSS variable tokens to generic Tailwind opacity classes.

---

## Recommendations & Fusion Strategy

The ideal final implementation would fuse elements from all three:

1. **From Glacier**: Take the demo banner fix (`glass-subtle glass-noise` replacing amber classes) and the comprehensive tooltip glass treatment using `--glass-bg`, `--glass-border-light`, and `--glass-shadow-base` tokens. Also take the Flame -> Zap icon swap with `text-primary` for complete amber elimination.

2. **From Prism**: Take the 3-tier glass hierarchy (`stat-card glass-noise glass-shimmer` -> `glass-card glass-noise` via `<Card>` -> `glass-subtle glass-noise`) and the `glass-shimmer` on the hero card. Take the `glass-subtle glass-noise rounded-xl p-4` wrapper around the NextMilestone section. Take the individual `card-stagger` on each Card element for proper staggered animation.

3. **From Aurora**: Take the `LEVEL_GLOW` heatmap glow halos (but keep the baseline `--heatmap-*` CSS variable tokens instead of Aurora's `bg-primary` Tailwind classes). Take the milestone progress bar gradient enhancement with `--primary-glow` glow shadow.

4. **Color palette**: Use Prism's multi-color approach (`--chart-1` through `--chart-3`) for the TokenChart area gradient and stroke, as it provides more visual richness than Glacier's mono-blue while staying within the cool spectrum. For DailyTokenBar, Aurora's gradient fill is simpler and has less runtime overhead than Prism's per-bar Cell approach.

5. **Unfixed in all three**: None of the solutions addressed the baseline HeatmapCalendar's use of the English-only `DAY_LABELS = ['Mon', 'Tue', ...]` constant, which should arguably use `t()` for i18n compliance. This is a pre-existing issue in the baseline, not a regression introduced by any solution.

---
---

# 全页面玻璃拟态打磨评审报告

> **评审人**: glass-critic | **日期**: 2026-02-11
> **基准**: 两份设计指南（玻璃拟态设计语言 + 玻璃拟态实战注意点）+ 主仓库 `index.css` 基准代码
> **范围**: Dashboard / Sessions / Environments+Skills+Settings 三个方案的玻璃拟态精雕细琢

---

## 方案 A: Dashboard (glass-dashboard)

### 评分

| 维度 | 分数 | 说明 |
|------|-----|------|
| 指南遵循度 | 9/10 | 严格遵循白色边框、CSS 变量、4 级圆角系统。所有新增 CSS 类都用 `:root` + `.light` 双模式定义。修改范围内的文件（Dashboard.tsx, ProjectList.tsx）完全干净，无任何 `border-border`、`bg-muted`、`dark:` 残留。 |
| 像素级精度 | 9/10 | 每个区域都被仔细审计：hero 面板移除了冗余 `border border-border`；dropdown 用了专门的 `glass-dropdown` 类（blur 48px）；session indicator 用了 `glass-indicator`；项目列表行用了 `glass-list-item`（blur 16px, 50% opacity）；"+" 按钮用了 `glass-add-btn`（虚线白边框 -> hover 变 primary）。Streak 卡片的 "days" 文字从 `gradient-text` 中分离出来避免透明文字 bug -- 这是一个很细心的修复。 |
| 暗/亮模式兼容 | 9/10 | 所有 7 个新增 CSS 类都有 `.light` 变体。`glass-dropdown`、`glass-indicator`、`glass-outline-btn`、`glass-launch-btn` 都在 `.light` 下调整了阴影和透明度。`--badge-bg-opacity` 和 `--badge-border-opacity` 也在 `:root` 和 `.light` 中分别定义。 |
| 代码质量 | 9/10 | CSS 类命名一致（`glass-` 前缀），复用了现有的 glass 变量系统。新增类的结构与基准代码中的 `glass-subtle`、`glass-card` 保持一致。JSX 中用 Lucide 图标替换了文本字符（Play, X, Plus）。`glass-list-item` 的 hover 效果（translateY -0.5px + 更亮边框）是对 `glass-card` hover 模式的合理缩小版。 |
| 创新性 | 8/10 | `glass-dropdown` 类（blur 48px, 接近 `frosted-panel` 级别）是一个好的创新 -- popover 菜单确实需要比普通卡片更重的磨砂。`glass-launch-btn` 的蓝色光晕阴影（hover 时加强）为 CTA 按钮增加了玻璃感。`glass-list-item` 的 0.5px 微浮起是一个克制的细节。 |
| **加权总分** | **8.85/10** | |

### 优点

- **修改范围内零残留**：Dashboard.tsx 和 ProjectList.tsx 中没有任何 `border-border`、`bg-card`、`bg-muted`、`dark:` 前缀或 Tailwind 硬编码颜色
- **7 个新增 CSS 类全部有暗/亮双模式**，且命名规范统一
- **Streak 卡片 bug 修复**：将 "days" 文字从 `gradient-text` span 中分离，避免 `-webkit-text-fill-color: transparent` 导致文字不可见
- **圆角系统严格遵循**：Hero=2xl, Card=xl (stat-card 自带), Item=lg, Control=md
- **Lucide 图标替换**：Play, X, Plus 替换了文本字符

### 问题

1. **未修改文件中的残留**（不在本方案职责范围，但同 worktree 中存在）：
   - `Environments.tsx`: 5 处 `border-border`，1 处 `border-border/50`
   - `Skills.tsx`: `bg-muted/50 border-border`，`text-red-500 dark:hover:border-red-700`
   - `Settings.tsx`: 4 处 `border-border`，`text-emerald-500`，`bg-card`
   - `EnvList.tsx`: `bg-card`，`bg-muted`，`text-rose-500 dark:hover:bg-rose-900/20`
2. **环境 badge 颜色**：`bg-chart-2/[0.12] text-chart-2 border-chart-2/[0.18]` 使用了 chart 颜色 token，虽然不是硬编码 Tailwind 颜色，但语义上 chart 颜色用于环境标识不太合适

### 建议修复

- 环境 badge 考虑用 `bg-primary/12 text-primary border-primary/18` 或专门的环境色 CSS 变量
- 其余问题均在其他方案的职责范围内

---

## 方案 B: Sessions (glass-sessions)

### 评分

| 维度 | 分数 | 说明 |
|------|-----|------|
| 指南遵循度 | 8/10 | 修改范围内的文件严格遵循白色边框原则，所有 `border-input` / `border-border` 都替换为 `hsl(var(--glass-border-light) / var(--glass-border-opacity))`。没有使用 `dark:` 前缀。但未修改的文件中仍有大量残留。特别是 EnvList.tsx 中有 `text-rose-500 dark:hover:bg-rose-900/20`，Skills.tsx 中有 `text-red-500 dark:hover:border-red-700`，Settings.tsx 中有 `text-emerald-500`。 |
| 像素级精度 | 9/10 | 覆盖面极广 -- 8 个文件被修改，从 SessionCard 的状态点光晕、按钮的 glass 边框，到 ArrangeBanner 的分割按钮容器、LauncherQuickSection 的 checkbox 边框、popover 箭头颜色，每一个交互元素都被审计。特别好的细节：状态点加了 `box-shadow: 0 0 6px` 光晕，在玻璃表面上大幅提升可见性；destructive 按钮用 `bg-destructive/80 backdrop-blur-sm` 而非实色。 |
| 暗/亮模式兼容 | 7/10 | 大量使用 inline `style` prop 和 Tailwind arbitrary values 来实现 glass 效果。这些写法通过 CSS 变量自动适配暗/亮模式，技术上是正确的。但新增的 CSS 类只有 2 个（`glass-btn-outline` 和 `glass-btn-destructive`），且两者都没有 `.light` 变体。 |
| 代码质量 | 7/10 | 大量使用 inline `style` prop（至少 8 处）和超长的 Tailwind arbitrary values（如 `border-[hsl(var(--glass-border-light)/var(--glass-border-opacity))]`）。虽然 SUMMARY.md 解释了原因（Tailwind 的 `border-[--var]` 不包含 `hsl()` 包裹），但这导致代码可读性下降，且同样的模式在多个文件中重复出现而没有抽象为 CSS 类。对比方案 A 将重复模式抽象为 `glass-list-item`、`glass-indicator` 等 CSS 类，方案 B 的做法更零散。 |
| 创新性 | 8/10 | 状态点光晕效果是一个很好的创新 -- 在半透明玻璃表面上，纯色小圆点容易"沉"进去，加上 `box-shadow` 光晕后视觉锚定力大增。Semi-transparent destructive 按钮（`bg-destructive/80 backdrop-blur-sm`）完美遵循了"不要在玻璃上放砖头"的原则。Close All Dialog 的 `backdrop-blur-md` 也是一个好的判断。 |
| **加权总分** | **7.85/10** | |

### 优点

- **覆盖面最广**：8 个文件被修改，Sessions 页面的每一个交互元素都被审计
- **状态点光晕**：`box-shadow: 0 0 6px hsl(var(--success) / 0.4)` 在玻璃表面上显著提升可见性
- **Semi-transparent destructive 按钮**：`bg-destructive/80 backdrop-blur-sm` 完美遵循设计指南
- **Popover 箭头颜色修复**：从 `hsl(var(--surface-overlay))` 改为 `hsl(var(--glass-bg)/0.66)` 匹配 frosted-panel 背景
- **设计决策文档清晰**：SUMMARY.md 详细解释了为什么用 `style` prop、为什么用 `variant="ghost"` + className

### 问题

1. **inline style 过多**：至少 8 处使用 `style={{ border/borderTop/boxShadow: '...' }}`，降低了代码可读性和可维护性
2. **Tailwind arbitrary values 过长**：`border-[hsl(var(--glass-border-light)/var(--glass-border-opacity))]` 这样的类名在 JSX 中非常难读
3. **新增 CSS 类太少**：只有 `glass-btn-outline` 和 `glass-btn-destructive`，大量重复的 glass 边框模式没有抽象为可复用的 CSS 类
4. **`glass-btn-outline` 和 `glass-btn-destructive` 缺少 `.light` 变体**
5. **未修改文件中的残留**（不在本方案职责范围）：Dashboard.tsx、Environments.tsx、Settings.tsx、EnvList.tsx、Skills.tsx、ProjectList.tsx 中均有 `border-border`、`bg-card`、`bg-muted`、`dark:` 和 Tailwind 颜色残留

### 建议修复

- 将重复的 glass 边框模式抽象为 CSS 类（如 `glass-separator`、`glass-border-top`）
- 为 `glass-btn-outline` 和 `glass-btn-destructive` 添加 `.light` 变体
- 将 inline `style` prop 中的 `boxShadow` 模式抽象为 CSS 类

---

## 方案 C: Environments + Skills + Settings (glass-env-skills-settings)

### 评分

| 维度 | 分数 | 说明 |
|------|-----|------|
| 指南遵循度 | 9/10 | 修改范围内的 4 个文件（Environments.tsx, EnvList.tsx, Skills.tsx, Settings.tsx）严格遵循指南：白色边框（`glass-divider`、`glass-env-card`、`glass-mode-card`）、CSS 变量（无 `dark:` 前缀）、4 级圆角（env card = 2xl, mode card = lg, control = md）。Settings 页面的 theme/language switcher 用了 `seg-active`/`seg-hover` 分段控件，完美遵循"浮起而非填色"原则。唯一的 `dark:` 残留在 Analytics.tsx（不在修改范围内）。 |
| 像素级精度 | 9/10 | 每个元素都被仔细打磨：环境卡片用了专门的 `glass-env-card`（带 `.active` 状态的 primary 光晕）；权限模式卡片用了 `glass-mode-card`（hover 浮起 + active 缩放 1.02）；图标容器用了 `glass-icon-container`（blur 8px）；badge 用了 `glass-badge`；toggle 开关用了完整的 `glass-toggle`（带动画 knob + checked 状态蓝色光晕）；select 用了 `glass-select`（focus 时 primary 光环）。 |
| 暗/亮模式兼容 | 8/10 | 所有新增 CSS 类都通过 CSS 变量自动适配暗/亮模式。但有几个类没有显式的 `.light` 变体：`glass-mode-card`、`glass-env-card`、`glass-toggle`、`glass-select`、`glass-icon-container`、`glass-badge` 都依赖基础 CSS 变量的暗/亮差异，没有像基准代码中的 `.light .glass-card` 那样为亮色模式单独调整阴影。虽然大多数情况下可以工作，但亮色模式下的阴影精细度可能不如方案 A。 |
| 代码质量 | 9/10 | 新增了 8 个 CSS 类，命名一致（`glass-` 前缀），结构清晰。`glass-mode-card` 和 `glass-env-card` 都有完整的 hover/active 状态。`glass-toggle` 是一个完整的自定义组件（track + knob + checked 动画），代码质量很高。Settings 页面的 `ToggleSetting` 组件封装了 toggle 的 a11y（`role="switch"`, `aria-checked`）。delete 按钮用 `text-destructive hover:bg-destructive/10` 替换了 `text-rose-500 dark:hover:bg-rose-900/20`。 |
| 创新性 | 9/10 | **`glass-toggle` 开关**是三个方案中最有创意的新组件 -- 完整的玻璃拟态 toggle（glass track + animated knob + checked 时蓝色光晕），远超简单的 CSS 替换。**`glass-mode-card` 的 active 状态**用了 `transform: scale(1.02)` + primary 光晕环，创造了"选中卡片浮起"的效果。**`glass-select`** 的 focus 状态用了 `0 0 0 2px hsl(var(--primary) / 0.15)` 光环，比默认的 `ring` 更符合玻璃美学。Settings 页面从原生 checkbox 改为 segmented control + glass toggle，是一次完整的交互升级。 |
| **加权总分** | **8.85/10** | |

### 优点

- **修改范围内零 `dark:` 前缀**：所有 4 个修改文件中没有任何 `dark:` 前缀
- **修改范围内零 Tailwind 硬编码颜色**：`text-rose-500` -> `text-destructive`，`text-emerald-500` -> `text-success`
- **8 个新增 CSS 类**，覆盖了环境卡片、权限卡片、toggle、select、divider、icon container、badge、outline button
- **`glass-toggle` 组件**：完整的玻璃拟态 toggle 开关，带 a11y 支持
- **Settings 页面交互升级**：从原生 checkbox/radio 改为 segmented control + glass toggle
- **EnvList 的 active 状态**：primary 光晕环 + 蓝色图标容器光晕，视觉层次清晰

### 问题

1. **缺少显式 `.light` 变体**：`glass-mode-card`、`glass-env-card`、`glass-toggle`、`glass-select` 等都没有像 `.light .glass-card` 那样为亮色模式单独调整阴影。虽然基础 CSS 变量会自动适配，但亮色模式下的阴影精细度可能不如方案 A
2. **Ghost card 用了 inline style + onMouseEnter/onMouseLeave**：`Environments.tsx:93-100` 用 JS 事件处理器实现 hover 效果，而非 CSS `:hover`。这在 React 中可以工作，但不如 CSS 类优雅，且在快速移动鼠标时可能有状态不同步的风险
3. **未修改文件中的残留**（不在本方案职责范围）：Dashboard.tsx、ProjectList.tsx、App.tsx、SessionsCard.tsx、Analytics.tsx 中均有 `border-border`、`bg-card`、`dark:` 残留
4. **`glass-btn-outline` 与方案 B 的同名类实现不同**：方案 C 的版本有半透明背景 `hsl(var(--glass-bg) / calc(var(--glass-bg-opacity) * 0.3))`，方案 B 的版本是 `background: transparent`。合并时需要统一

### 建议修复

- 为 `glass-mode-card`、`glass-env-card` 添加 `.light` 变体（至少调整阴影）
- Ghost card 的 hover 效果改为 CSS 类（如 `glass-ghost-card`）
- 与方案 B 协调 `glass-btn-outline` 的实现（建议采用方案 C 的版本，因为半透明背景在玻璃表面上更好）

---

## 总排名

| 排名 | 方案 | 加权总分 | 核心优势 |
|------|------|---------|---------|
| 1 | **方案 A: Dashboard** | **8.85/10** | CSS 类抽象最干净，暗/亮模式覆盖最完整，代码可维护性最高 |
| 1 | **方案 C: Env+Skills+Settings** | **8.85/10** | 创新性最高（glass-toggle），CSS 类最丰富（8 个），交互升级最大 |
| 3 | **方案 B: Sessions** | **7.85/10** | 覆盖面最广（8 个文件），像素级精度高，但 inline style 过多、CSS 类抽象不足 |

**方案 A 和方案 C 并列第一**，各有侧重：A 在代码质量和暗/亮模式精细度上略胜，C 在创新性和组件丰富度上略胜。方案 B 的审计覆盖面令人印象深刻，但代码组织方式（大量 inline style 和超长 arbitrary values）拉低了整体分数。

---

## 合并建议

### 可以直接合并吗？

**不能直接合并**。三个方案各自修改了 `index.css`，新增的 CSS 类有命名冲突（`glass-btn-outline` 在方案 B 和 C 中实现不同）。

### 合并步骤

1. **先合并方案 A**（Dashboard）：它的 `index.css` 改动最干净，新增类不与其他方案冲突
2. **再合并方案 C**（Env+Skills+Settings）：它的 `index.css` 新增类最多，且 `glass-btn-outline` 实现更好（有半透明背景）
3. **最后合并方案 B**（Sessions）：
   - 删除方案 B 的 `glass-btn-outline`（使用方案 C 的版本）
  的 `glass-btn-destructive`
   - **重点重构**：将 Sessions 组件中的 inline `style` prop 和超长 arbitrary values 抽象为 CSS 类

### 合并前必须修复

| 优先级 | 问题 | 方案 |
|--------|------|------|
| P0 | `glass-btn-outline` 命名冲突 -- 统一为方案 C 的实现 | B + C |
| P1 | 方案 B 的 inline style 重构为 CSS 类 | B |
| P1 | 方案 C 的 ghost card hover 改为 CSS 类 | C |
| P2 | 方案 B/C 的新增 CSS 类添加 `.light` 变体 | B + C |
| P2 | 三个方案未触及的共享文件残留清理（App.tsx, Analytics.tsx 等） | 全部 |
