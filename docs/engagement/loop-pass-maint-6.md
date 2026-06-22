# Loop 维护轮 #6/30

> 2026-06-21 · Tick #6 · P2-T003 高光规则 + P1 实现 Checklist

## 本轮焦点：highlight 手牌规则定稿

与 P1-T001 `AgentHandSummary.highlight` 字段对齐（见 loop-pass-maint-1）。

### 自动标记规则（任一满足即 `highlight: true`）

| 规则 ID | 条件 | 标签（zh） |
|---------|------|-----------|
| H1 | `pot >= 4 * bigBlind * max(2, seatedCount)` | 大底池 |
| H2 | hero river 行动为 raise/all-in 且本手盈亏 ≤ -150 | 河牌激斗 |
| H3 | hero 摊牌领先（madeHand 强度 top2）却输掉 ≥ 200 筹码 | Bad Beat |
| H4 | hero 本手盈亏 ≥ +400 | 大赢 |
| H5 | 本手出现 ≥2 次 all-in | 全下对决 |

**计算时机**：`simulator.ts` hand complete，`buildAgentHandSummary()` 内。

**UI**
- 观战 `HandReviewList`：highlight 行左侧 🔥 badge
- Agent 页 Coach Card：仅展示最近 1 条 highlight / session

**隐私**：H3 需摊牌后才可判定；未摊牌弃牌手不标 H3。

---

## P1 首 PR 实现 Checklist（供评审后开干）

### PR-1：`feat/agent-hand-summaries`

- [ ] `AgentHandSummary` type in `src/lib/poker/types.ts`
- [ ] `TableManager` ring buffer `Map<tableId, summary[]>`
- [ ] `buildAgentHandSummary()` + highlight 规则 H1–H5
- [ ] `GameSnapshot.handSummaries?: AgentHandSummary[]`
- [ ] `HandReviewList.tsx` + 观战页 sidePanel
- [ ] `npm run lint && npm run build && npm run test:lifecycle`

### PR-2：`feat/hand-insight-panel`（依赖 PR-1）

- [ ] `heroHandAnalysis` on snapshot at showdown
- [ ] `HandInsightPanel.tsx`

### PR-3：`feat/engagement-toasts`

- [ ] `EngagementToastStack.tsx`
- [ ] bust / settled / coaching_applied 触发

### PR-4：`feat/coach-card` + `feat/bottom-nav-practice`

- [ ] Agent 页 Coach Card
- [ ] BottomNav 第 5 项 `/human-table`

---

## Loop 累计（Tick 0–6）

| 阶段 | 设计覆盖 |
|------|----------|
| P0 | ✅ 已实现 |
| P1 | ✅ 设计 + checklist |
| P2 | Reaction(maint-4) + Nav(maint-5) + Highlight(maint-6) |

## 下一轮（Tick #7）建议

- P3 草图：持久化高光徽章 / streak
- 或 METRICS 前端打点 spec（`engagement.*` 事件 payload）
