# Phase 3 Loop · Pass 25（F7 积分榜 / 日榜 / 周榜 Tab）

> Tick #25/100 · watcher nudge #21 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/leaderboard/page.tsx` | 三 Tab UI + sessionStorage 记忆 |
| `src/app/leaderboard/leaderboard.module.css` | Pill tab 样式（44px touch） |
| `src/lib/server/userRegistry.ts` | `sort=points\|daily\|weekly` + 7 日周榜聚合 |
| `src/lib/server/clubDay.ts` | `clubDayKeysForLastDays` |
| `src/app/api/leaderboard/route.ts` | 透传 sort 参数 |

## 下一轮

Tick #26 · **ux** · U7 表单 inline 错误
