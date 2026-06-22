# Pass 2 — 四页 UX 线框 + 共享组件

> Texas Poker Club 玩家参与感 Loop · Wireframe 变更清单 · 2026-06-21  
> 模型：`composer-2.5-fast` · 输入：`loop-pass-0.md`（`loop-pass-1.md` 尚未落盘，本 Pass 以 Pass 0 三角估分 + 四页现状为准）

---

## 1. 本 Pass 目标

把 Pass 0 识别的「营销 vs 实现断层」「两线体验割裂」收敛为 **可落地的线框级变更**，并抽出 5 个跨页共享组件 + **BottomNav 真人桌发现**方案。不写实现代码，只定义：

- 区块在页面上的 **位置**（桌面 / 移动）
- 组件 **Props 草图**
- **文案统一**口径（zh / en 键名建议）

---

## 2. 现状快照（四页）

| 页面 | 路径 | 已有情感资产 | 主要缺口 |
|------|------|-------------|---------|
| 首页 | `/` | Top3 积分榜、快速开赛、风格预设 | `tablePreview*` / `dailyProfit*` copy 与 CSS 未渲染；无 Live 预览入口 |
| AI 观战 | `/tables/[tableId]` | 座位旋转、赢家 overlay、`SoundToggle` | 无 Coaching UI；`lastReasoning` 未展示；无 `myAgentDeciding` 音效；赢家无 seat WIN 高亮 |
| 我的牌手 | `/me` | 训练风格、最近比赛、真人桌入口（底部） | 复盘列表弱；Coaching 仅文案概念；无牌力/决策洞察 |
| 真人桌 | `/human-table` | `yourTurn` 音、WIN 高亮、5 手复盘、`actionDock` | **不在 BottomNav**；overlay/复盘/音效与 AI 桌 duplicated 未抽象 |

---

## 3. 信息架构原则（Wireframe 约定）

```
┌─────────────────────────────────────────────┐
│ MobileTopNav（非首页）                        │
├─────────────────────────────────────────────┤
│ 主内容区                                      │
│  ┌─ 牌桌区（tableArea）──────────────────┐   │
│  │  TableMomentOverlay（全屏峰值，z 最高） │   │
│  │  椭圆牌桌 + 座位                         │   │
│  │  tableInfoBar                           │   │
│  │  [真人] actionDock / [AI] CoachDock     │   │
│  └───────────────────────────────────────┘   │
│  sidePanel（桌面右栏 / 移动 bottom sheet）     │
│    HandInsightPanel → HandReviewList → 日志   │
├─────────────────────────────────────────────┤
│ BottomNav（含真人桌发现）                       │
└─────────────────────────────────────────────┘
```

- **峰值 moment** 一律走 `TableMomentOverlay`，不在各页内联 JSX。
- **教练/操作** 走底部 Dock（AI = `CoachDock`，真人 = 现有 `actionDock` 样式对齐）。
- **事后回味** 走 `HandReviewList`；**当局理解** 走 `HandInsightPanel`。
- **音效** 从 header 的 `SoundToggle` 升级为 `SoundProfile`（仍可在 header 放 compact 入口）。

---

## 4. 共享组件 Props 草图

### 4.1 `TableMomentOverlay`

统一 AI 桌与真人桌的赢家展示、可选扩展全下/升榜等 moment。

```tsx
type TableMomentKind = "handWin" | "myAgentWin" | "rankUp" | "allIn" | "bust";

type TableMomentOverlayProps = {
  /** 控制显隐；父组件负责 timer / handId 去重 */
  open: boolean;
  kind: TableMomentKind;
  handId?: number;
  /** 赢家列表；handWin / myAgentWin 必填 */
  winners?: Array<{
    playerId: string;
    name: string;
    amount: number;
    handLabel?: string; // 真人桌摊牌牌型
    isMine?: boolean;
  }>;
  /** AI 桌：高亮座位 id 集合（替代 human-table 内联 winningSeat） */
  highlightPlayerIds?: string[];
  /** 展示节奏：human-table 现有「延迟 3s 再 overlay」 */
  revealDelayMs?: number; // default 0；human 建议 3000
  autoDismissMs?: number; // default 3000
  onDismiss?: () => void;
  /** i18n 文案包，见 §8 */
  copy: TableMomentCopy;
  /** 触发关联音效 */
  soundProfile?: Pick<SoundProfileState, "enabled" | "categories">;
};
```

**线框（mobile / desktop 同构）**

