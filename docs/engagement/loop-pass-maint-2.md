# Loop 维护轮 #2/30

> 2026-06-21 · Tick #2 · P1 设计推进

## 本轮焦点：P1-T003 HandInsightPanel + P1-T002 Coach Card 线框

### HandInsightPanel（观战页 · 摊牌后牌力 reveal）

**触发条件**
- `phase === "showdown"` 或本手刚结束（`winnerReveal` 激活后 3 秒内）
- 仅展示**已公开**信息，不泄露他人 hole cards

**展示字段（来自 snapshot / 未来 SSE 扩展）**

| 字段 | 来源 | 观众文案示例 |
|------|------|-------------|
| `madeHand` | `handAnalysis.madeHand` | 「成牌：顶对 + A 踢脚」 |
| `boardTexture` | `handAnalysis.boardTexture` | 「牌面：湿润 / 有同花听牌可能」 |
| `draws` | `handAnalysis.draws` | 「听牌：无」 |
| `lastReasoning` | `players[].lastReasoning` | 我的牌手决策摘要 |

**数据路径（不改 WebSocket）**
1. Phase 1：仅当「我的牌手」摊牌可见时，在 `GameSnapshot` 为 hero 增 `heroHandAnalysis?: AgentDecisionHandAnalysis`（hand end 时写入一次）
2. Phase 2：其他玩家摊牌后仅显示 `winners[].handLabel`（已有 human 桌模式）

**组件 Props 草案**

```typescript
type HandInsightPanelProps = {
  handId: number;
  phase: string;
  heroName?: string;
  madeHand?: string;
  boardTexture?: string;
  draws?: string;
  reasoning?: string;
  visible: boolean;
};
```

**落点**：`/tables/[tableId]` sidePanel，位于 Coach Dock 与筹码变化之间。

---

### Coach Card（Agent 主页 · P1-T002）

**替换** `agents/[agentId]/page.tsx` 中 `nextStep` 占位文案。

**卡片内容（3 块）**

1. **最近 3 场 settlement** — 已有 `recentResults` API，展示 profit / hands / settledReason
2. **Coaching 生效统计** — 读 `runtimeInstructions` notes 中 Coaching 条数（需新 API 或 profile 扩展）
3. **1 条 highlight 手牌** — 依赖 P1-T001 `AgentHandSummary.highlight`

**布局**：profile 页战绩区上方，mobile 单列 stack。

---

## 与 METRICS 关联

| 峰值 | 组件 |
|------|------|
| 牌力 reveal (#6) | HandInsightPanel |
| 赛后回味 (#9) | Coach Card + HandReviewList |

## 真人桌

- HandInsightPanel 在 human-table **不展示**（玩家自己看牌）
- Coach Card 对 human 玩家 N/A；`/me` 可链「AI 线 Coach Card 示例」

## 下一轮（Tick #3）建议

- P1-T004：页内 Toast 设计（bust / 结算 / Top10）
- 或 P1-T001 实现 spike：`simulator.ts` ring buffer 原型
