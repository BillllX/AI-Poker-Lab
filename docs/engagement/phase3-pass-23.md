# Phase 3 Loop · Pass 23（P6 tables limit）

> Tick #23/100 · watcher nudge #19 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/server/listLimits.ts` | `limit` / `agentLimit` 解析与排序 |
| `src/app/api/tables/route.ts` | 默认 24 桌上限 + `tablesTotal` 元数据 |
| 首页 / 大厅 / 排行榜 | 按场景传 `?limit=` |

## 缓存

- 保留 `Cache-Control: public, s-maxage=10, stale-while-revalidate=30`

## 下一轮

Tick #24 · **seo** · Wave 2 首项（见 tracker）
