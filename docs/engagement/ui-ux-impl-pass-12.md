# UI/UX 实现 Loop Pass #12/30

> **P2-T001** · 观战 Reaction 条

## 实现

- `POST /api/tables/[tableId]/reactions`：4 个 preset emoji（👏 🔥 😱 💪），限频 1 条/10s/用户、30 条/分钟/桌
- 内存 ring buffer：每桌最近 20 条；桌 reset/end 清空
- `GameSnapshot.recentReactions` 随 SSE snapshot 广播
- 观战页 `ReactionBar`：底栏按钮 + 2 秒 float 动画（不遮挡牌桌）

## 文件

- `src/lib/poker/reactions.ts`
- `src/lib/poker/types.ts`
- `src/lib/server/tableReactions.ts`
- `src/app/api/tables/[tableId]/reactions/route.ts`
- `src/lib/server/simulator.ts`
- `src/components/ReactionBar.tsx`
- `src/app/tables/[tableId]/page.tsx`

## 验证

- `npm run lint && npm run build` ✓
