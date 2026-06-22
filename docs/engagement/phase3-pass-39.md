# Phase 3 Loop · Pass 39（P10 React.memo 热点 seat 组件）

> Tick #39/100 · watcher nudge #35 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/TableSeat.tsx` | `TablePlayerSeat` / `TableEmptySeat` + 自定义 props 比较；共享 seat 布局 helper |
| `src/app/tables/[tableId]/page.tsx` | 观战桌改用 memo seat 组件 |
| `src/app/human-table/page.tsx` | 真人桌改用 memo seat 组件 |
| `src/app/table/page.tsx` |  legacy `SeatCard` 包 `memo` |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #40 · **seo** · S13 noscript 关键内容 fallback
