# Texas Poker Club 视觉 UI/UX 审查

> 审查日期：2026-06-21  
> 范围：`page.tsx` / `home.module.css`、`tables/[tableId]/page.tsx` / `table.module.css`、`CoachDock.tsx`、`BottomNav.tsx`；并 skim `me/page.tsx`、`human-table/page.tsx`  
> 方法：静态代码与样式层叠分析（wireframe 级），未改业务代码。

---

## 总览

当前产品已形成「俱乐部绿金」主视觉，但首页 engagement 区块、牌桌侧栏与全局 BottomNav 的间距/层级仍有多处不一致。AI 观战桌（`/tables/[tableId]`）与真人桌（`/human-table`）共用 `table.module.css`，功能差异大，移动端信息架构不对齐。

**优先修复方向（P0→P2）：**

| 优先级 | 主题 | 影响 |
|--------|------|------|
| P0 | 移动端 BottomNav + footer + 页面 `padding-bottom` 三重叠加不一致 | 侧栏底部、Coaching 提交、首页末段被挡 |
| P0 | AI 牌桌 `<760px` 缺少 `mobileTableStatus`，header 信息被隐藏 | 观战核心状态不可见 |
| P1 | 首页 Top3 / activityCard / tablePreview / leaderboards 视觉与语义重复 | 首屏以下滚动疲劳、转化路径不清 |
| P1 | `sidePanel` 过长且无折叠/Tab，CoachDock 埋在中段 | Coaching 核心动作难发现 |
| P2 | 遗留 cyan 色值与 `home.module.css` 多层 override 冲突 | 品牌不统一、维护成本高 |

---

## 1. 逐页 Wireframe 级问题

### 1.1 首页 `/` — `page.tsx` + `home.module.css`

#### 布局骨架（当前 DOM 顺序）

```
[Hero: 标题 + CTA]
→ [Top 3 排行榜卡片]
→ [activityCard 横幅]
→ [flowSection: tablePreview 面板]
→ [leaderboardsSection: 今日榜 + 积分榜]
→ [advancedSection: Agent 接入]
→ [section: 牌手卡 showcase]
[Modal: Quick Play / 注册]
```

#### 间距与容器宽度

| 问题 | 现象 | 根因（文件） |
|------|------|----------------|
| 内容宽度不统一 | Hero / activityCard `max-width: 1360px`，其余区块 `1180px`，左右边距视觉不齐 | `home.module.css` `.hero`、`.activityCard` vs `.topLeaderboardSection`、`.flowSection` |
| activityCard 横向「溢出感」 | 大屏下 activity 卡片比上下 section 更宽，像贴条横幅 | `.activityCard { max-width: 1360px }` 无与 hero 同步的 `margin` 节奏 |
| Section 垂直节奏偏紧 | Top3 → activity → preview 连续三块高信息密度卡片，无分隔标题或 `margin-top` 变量 | 各 section 仅 `padding-top: 18–30px`，未用统一 `--space-section` |
| 页底与 BottomNav | 移动端正文 `padding-bottom: 132px`，但 footer 备案区另加 `calc(112px + safe-area)` | `home.module.css` `@media 640` + `globals.css` `.siteFilingFooter`；**首页无 footer 内容却仍占滚动高度** |

#### 信息层级

| 问题 | 现象 | 根因 |
|------|------|------|
| Hero 信息不完整 | 仅有 eyebrow + 超大 title + 两个 CTA；`heroSubtitle`、`heroSignals` 文案已定义未渲染 | `page.tsx` L845–855 未输出 `t.heroSubtitle` / `t.heroSignals` |
| Top3 与下方双榜重复 | 首屏下立即出现 Top3，再出现今日榜/积分榜，排名语义重复三次 | `page.tsx` L859–886 + L973–1036 |
| flowSection 标题错位 | Section 用 `flowEyebrow` + **`tablePreviewTitle`**，「三步开始训练」(`flowTitle`) 未使用 | `page.tsx` L897–904；用户以为整块都是「直播预览」而非流程说明 |
| tablePreview 内 stat 重复 | `matchStatGrid` 第一行三项含「观测/复盘/迭代」，第三项又是「观测」 | `page.tsx` L913–925 |
| leaderboards 标题双写 | 外层 `sectionHeader` 与内层 `leaderboardHeader` 都显示 `dailyProfitTitle` | `page.tsx` L974–984 |

