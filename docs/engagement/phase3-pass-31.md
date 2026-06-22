# Phase 3 Loop · Pass 31（P8 leaderboard API 缓存 30s）

> Tick #31/100 · watcher nudge #27 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/server/leaderboardListCache.ts` | 30s 进程内缓存 + `Cache-Control` 常量 |
| `src/app/api/leaderboard/route.ts` | `s-maxage=30` / `stale-while-revalidate=60` |

## 下一轮

Tick #32 · **seo** · S11（Wave 2 下一 seo ⬜）
