# UI/UX 实现 Loop Pass #8/30

> **P1-T001 + HandReviewList** · AI 观战桌手牌复盘

## 实现

- `AgentHandSummary` 类型 + `buildAgentHandSummary()`
- `GameSimulator` 每手结束写入 ring buffer（最多 20 条），SSE snapshot 附带最近 5 条
- 新组件 `HandReviewList.tsx`（复用 human 桌样式）
- AI 观战侧栏：行动日志 → **最近复盘** → 筹码变化

## 文件

- `src/lib/poker/types.ts`
- `src/lib/poker/handSummary.ts`
- `src/lib/server/simulator.ts`
- `src/components/HandReviewList.tsx`
- `src/app/tables/[tableId]/page.tsx`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓
- `npm run test:lifecycle` ✓