#### 移动端（≤640px）

| 问题 | 现象 | 根因 |
|------|------|------|
| Top3 文案被裁 | `topLeaderboardHeader p` 被 `display: none` | `home.module.css` L2516–2518 |
| activityCard badge 换行 | 纵向 stack 后右侧 `activityBadge` pill 仍 `white-space: nowrap`，小屏可能横向溢出 | `.activityCard > span` L1278–1287 |
| tablePreview 牌桌装饰 seat 隐藏 | 预览椭圆桌四座位 `display: none`，只剩中心三张牌，「牌桌感」弱 | `home.module.css` L2006–2008 |
| Quick Play 弹窗与 BottomNav | `max-height: calc(100vh - 108px)`，底部 nav ~72px + safe area，提交区可能被挡 | `home.module.css` L2106–2110 |
| 首页无顶栏 | `MobileTopNav` 在 `/` 返回 null，首屏仅靠 hero CTA，无全局返回/语言入口 | `MobileTopNav.tsx` L32–34 |

#### Wireframe 示意（移动端问题）

```
┌─────────────────────────┐
│ Hero (title 很大)        │
│ [快速开赛] [观看牌桌]     │
├─────────────────────────┤
│ Top3 ×3 紧凑列表          │  ← 说明文字被隐藏
├─────────────────────────┤
│ activityCard (金边横幅)   │  ← 色温与上下区块不一致
├─────────────────────────┤
│ tablePreview 长面板       │  ← stat 网格 + 假牌桌 + 直播桌
│   (matchStat ×2 重复)    │
├─────────────────────────┤
│ 今日榜 | 积分榜           │
├ ... advanced / showcase  │
├─────────────────────────┤
│ 备案 footer (高 padding)  │  ← 与 BottomNav 之间空白过大
├─────────────────────────┤
│ [主页][榜][竞技场][登录]   │  ← fixed BottomNav z-index 50
└─────────────────────────┘
```

---

### 1.2 AI 观战牌桌 `/tables/[tableId]` — `page.tsx` + `table.module.css`

#### 布局骨架

```
[header: 桌名 + 状态 subtitle + Leave + Sound]
[layout grid]
  ├─ tableArea: 椭圆桌 + tableInfoBar
  └─ sidePanel (stack)
       ├─ myPlayer panel (条件)
       ├─ CoachDock (条件)
       ├─ chipChange panel
       └─ recentActions panel
[winnerOverlay 固定层]
```

#### 桌面（>1180px）

| 问题 | 现象 | 根因 |
|------|------|------|
| 侧栏固定 340px + 主列 `minmax(720px,1fr)` | 总宽约 1060px 起，小笔记本横向易挤 | `table.module.css` L183–188 |
| 牌桌 `min-width: 680px` | `<1180` 前就可能出现 tableArea 横向滚动 | `.table` L261 |
| 信息重复 | header `subtitle` 与 `tableInfoBar` 四 pill 内容高度重叠 | `page.tsx` L290–292 + L372–377 |
| sidePanel 无最大高度/粘性 | 日志列表 `max-height: 450px` 仅 desktop；Coaching 夹在中间需长滚动 | `.logList` L599–604 |

#### 平板 / 移动（≤760px）

| 问题 | 现象 | 根因 |
|------|------|------|
| subtitle 隐藏但无替代 | `.subtitle { display: none }` | `table.module.css` L1619–1621 |
| **缺少 mobileTableStatus** | 真人桌有 `mobileTableStatus` 四 pill；AI 桌 header 未渲染等价结构 | `human-table/page.tsx` L551–556 vs `[tableId]/page.tsx` 无对应 DOM |
| headerActions 绝对定位 | Leave + Sound 浮在右上，长桌名可能与按钮重叠 | `table.module.css` L1607–1611 |
| sidePanel 顺序靠 CSS nth-child | 假定 child 1–3 固定类型；无 myPlayer 时 CoachDock 不渲染，order 规则仍按 panel 序号 | `table.module.css` L2032–2042 |
| 页底 padding 178px | 高于全局 body 108px，但与 BottomNav + footer 仍可能挡最后一条 log | `.page` L1583–1586 |
| 座位信息过载 | 112px 宽 seat 仍含 reasoning snippet、chipDelta 隐藏、hole cards 缩小 | 多处 `@media 760` seat 规则 |

#### Wireframe（移动端 AI 桌）

```
┌─ MobileTopNav: 返回大厅 ─────────┐
│ header (subtitle 隐藏!)          │
│                    [Leave][🔊]   │
├──────────────────────────────────┤
│         ╭── 椭圆牌桌 ──╮          │
│         │  pot / phase  │          │
│         ╰───────────────╯          │
│ [pot][hand][bet][谁在思考]  ← bar  │  ← 与 header 重复但仅此可见
├──────────────────────────────────┤
│ sidePanel (整页继续向下)          │
│  ┌ 我的牌手 ─────────────┐       │
│  ┌ Coaching textarea ────┐       │  ← 需滚过牌桌才看到
│  ┌ 筹码变化 ─────────────┐       │
│  ┌ 行动日志 (仅3条) ─────┐       │
├──────────────────────────────────┤
│ BottomNav                        │
└──────────────────────────────────┘
```

---

### 1.3 CoachDock — `CoachDock.tsx`

| 问题 | 现象 | 建议方向 |
|------|------|----------|
| 视觉与普通 panel 同质 | 使用 `.panel` + `.coachingForm`，与筹码板/日志无层级差 | 独立 accent 边框或 dock 底栏 |
| 占用侧栏大块纵向空间 | textarea `min-height: 118px` + history 列表 | 移动 collapsible / sticky 提交条 |
| 无「仅当已 seated」以外的空态优化 | 未登录时整块不出现（由父级控制），已登录无 agent 时无 dock | 父级已处理，dock 本身 OK |
| 历史文案硬过滤 | `message.includes("Coaching")` | 非视觉问题，但列表常空时 panel 显空 |

---

### 1.4 BottomNav — `BottomNav.tsx` + `BottomNav.module.css` + `layout.tsx`

| 问题 | 现象 | 根因 |
|------|------|------|
| 全站 fixed，含牌桌页 | 观战时底部 permanent 占 ~56–72px | `BottomNav.module.css` L1–20；`layout.tsx` 全局挂载 |
| 与 body padding 不同步 | `body` 108px；home 132px；table 178px；footer 112px+ | 分散在 `globals.css`、`home.module.css`、`table.module.css` |
| 桌面也渲染 | `<640` 才全宽贴底；桌面为 floating pill，仍占 z-index 50 | 桌面影响较小，但牌桌页仍显示 |
| 活跃态匹配 | `/table` legacy 与 `/tables/*` 均高亮「竞技场」 | 逻辑正确；与 MobileTopNav 部分重复 |

**BottomNav 重叠估算（iPhone，safe-area-bottom ≈ 34px）：**

- Nav 高度：`8 + 56 + 8 + 34 ≈ 106px`
- body `padding-bottom: 108px` → **几乎贴边，无余量给 footer 或 sticky 按钮**
- table 页 `178px` 较安全，但 home `132px` + footer padding 仍可能双重空白

---

### 1.5 Skim：`/me`、`/human-table`

**`/me`**（`me.module.css`）

- 独立 `sidePanel` 双栏布局，与牌桌侧栏命名相同但样式文件不同，**用户从「我的牌手」进牌桌会感到 panel 密度与圆角体系相似但 spacing 不同**。
- 页面仍保留早期 cyan 渐变注释与 club override 混写，与首页同源问题。