```
        ┌─────────────────────┐
        │        🏆           │
        │  eyebrow: 本局赢家   │
        │  Hand #42           │
        │  ─────────────────  │
        │  Alice  +1,200      │
        │  胜利原因: 两对      │  ← handLabel 可选
        │  [继续观战]          │  ← 可选 CTA，默认 auto-dismiss
        └─────────────────────┘
   背景：半透明 + 赢家 seat 仍可见 WIN badge
```

**页面接入**

| 页面 | kind | 替换对象 |
|------|------|---------|
| `/tables/[tableId]` | `handWin` / `myAgentWin` | 内联 `winnerOverlay` section |
| `/human-table` | `handWin` | 内联 `winnerReveal.overlayVisible` block |
| `/me` | `rankUp`（未来） | 与 leaderboard 庆祝联动，Pass 3 实现 |

---

### 4.2 `CoachDock`

观战页底部固定 Coaching 输入；对接 `POST /api/users/me/agent/coaching`。

```tsx
type CoachDockProps = {
  tableId: string;
  agentId?: string;
  /** 无 myPlayer 或观战他人时 collapsed */
  mode: "active" | "collapsed" | "hidden";
  appliesFromHandId?: number; // 成功后展示
  disabledReason?: "notLoggedIn" | "noAgentAtTable" | "handInProgress";
  onSubmit: (message: string) => Promise<{ appliesFromHandId: number }>;
  recentCoaching?: Array<{ message: string; appliesFromHandId: number; createdAt: string }>;
  copy: CoachDockCopy;
};
```

**线框 — `/tables/[tableId]` 桌面**

```
tableArea 底部（tableInfoBar 之下，sidePanel 不挡）
┌──────────────────────────────────────────────────┐
│ 💬 给下一手建议 · 从 Hand #43 起生效              │
│ ┌──────────────────────────────────────┐ [发送] │
│ │ 例如：翻后少追边缘听牌，位置好再 semi-bluff   │ │
│ └──────────────────────────────────────┘         │
│ 最近：Hand #41 · 「控池，别 overcall」            │
└──────────────────────────────────────────────────┘
```

**线框 — mobile**

- Dock 占 **sticky bottom**，在 `BottomNav` **之上**（`padding-bottom` 预留 56px + safe-area）。
- `mode=collapsed`：仅一行「展开 Coaching」；点击展开 textarea。

**与 `HandInsightPanel` 关系**：Insight 展示 AI **已做出的 reasoning**；CoachDock 写入 **下一手** runtime instruction，文案必须区分（见 §8）。

---

### 4.3 `HandInsightPanel`

把服务端 `handAnalysis`（决策侧）与公开 snapshot 的 `lastReasoning` 呈现给实验员。

```tsx
type HandInsightPanelProps = {
  variant: "spectator" | "human"; // human 桌暂无 Agent reasoning，可隐藏或只显示牌面摘要
  /** 仅 spectator + 有 myPlayer 时展示 reasoning */
  myPlayerId?: string;
  players: Array<{
    id: string;
    name: string;
    lastReasoning?: string;
    lastAction?: string;
    isMine?: boolean;
  }>;
  /** 若 SSE 未来推送 handAnalysis 公共字段则填入；Pass 3 可先只展示 reasoning */
  handAnalysis?: {
    madeHand?: string;
    draws?: string[];
    boardTexture?: string;
  };
  phase?: string;
  handId?: number;
  /** 折叠态：仅显示 myPlayer 一行摘要 */
  defaultExpanded?: boolean;
  copy: HandInsightCopy;
};
```

**线框 — `/tables/[tableId]` sidePanel 顶部（在「我的牌手」之上）**

```
┌─ 牌局洞察 ─────────────────────────┐
│ Hand #42 · turn                    │
│ ▼ 我的牌手 · Nova                  │
│   成牌：顶对 + 后门听花  ← handAnalysis 有则显示
│   决策：「位置好，半池 cbet…」       ← lastReasoning，限 3 行 + 展开
│   动作：raise 120                    │
│ ─ 其他座位（折叠）─                  │
└────────────────────────────────────┘
```

**座位联动（Pass 3）**：`lastReasoning` 非空时，对应 seat 卡片加 `reasoningPulse` 边框；与 Insight 点击 seat 互跳。

---

### 4.4 `HandReviewList`

从 `human-table` 的 `handSummaries` 抽组件；AI 桌与 `/me` 复用。

