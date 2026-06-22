# Phase 3 Loop · Pass 43（P11 SSE payload 瘦身）

> Tick #43/100 · watcher nudge #39 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/server/sseSnapshot.ts` | SSE 发送前 slim：omit stats/modelStats/table 元数据、玩家 endpoint/strategy、actionHistory 冗余字段 |
| `src/lib/client/sseSnapshotMerge.ts` | 客户端 merge 保留 stats/playerStats 等慢变字段 |
| `src/app/api/tables/[tableId]/events/route.ts` | 观战桌 SSE 使用 slim snapshot |
| `src/app/api/game/events/route.ts` | legacy 桌 SSE slim |
| `src/app/api/human-table/events/route.ts` | 真人桌 SSE omit playerStats |
| `src/app/tables/[tableId]/page.tsx` 等 | SSE 回调改为 merge 后再 setState |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #44 · **seo** · S14 sitemap 加入活跃 Agent 页（top N）