**`/human-table`**

- 使用同一 `table.module.css`，具备 `mobileHeaderMain`、`mobileTableStatus`、`tableControlStack`（action dock）、`handReview` 侧栏。
- AI 观战桌缺少上述 mobile 增强与 hand review，是主要 parity 差距（见第 3 节）。

---

## 2. 首页新区块 cohesion：`activityCard` / `tablePreview` / `leaderboards`

### 2.1 叙事链断裂

设计意图应是：**每日实验（activity）→ 观看牌桌（preview）→ 排行榜激励（leaderboards）**。当前问题：

1. **Top3 插在 Hero 与 activity 之间**，用户先看到排名再看到「每日实验」文案，动机顺序颠倒。
2. **activityCard** 使用金绿渐变 + 金边 pill（`rgba(250,204,21,...)`），而 Top3 / preview / leaderboard 已统一为 `--surface-1` 绿金 club 面；activity 像「活动促销条」，不像同一 design system。
3. **tablePreviewPanel** 仍含大量 cyan accent（`#67e8f9` 链接、badge），与 `--accent: #76e4aa` 冲突。
4. **flowSection** 外层标题用 preview 文案，内部又有 LIVE badge + 假牌桌 + 真实 liveTables，**一层 section 混合「流程教育 / 产品演示 / 实时数据」三种语义**。

### 2.2 组件级不一致

| 元素 | Top3 | activityCard | tablePreview | leaderboards |
|------|------|--------------|--------------|--------------|
| 容器圆角 | 26px card | 28px | 30px panel | 28px card |
| 外层 max-width | 1180 | **1360** | 1180 | 1180 |
| Eyebrow 颜色 | `--accent` | `--accent` | cyan badge + accent 混用 | `--accent` |
| 移动端策略 | 改为单列 compact row | column stack | stat 单列 + 缩小牌桌 | 双列→单列 |
| CTA 样式 | 名字链接 | 无 CTA | `tablePreviewLink` pill | `viewFullLeaderboard` |

### 2.3 建议叙事顺序（仅 UX，非代码）

```
Hero + subtitle/signals
→ activityCard（每日实验一句 + CTA 快速开赛）
→ tablePreview（观战价值 + 1 张 live 桌 + 进入大厅）
→ Top3 或合并进 leaderboards 首屏 Tab
→ 今日榜 + 积分榜（避免三次排名）
→ advanced / showcase
```

### 2.4 Cohesion 修复要点（样式层）

- 统一 `--surface-activity` 或复用 `--surface-1`，去掉 activity 独立金边强度。
- 所有 section 使用同一 `max-width: 1180px` 与 `padding-inline: var(--space-page)`。
- `tablePreviewLink` / badge 改 var token，清除 `#67e8f9` 硬编码。
- 合并 Top3 与积分榜为「一个 section + Tab：总榜 / 今日」。

---

## 3. AI 桌 vs 真人桌视觉 parity 差距

共用：`table.module.css` 中 `.table`、`.seat`、`.sidePanel`、`.panel`、winner overlay 等。

| 维度 | AI `/tables/[tableId]` | Human `/human-table` | Gap |
|------|------------------------|----------------------|-----|
| Header 移动状态 | 仅隐藏 subtitle | `mobileTableStatus` 四 pill | **AI 缺失** |
| Header 结构 | 扁平 `div` + `headerActions` | `mobileHeaderMain` 包裹 | AI 未复用 DOM 结构 |
| 桌下控制区 | 仅 `tableInfoBar` | `tableInfoBar` + `tableControlStack`（action dock、invite、buy-in） | AI 无 control stack 容器 |
| 侧栏首屏 | myPlayer → Coach → chips → logs | logs → handReview | **信息优先级相反** |
| 侧栏复盘 | 无 hand summary | `handSummaryList` / `handSummaryCard` | AI 观战缺复盘 UI |
| 座位标签 | 链到 `/agents/[id]` | 纯文本 `strong` | 有意差异，但 mobile 上 AI 链接更难点 |
| Reasoning | seat snippet + panel block（cyan） | 无 | AI 独有；颜色未 token 化 |
| Coaching | `CoachDock` panel | 无 | AI 独有 |
| 当前行动者高亮 | mobile `currentSeat` 金色 | 同 CSS | 一致 |
| 空座位 mobile | hidden | hidden | 一致 |
| 顶部导航 | MobileTopNav → 返回大厅 | 无 tableId 顶栏 action | human 无等效返回（依赖 BottomNav） |
| 英文混用 | Leave 按钮 | 中文 copy | **AI 页 Leave 未 i18n** |

