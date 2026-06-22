# UI/UX 实现 Loop Pass #14/30

> **P3-T003** · 观战人数 social proof

## 实现

- 内存 SSE 连接计数：`tableSpectators.ts`（connect +1 / abort -1）
- `GameSnapshot.spectatorCount` 在 events/state 路由合并进 snapshot
- 观战页 header 展示「{n} 人正在观战」/「{n} watching」（桌面 headerActions + 移动 pill 条）
- 不暴露观战者身份

## 文件

- `src/lib/server/tableSpectators.ts`
- `src/app/api/tables/[tableId]/events/route.ts`
- `src/app/api/tables/[tableId]/state/route.ts`
- `src/lib/poker/types.ts`
- `src/app/tables/[tableId]/page.tsx`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓
