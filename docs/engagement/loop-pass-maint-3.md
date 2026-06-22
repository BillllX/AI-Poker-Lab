# Loop 维护轮 #3/30

> 2026-06-21 · Tick #3 · P1 设计推进

## 本轮焦点：P1-T004 轻量 Toast + P1-T001 simulator 写入点

### 页内 Toast 通知（P1-T004）

**目标**：关键情绪节点主动触达，减少「盯着屏幕才看得到」的被动感。

| 事件 | 触发条件 | 文案（zh） | 页面 |
|------|----------|-----------|------|
| `agent_bust` | 我的牌手 stack → 0 / 离桌结算 | 「{name} 已清台，本局结算 {profit} 积分」 | 观战页 → 可选跳转 `/me` |
| `agent_settled` | 主动 leave 成功 | 「已离桌并结算，积分已回账」 | 观战页 |
| `rank_top10` | 结算后 rank API 返回 ≤10 | 「恭喜进入 Top 10！当前 #{rank}」 | `/me` 或跨页 sessionStorage |
| `coaching_applied` | 下一手 hero 首次行动且含 runtime note | 「你的 Coaching 已在本手生效」 | 观战页 |

**实现草案（仅设计）**

```typescript
type EngagementToast = {
  id: string;
  kind: "bust" | "settled" | "rank" | "coaching";
  message: string;
  expiresMs: number;
};
```

- 组件：`EngagementToastStack` 固定于页面 top-center，z-index 高于 winner overlay
- 跨页：bust/settled 写入 `sessionStorage.engagementToasts`，`/me` mount 时 drain
- **不**做浏览器 Push Notification（P3 可选）

**METRICS 挂钩**
- `return_within_24h`：bust toast 带「再开一局」CTA
- `time_to_first_coaching`：coaching_applied 正向反馈

---

### P1-T001 simulator 写入点（设计 spike）

**文件**：`src/lib/server/simulator.ts` — hand 结束回调（与 `recordAgentResults` 同级）

**伪代码**

```typescript
function onHandComplete(tableId: string, snapshot: GameSnapshot) {
  const summary = buildAgentHandSummary(snapshot);
  ringBufferForTable(tableId).push(summary); // max 5
  // snapshot 下次 SSE 携带 handSummaries
}
```

**`buildAgentHandSummary` 输入**
- `snapshot.handId`, `pot`, `phase`, `actionHistory`（本手 win 行）
- 各 player：`lastReasoning`, stack delta vs hand start
- highlight 规则见 `loop-pass-maint-1.md`

**内存结构**：`Map<tableId, AgentHandSummary[]>` on `TableManager`，桌 stop 时清空。

**验收（实现阶段）**
- 观战 SSE 每手结束后 `handSummaries.length` ≤ 5 且递增
- 不影响 WebSocket `decision_task` payload

---

## P1 进度汇总（Tick #1–3）

| 任务 | 设计状态 |
|------|----------|
| P1-T001 per-hand 摘要 | ✅ maint-1 + maint-3 写入点 |
| P1-T002 Coach Card | ✅ maint-2 |
| P1-T003 HandInsightPanel | ✅ maint-2 |
| P1-T004 Toast | ✅ maint-3（本轮） |

**P1 设计文档已齐，可进入实现评审。**

## 下一轮（Tick #4）建议

- P2-T001 reaction 条 API 草案
- 或 P1 实现顺序排期 + 估时（1 PR / 任务）