**结论：** 两桌「椭圆桌 + seat」视觉一致，但 **mobile 信息架构与侧栏能力不对齐**；真人桌已演进到「桌下 dock + 移动 status pills + 复盘」，AI 观战仍像 desktop 侧栏堆叠的 MVP。

---

## 4. 具体 CSS / 组件修改清单

以下仅列出可执行改动，**不含**本次已修改代码。

### P0 — 移动端挡内容与状态不可见

| # | 改动 | 文件 |
|---|------|------|
| 1 | 统一安全区：`body { padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 16px) }`，删除 page 级重复 padding | `globals.css`；移除 `home.module.css` L2456–2458、`table.module.css` L1583–1586 的 override |
| 2 | 定义 `:root { --bottom-nav-height: 72px; }`，BottomNav 与 footer 共用 | `globals.css`、`BottomNav.module.css` |
| 3 | AI 牌桌 header 增加与 human 相同的 `mobileHeaderMain` + `mobileTableStatus` 结构 | `tables/[tableId]/page.tsx` |
| 4 | Quick Play modal 底部留白改为 `calc(var(--bottom-nav-height) + safe-area + 24px)` | `home.module.css` `.quickPlayModal` |
| 5 | `siteFilingFooter`  mobile padding 与 body 对齐，避免 `112px + safe-area` 与 body 108px 双重计算 | `globals.css` L130–134 |

### P1 — 首页新区块 cohesion

| # | 改动 | 文件 |
|---|------|------|
| 6 | Hero 渲染 `subtitle` + `heroSignals`（或删 copy 减噪） | `page.tsx` |
| 7 | `.activityCard` `max-width` 改为 `1180px`，背景改为 `var(--surface-1)`，badge 用 `--warning` 弱边框 | `home.module.css` L1247–1287 |
| 8 | flowSection 标题改用 `flowTitle` + `flowText`；preview 专用文案移到 panel 内 | `page.tsx` L897–904 |
| 9 | 删除 matchStatGrid 第三项重复「观测」，或改为「进入观战」CTA 卡片 | `page.tsx` L913–925 |
| 10 | leaderboards 外层 sectionHeader 与 card 内标题二选一 | `page.tsx` L973–984 |
| 11 | 调整 DOM 顺序：activity → preview → leaderboards（Top3 并入 leaderboards） | `page.tsx` |
| 12 | `tablePreviewLink` / `.tablePreviewHeader > span` 颜色改 `var(--accent)` | `home.module.css` L554–617 |
| 13 | 新增 `--space-section: 28px`，统一 section 垂直间距 | `globals.css` + 各 section class |

### P1 — AI 牌桌侧栏与 CoachDock

| # | 改动 | 文件 |
|---|------|------|
| 14 | 移动侧栏：myPlayer + CoachDock 合并为 sticky 顶块或 Tab「牌手 / Coaching / 日志」 | `[tableId]/page.tsx` + 新 `TableSideTabs.module.css` 或扩展 `table.module.css` |
| 15 | CoachDock 使用 `.coachingPanel`（accent 左边框 + compact textarea 96px） | `CoachDock.tsx`、`table.module.css` |
| 16 | 移动 CoachDock sticky bottom：**位于 BottomNav 之上**（`bottom: calc(var(--bottom-nav-height) + 8px)`） | 新 dock 样式 |
| 17 | `reasoningBlock` / `.reasoningSnippet` cyan 改 `var(--accent)` | `table.module.css` L883–914 |
| 18 | Leave 按钮改用 copy `t.leaveTable` | `[tableId]/page.tsx` L296 |
| 19 | 桌面侧栏：`sidePanel { position: sticky; top: 16px; max-height: calc(100vh - 32px); overflow: auto }` | `table.module.css` |

### P2 — parity、清理与桌面

| # | 改动 | 文件 |
|---|------|------|
| 20 | AI 侧栏增加 `HandReviewList`（与 human-table 同组件），数据来自 snapshot | `[tableId]/page.tsx`、复用 `handSummary*` 样式 |
| 21 | 牌桌 layout 改为 `grid-template-columns: minmax(0,1fr) min(340px,30vw)`，去掉 `minmax(720px,1fr)` | `table.module.css` L183–188 |
| 22 | `.table` 去掉 `min-width: 680px`，改 `width: 100%; aspect-ratio` 自适应 | `table.module.css` L244–263 |
| 23 | 清理 `home.module.css` 未使用的 `.nav` / `.navLinks`（page 无 nav DOM）或恢复顶栏 | `home.module.css`、`page.tsx` |
| 24 | 合并 `home.module.css` 底部多次 `.page` / `.hero` override 为单一「club theme」块 | `home.module.css` L2141–2795 |
| 25 | BottomNav：牌桌页可选 `data-compact` 隐藏或仅图标模式（需 product 确认） | `BottomNav.tsx`、`layout.tsx` |
| 26 | 首页 mobile 恢复 Top3 一句说明（`topLeaderboardText` 单行 ellipsis 而非 `display:none`） | `home.module.css` L2516–2518 |

### 组件文件速查

| 路径 | 角色 |
|------|------|
| `src/app/page.tsx` | 首页结构与 engagement 区块 DOM |
| `src/app/home.module.css` | 首页视觉、mobile padding、theme override 层 |
| `src/app/tables/[tableId]/page.tsx` | AI 观战布局、sidePanel 组合 |
| `src/app/table/table.module.css` | 共享牌桌、侧栏、responsive seat |
| `src/components/CoachDock.tsx` | Coaching 表单 panel |
| `src/components/BottomNav.tsx` + `.module.css` | 全局 fixed 导航 |
| `src/app/layout.tsx` | BottomNav + footer 挂载点 |
| `src/app/globals.css` | `--space-*`、body padding、footer |
| `src/components/MobileTopNav.tsx` | 非首页顶栏 |
| `src/app/human-table/page.tsx` | parity 参考实现 |

---

## 5. 建议验收场景（改完后）

1. **iPhone SE / 14 Pro**：首页滚到底，末段 showcase 与 footer 不被 BottomNav 挡；Quick Play 可滚到提交按钮。
2. **AI 牌桌 mobile**：header 不可见 subtitle 时，`mobileTableStatus` 与 `tableInfoBar` 信息不重复且至少一处可见。
3. **Coaching 路径**：登录且有 myPlayer 时，进入桌页 1 次滚动内可看到 textarea + 提交。
4. **首页 cohesion**：activity / preview / leaderboard 同宽、同色温，排名区块不超过 2 屏。
5. **桌面 1280px**：AI 桌无横向滚动条，侧栏 sticky 可独立滚动日志。

---

## 6. 小结

首页 engagement 区块**功能齐全但叙事顺序与视觉 token 不统一**；牌桌页 **desktop 体验完整，mobile 仍缺 human-table 已具备的 status pills 与侧栏重组**。BottomNav 与分散的 `padding-bottom` 是当前最常见的**内容被挡**根因。建议先做 P0 间距与 AI mobile header，再做首页区块合并与 CoachDock 突出，最后补 AI hand review 达到 parity。
