# Loop 维护轮 #1/30

> 2026-06-21 · Tick #1 · P1 设计推进

## 本轮焦点：P1-T001 Agent 桌 per-hand 摘要

### 目标（情绪价值 · 赛后回味）

对齐真人桌 `HumanHandSummary`，让 AI 观战用户在侧边栏看到「最近 5 手」可读摘要，支撑 Agent 页 Coach Card（P1-T002）。

### 数据模型草案 `AgentHandSummary`（内存 ring → 后续 Prisma）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | `tableId-handId` |
| `tableId` | string | 桌 ID |
| `handId` | number | 手号 |
| `completedAt` | ISO string | 手结束时间 |
| `phaseAtEnd` | string | 结束街 |
| `pot` | number | 最终底池 |
| `heroAgentId` | string? | 当前用户 agent（若有） |
| `heroAction` | string? | 最后一行动作 |
| `heroReasoning` | string? | 截断至 120 字 |
| `heroNetChips` | number? | 本手筹码变化 |
| `highlight` | boolean | 大 pot / bad beat / river raise |
| `winners` | `{ playerId, name, amount }[]` | 与 human 桌一致 |

**highlight 规则（P2-T003 预对齐）**

- `pot >= 3 * bigBlind * seatedCount`
- 或 hero 在 river 有 raise/all-in
- 或 hero 领先入河牌却输掉 > 200 筹码

### SSE 扩展（不改 WebSocket）

在 `GameSnapshot` 增可选字段：

```typescript
handSummaries?: AgentHandSummary[]; // 最近 5 手，仅观战 SSE
```

- 写入点：`simulator.ts` hand end hook（`recordHandSummaryForTable`）
- 仅保留每桌 ring buffer 5 条，不落库 Phase 1
- Phase 2：Prisma `agent_hand_summaries` 表，按 `ownerUserId` 查询

### UI 落点

| 页面 | 组件 | 优先级 |
|------|------|--------|
| `/tables/[tableId]` | `HandReviewList` 侧边 panel | P1 |
| `/me` | 我的牌手最近摘要 | P1 |
| `/agents/[agentId]` | Coach Card 嵌入 3 条 highlight | P1-T002 |

### 与 METRICS 关联

- `spectator_session_length`：有复盘列表预期延长观战时长
- `return_within_24h`：赛后摘要 + 分享文案提升回访

### 真人桌对齐

- 复用 `human-table/page.tsx` 复盘列表样式 → 抽 `HandReviewList.tsx`
- BottomNav「练习」入口（P2-T002）与摘要「去真人桌练手」CTA 可共用 copy

## P0 状态更新

METRICS.md 中 P0 五项均已实现（代码已 merge），本轮将勾选状态同步至指标文档。

## 下一轮（Tick #2）建议

- P1-T003：`HandInsightPanel` 设计——摊牌后展示简化 `handAnalysis`（仅公开信息）
- 或 P1-T002：Agent 页 Coach Card 线框 + 数据依赖清单