```tsx
type HandReviewItem = {
  handId: number;
  completedAt: string;
  communityCards: Card[];
  totalAwarded: number;
  winners: Array<{ name: string; playerId: string; amount: number; handLabel?: string }>;
  players: Array<{ name: string; playerId: string; netChips: number; holeCards?: Card[] }>;
  /** AI 桌扩展：关联 agentId / coaching 快照 */
  coachingSnapshot?: string;
  isHighlight?: boolean; // 大 pot / 我的牌手参与
};

type HandReviewListProps = {
  items: HandReviewItem[];
  maxVisible?: number; // default 5
  emptyCopy: string;
  /** 点击卡片：mobile 开 bottom sheet 详情 */
  onSelectHand?: (handId: number) => void;
  /** 是否展示 hole cards（真人桌 summary 有；AI 桌视权限） */
  showHoleCards?: boolean;
  copy: HandReviewCopy;
};
```

**线框 — 列表项**

```
┌ Hand #38 ─────────────── +840 ┐
│ [Ah][Kd][7c][2s][9h]           │
│ Bill +420 · 两对               │
│ Nova  -120 · Alice +300        │
└────────────────────────────────┘
```

**页面放置**

| 页面 | 位置 | 数据源 |
|------|------|--------|
| `/human-table` | sidePanel「最近复盘」 | 现有 `handSummaries` |
| `/tables/[tableId]` | sidePanel 新块，在日志之上 | Pass 3：`GET /api/tables/:id/hand-summaries` 或 snapshot 增量 |
| `/me` | `growthGrid` 内新 card，或替换 `recentMatches` 下半区 | `profile.recentResults` + 未来 hand 级 API |

---

### 4.5 `SoundProfile`

在 `audioManager` / `useTableSounds` 之上提供 **分类开关 + 解锁态**，替代裸 `SoundToggle`。

```tsx
type SoundCategory = "table" | "actions" | "moments" | "yourTurn" | "myAgent";

type SoundProfileState = {
  enabled: boolean;       // 总开关，对应现有 muted
  unlocked: boolean;
  categories: Record<SoundCategory, boolean>;
  /** 可选：音量预设 quiet | normal | loud */
  volumePreset?: "quiet" | "normal" | "loud";
};

type SoundProfileProps = {
  state: SoundProfileState;
  onChange: (next: SoundProfileState) => void;
  onUnlock: () => Promise<void>;
  /** compact：header 图标；panel：popover / sheet */
  variant: "compact" | "panel";
  copy: SoundProfileCopy;
};
```

**分类与现有音效映射**

| category | 音效 | AI 桌 | 真人桌 |
|----------|------|-------|--------|
| `table` | deal, blind | ✓ | ✓ |
| `actions` | bet/call/check/fold/raise/allin | ✓ | ✓ |
| `moments` | win | ✓ | ✓ |
| `yourTurn` | yourTurn | — | ✓ |
| `myAgent` | myAgentDeciding（Pass 0 P0 #4） | ✓ | — |

**线框 — panel（从 header 图标点开）**

```
┌ 牌桌音效 ────────────────┐
│ [●] 总音量                │
│ [✓] 发牌与盲注            │
│ [✓] 下注动作              │
│ [✓] 赢家时刻              │
│ [ ] 轮到我的 AI 决策      │  ← 仅 AI 观战且有 myPlayer
│ [✓] 轮到我行动            │  ← 仅 human-table seated
│ 预设：安静 · 标准 · 响亮   │
└──────────────────────────┘
```

**存储键建议**：`texas-poker-sound-profile`（JSON），迁移时读旧 `texas-poker-sound-enabled`。

---

## 5. 分页 Wireframe 变更清单

### 5.1 首页 `/`（`src/app/page.tsx`）

**目标**：补齐 Pass 0「Live 预览 + 今日奖励榜」，并把用户导向 **观战 → Coaching → 复盘** loop。

#### 区块 A — Hero 下方：`LiveExperimentPreview`（新 section）

- **位置**：`hero` 与 `topLeaderboardSection` 之间。
- **内容**：复用已有 copy `tablePreviewBadge/Title/Text/Link` + CSS `.tablePreviewPanel`。
- **线框**：

```
[LIVE EXPERIMENT]
AI 正在牌桌上接受压力测试
迷你牌桌静态/mock 或拉 `/api/tables` 第一桌缩略状态
[公共牌] [底池 420] [Hand #12]
→ 进入实验大厅
```

