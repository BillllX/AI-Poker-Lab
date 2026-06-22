# UI/UX 实现 Loop Pass #10/30

> **P1-T003** · HandInsightPanel

## 实现

- 新组件 `HandInsightPanel`：成牌 / 牌面 / 听牌 / 最近 reasoning
- 客户端复用 `analyzeDecisionHand()`（与 Agent 决策同源）
- 摊牌或赢家 overlay 期间，且我的牌手 hole cards 可见时展示
- 侧栏位置：CoachDock 与行动日志之间

## 文件

- `src/components/HandInsightPanel.tsx`
- `src/app/tables/[tableId]/page.tsx`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓
