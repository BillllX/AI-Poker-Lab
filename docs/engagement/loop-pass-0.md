# Pass 0 — 基线审计

> Texas Poker Club 玩家参与感 Loop 精进 · 2026-06-21

## 产品定位

- **人类** = 教练 / 实验员 / 观众（主路径）
- **AI Agent** = 场上选手（external / hosted / resident / virtual）
- **真人桌** = 第二条「自己下场」实验线（`/human-table`）

## 参与感三角（估分）

| 维度 | 定义 | 得分 | 依据 |
|------|------|------|------|
| 参与度 | 用户多久做一次有意义动作 | 中 | 快速开赛后偏被动观战；Coaching API 无主观战 UI |
| 参与感 | 「这是我的牌手」归属感 | 中高 | mineBadge、我的牌手面板、Agent 主页 |
| 情绪价值 | 峰值 moment + 事后回味 | 中 | 赢家 overlay、升榜庆祝有；复盘/通知/牌力展示弱 |

## 已有情感资产

- 快速开赛 → 自动跳转观战（`hostedAgents.ts`）
- 大厅/观战「我的牌手」高亮 + 座位视角旋转
- 音效体系（`audioManager.ts` / `tableSoundEvents.ts`）
- 排行榜升降庆祝（`leaderboard/page.tsx`）
- Agent 公开主页 + 徽章 + 牌手卡
- 真人桌 5 手复盘（`HumanHandSummary`）

## 营销 vs 实现断层

| 承诺 | 位置 | 状态 |
|------|------|------|
| 服务端牌力分析展示 | 首页 `tablePreviewText` | `handAnalysis` 仅 Agent 决策用 |
| 观战 Coaching | 首页 flow copy | API 有，主观战页未接 |
| 今日奖励榜 | `dailyProfitTitle` | 数据有，首页未渲染 |
| Live 牌桌预览 | `tablePreview*` | CSS 有，JSX 未渲染 |
| Coach Card / 复盘 | Agent 页 `nextStep` | 占位文案 |
| 局内社交 | — | 不存在 |

## 两线体验割裂

- AI 桌：无 `yourTurn` / `myAgentDeciding` 音、无 seat WIN 高亮
- 真人桌：有 WIN 高亮、复盘、yourTurn；不在 BottomNav
- Reasoning 混在日志流，`lastReasoning` 未在座位 UI 展示

## Loop 后续 Pass 输入

- Pass 1：情绪旅程 + 12 peaks（gpt-5.5-medium）
- Pass 2：四页 UX 变更 + 共享组件（composer-2.5-fast）
- Pass 3：P0–P3 技术分解（gpt-5.3-codex）
- 合成：`ENGAGEMENT_ROADMAP.md` + `METRICS.md`

## P0 实现范围（本 Sprint）

1. 观战页 Coach Dock → `POST /api/users/me/agent/coaching`
2. `lastReasoning` 座位 + 日志高亮
3. 首页：Live 预览 + 今日奖励榜 + 实验积分榜
4. AI 桌 `winningSeat` + `myAgentDeciding` 音效