- **数据**：`refreshLeaderboard` 已拉 `agents` + tables；选 `running` 且 `playerCount>=2` 的第一桌 deep link 到 `/tables/:id`。

#### 区块 B — Top3 下方：`DailyRewardBoard`（新 section）

- **位置**：`topLeaderboardSection` 之后。
- **copy**：`dailyProfitTitle` / `dailyProfitText` / `todayProfit`。
- **线框**：横向 3 列（移动 1 列 stack），按 `dailyProfitToday` 排序；无数据时「等待今日第一笔结算」。

#### 区块 C — `engagementShowcase` 三步条

- **位置**：保留现有 `capabilities` section；在 `growthSteps` 增加第 4 步 **REVIEW**（copy 已有 `features[3]`）。
- **CTA**：「观看实验牌桌」→ `/tables`；登录用户 secondary → `/me`。

#### 区块 D — 不改动

- `advancedSection` 研究员模式、`quickPlayModal` 流程保持；Pass 2 不扩 scope 到注册 UX。

---

### 5.2 AI 观战 `/tables/[tableId]`

**目标**：从「被动日志流」变为「洞察 + Coaching + moment」观战台。

#### Header

| 元素 | 变更 |
|------|------|
| 左 | 保留 tableName / subtitle |
| 右 | `SoundProfile variant=compact` 替换 `SoundToggle`；有 myPlayer 时显示「我的牌手」pill |
| 导航 | `MobileTopNav` 已有返回大厅；补 **链接 `/me`** 当 myPlayer 存在 |

#### 牌桌区 `tableArea`

| 变更 | 说明 |
|------|------|
| `TableMomentOverlay` | 替换内联 overlay；`myAgentWin` 当 winners 含 myPlayer |
| Seat WIN | 与 human-table 对齐：`winningSeat` + `winBadge` |
| Seat reasoning | `lastReasoning` 非空：subtitle 1 行 + link 滚到 Insight |
| `CoachDock` | sticky bottom，`mode=active` 当 `myPlayer` 存在 |

#### SidePanel 顺序（桌面右栏 / mobile tabs）

1. `HandInsightPanel`（新）
2. 「我的牌手」面板（保留 join/leave）
3. `HandReviewList`（新，可先 empty + 占位 copy）
4. 筹码变化（保留）
5. 行动日志（保留；myPlayer 的 reasoning 行高亮）

#### Mobile 专项

- sidePanel 改为 **2-tab**：`洞察` | `日志`；Review 在洞察 tab 下半。
- `CoachDock` 与 `BottomNav` 叠层见 §6。

---

### 5.3 我的牌手 `/me`

**目标**：训练中枢 — 风格、战绩、复盘、真人桌入口同级可见。

#### Hero 区

- **保留** `playerHero` + metrics。
- **新增** 状态条：`训练中 · 在线比赛中 · 今日 +120`（已有 badges，统一 icon）。

#### 训练区

- **保留** `trainingCard` 风格编辑器。
- **新增** 内嵌 **迷你 `CoachDock`**（只读历史 + 跳转观战页编辑）：当 `primaryTableUrl` 存在时显示「在牌桌继续 Coaching →」。

#### 战绩区

| 变更 | 说明 |
|------|------|
| `HandReviewList` | 放在 `recentMatches` card 下方或合并；数据源先用 session 级，hand 级 Pass 3 |
| 空态 | 统一 copy：`noSettlements` → 加 CTA「快速开赛」 |

#### 真人桌发现

- **升级** `humanTablePanel`：从 `bottomActionGrid` 提升到 `growthGrid` 第二列 card，与「最近比赛」并列。
- **copy 统一**：见 §8 `humanTableDiscovery`。

#### 不纳入 Pass 2 线框

- Agent 凭证区、`journey` 链接保持原位置。

---

### 5.4 真人桌 `/human-table`

**目标**：与 AI 桌 **视觉/组件同源**，仅操作态不同。

#### Header

- eyebrow 统一为 **`HUMAN TABLE`**（zh：`真人牌桌`），与 AI 桌 `Texas Poker Table` 并列一套 `tableEyebrow` token。
- `SoundProfile compact` + seated 时 categories 含 `yourTurn`。

#### 牌桌区

| 变更 | 说明 |
|------|------|
| `TableMomentOverlay` | 替换 `winnerReveal`；保留 3s reveal delay + `handLabel` |
| `actionDock` | 保留；样式 token 与 `CoachDock` 同高同圆角 |
| WIN seat | 已存在，迁入 overlay 的 `highlightPlayerIds` |

