# Loop 维护轮 #9/30

> 2026-06-21 · Tick #9 · PR-1 实现就绪清单（设计冻结后）

设计已于 Tick #8 摘要；本轮细化 **PR-1 手牌摘要** 文件级改动，便于一键开干。

## 新增 / 修改文件

| 操作 | 路径 |
|------|------|
| 新增 type | `src/lib/poker/types.ts` → `AgentHandSummary` |
| 新增 builder | `src/lib/poker/agentHandSummary.ts` → `buildAgentHandSummary`, highlight H1–H5 |
| 修改 | `src/lib/server/simulator.ts` → `TableManager` ring buffer + hand end hook |
| 修改 | `src/lib/poker/gameEngine.ts` 或 simulator runner → 手结束回调（若已有 hook 则复用） |
| 新增组件 | `src/components/HandReviewList.tsx` |
| 修改 | `src/app/tables/[tableId]/page.tsx` → sidePanel 接入 |
| 修改 | `src/app/table/table.module.css` → 复盘列表样式（可复用 human-table 类名） |

## `GameSnapshot` 扩展

```typescript
handSummaries?: AgentHandSummary[]; // 最近 5，仅 SSE
```

**不改** WebSocket `decision_task` / `AgentDecisionRequest`。

## simulator 挂载点（调研）

- `GameSimulator` 手牌结束：搜 `handId` 递增或 `startHand` / hand complete 逻辑
- `TableManager.summaries()` / runner snapshot 合并 `handSummaries` from buffer

## 验收

- [ ] 观战页侧边「本局复盘」显示 ≤5 条
- [ ] highlight 手牌带 🔥
- [ ] `npm run lint && npm run build && npm run test:lifecycle`

## Tick #9 结论

**设计阶段可视为冻结**；Tick 10–30 若无新需求，建议 Loop 改为「仅记录 P1 实现进度」或 **停止 shell** 节省 wake。

## 下一轮（Tick #10）建议

- 用户确认后：**执行 PR-1 代码**（退出纯文档模式）
- 或：两线用户旅程对照表（human-table ↔ AI 观战切换场景）
