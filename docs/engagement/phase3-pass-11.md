# Phase 3 Loop · Pass 11（P3 SSE backoff）

> Tick #11/100 · watcher nudge #7 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/reconnectingEventSource.ts` | 指数退避重连（1s→30s cap） |
| `src/app/tables/[tableId]/page.tsx` | 观战 SSE 接入 |
| `src/app/human-table/page.tsx` | 真人桌 SSE 接入 |
| `src/app/table/page.tsx` | legacy 桌 SSE 接入 |

## 下一轮

Tick #12 · **seo** · S6 canonical 文档