#### SidePanel

| 顺序 | 组件 |
|------|------|
| 1 | 行动日志（可折叠，默认展开） |
| 2 | `HandReviewList`（替换内联 `handSummaryList`） |

- **不放置** `HandInsightPanel` / `CoachDock`（human 无 Agent coaching）。

#### 创建/加入面板

- 保持 `PasswordPanel`；表单 class 从 `coachingForm` 重命名为 `tableForm`（copy 统一，Pass 3  refactor）。

---

## 6. BottomNav 统一 — 真人桌发现

### 6.1 问题

Pass 0：`/human-table` 有完整 second-line UX，但 **BottomNav 无入口**；用户只能从 `/me` 底部小链接发现。

### 6.2 推荐方案：**5 项导航（插入「练习」）**

在「竞技场」与「我的牌手」之间增加第 4 项，原 profile 变第 5 项：

| 序 | href | zh | en | icon 语义 | active 规则 |
|----|------|----|----|-----------|-------------|
| 1 | `/` | 主页 | Home | 家 | `pathname === '/'` |
| 2 | `/leaderboard` | 排行榜 | Leaderboard | 杯 | exact |
| 3 | `/tables` | 竞技场 | Arena | 桌 | `/tables`, `/tables/*`, `/table` |
| 4 | `/human-table` | **练习** | **Practice** | 人手+牌 | `/human-table` |
| 5 | `/me` or `/login` | 我的牌手 / 登录 | My Player / Log in | 人 | `/me`, `/journey` |

**为何 label 用「练习」而非「真人桌」**

- 与产品定位「人类 = 教练/实验员」一致：真人桌是 **自己下场的实验线**，不是主路径。
- 缩短 BottomNav 两字宽度，避免 mobile 5 项溢出。

**Badge（可选 Pass 3）**

- `mySeatStatus === 'seated'` 且 `pendingDecision` → 红点「轮到你」。
- 未登录点击 → `/login?next=/human-table`。

### 6.3 备选方案（若 5 项过挤）

- **B1**：竞技场长按/secondary 菜单含「真人练习桌」— 发现性差，不推荐。
- **B2**：合并进 `/me` 的 hero CTA — 保留为 secondary，**仍须** BottomNav 第 4 项。

### 6.4 联动变更

| 组件 | 变更 |
|------|------|
| `BottomNav.tsx` | 新增 nav item + `HumanTableIcon` |
| `MobileTopNav` | `/human-table` 时 action →「我的牌手」或「竞技场」 |
| `layout` footer | 确认 `padding-bottom` 容纳 5 项 + Dock 叠层 |
| `/me` | `humanTablePanel` 文案改为「也可从底部导航进入练习桌」 |

---

## 7. 桌面 vs 移动线框差异摘要

| 区域 | Desktop (≥1024) | Mobile |
|------|-----------------|--------|
| sidePanel | 固定右栏 320–360px | bottom sheet 或 tabs |
| CoachDock / actionDock | tableArea 底 sticky | 同上 + 避开 BottomNav |
| TableMomentOverlay | 居中 card max-width 420px | 全宽 card，距 bottom 80px |
| SoundProfile | header popover | bottom sheet |
| HandReviewList | sidePanel 滚动 | 洞察 tab 内嵌 |

---

## 8. 文案统一（Copy Unification）

### 8.1 共享 token 表（建议键名 `engagementCopy.*`）

| 键 | zh（canonical） | en | 禁止混用 |
|----|-----------------|-----|---------|
| `tableEyebrow.ai` | 实验牌桌 | Lab Table | ~~Texas Poker Table~~（页面内改） |
| `tableEyebrow.human` | 真人牌桌 | Human Table | ~~Live Poker Room~~ |
| `moment.handWinners` | 本局赢家 | Hand Winners | 与 overlay 统一 |
| `moment.wonChips` | 赢得筹码 | Won chips | |
| `moment.winReason` | 胜利原因 | Winning hand | 仅 human + 有 handLabel |
| `insight.title` | 牌局洞察 | Hand Insight | ~~服务端牌力分析~~（营销语） |
| `insight.reasoning` | AI 决策说明 | AI reasoning | 对应 `lastReasoning` |
| `insight.madeHand` | 成牌 | Made hand | 来自 `handAnalysis.madeHand` |
| `insight.boardTexture` | 牌面结构 | Board texture | |
| `coach.title` | 给下一手建议 | Coach next hand | ~~Coaching~~ 作 eyebrow 可保留 |
| `coach.hint` | 从下一手生效，你不代打当前按钮 | Applies next hand; you don't click for the AI | 首页/flow 已有，三处一致 |
| `coach.placeholder` | 例如：翻后少追边缘听牌… | e.g. Fewer marginal calls postflop… | |
| `coach.appliesFrom` | 从 Hand #{n} 起生效 | Applies from Hand #{n} | API `appliesFromHandId` |
| `review.title` | 关键手复盘 | Key Hands | ~~最近复盘~~ / ~~Match Log~~ 二选一 |
| `review.empty` | 完成一手后，这里会沉淀可复盘战绩 | Completed hands will appear here | 与 `noHandSummaries` / `noSettlements` 合并 |
| `sound.title` | 牌桌音效 | Table sound | |
| `sound.myAgent` | 轮到我的 AI 决策 | My AI deciding | 新音效 P0 |
| `nav.practice` | 练习 | Practice | BottomNav 真人桌 |
| `humanTableDiscovery.title` | 自己下场练习 | Play hands yourself | me 页 card 标题 |
| `humanTableDiscovery.text` | 创建或加入只允许真人操作的牌桌 | Create or join a human-only table | 与 me 现有 `humanTableText` 对齐 |

### 8.2 语言风格

- **实验员视角**：「训练 / 实验 / 观战 / 建议 / 复盘」，避免「下注玩家」叙事。
- **积分**：一律「积分 / pts」，不提充值、真钱。
- **Agent 类型**：`托管 AI` / `本地 Agent` / `BOT` — 与 tables 页一致。
- **Hand #n**：中英文均保留 `Hand` + 数字，不翻译为「第 n 手」标题（副文可中文）。

### 8.3 待删除/降级表述

| 现文案 | 位置 | 处理 |
|--------|------|------|
| 「服务端牌力分析展示」 | 首页 `tablePreviewText` | 改为「牌局洞察与 AI 决策说明」直到 API 公开 handAnalysis |
| `Leave` | AI 桌 leave 按钮 | 改为 zh「离桌」/ en「Leave table」 |
| 英文-only SoundToggle label | `SoundToggle` | 迁入 `SoundProfileCopy` 双语 |

---

## 9. Pass 2 交付边界 / Pass 3 交接

**Pass 2 仅线框 + 组件契约，实现归属 Pass 3（`gpt-5.3-codex`）**

| 项 | Pass 2 | Pass 3 |
|----|--------|--------|
| 组件文件创建 | 契约 | `src/components/engagement/*` |
| Coaching API 接线 | CoachDock 定义 | fetch + optimistic UI |
| handAnalysis 公开 SSE | Insight 占位 | snapshot 字段 / 新 event |
| AI 桌 HandReview 数据 | 空态 UI | 新 API 或 log 聚合 |
| `myAgentDeciding` 音效 | SoundProfile 分类 | `audioManager` + `useTableSounds` |
| BottomNav 第 4 项 | 方案定稿 | `BottomNav.tsx` |
| i18n | 键名表 | 抽到 `engagementCopy.ts` 或扩展现有 copy |

**建议实现顺序（Pass 3 P0）**

1. `TableMomentOverlay` + AI 桌接入（立刻对齐 human WIN UX）
2. `CoachDock` + coaching API
3. `SoundProfile` + `myAgentDeciding`
4. BottomNav 练习项
5. 首页 Live 预览 + 今日奖励榜
6. `HandInsightPanel` + `lastReasoning` seat 高亮
7. `HandReviewList` 抽象 + human-table 迁移
8. `/me` 复盘区 + 真人桌 card 提升

---

## 10. 验收标准（Wireframe Done）

- [ ] 四页各有一张 **annotated wireframe**（可用本文 §5–§6 ASCII 作为初版）
- [ ] 5 个共享组件 **Props 表** 无歧义（本文 §4）
- [ ] BottomNav **5 项方案** 与 product 定位一致
- [ ] Copy token 表覆盖 **中英** 且与 Pass 0 营销断层逐项对应
- [ ] AI 线 / 真人线 **峰值 + 复盘 + 音效** 组件级同源，差异仅在 Dock 类型

---

*上游：`docs/engagement/loop-pass-0.md` · 下游：Pass 3 技术分解 → `ENGAGEMENT_ROADMAP.md`*
