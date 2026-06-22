# Phase 3 Loop · Pass 37（F10 我的排名 sticky 条）

> Tick #37/100 · watcher nudge #33 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/leaderboard/page.tsx` | 登录用户底部 sticky「我的排名」；榜内可一键定位 |
| `src/app/leaderboard/leaderboard.module.css` | sticky 条样式，避开 BottomNav |
| `src/lib/server/userRegistry.ts` | `getLeaderboardRankForUser` 支持 points/daily/weekly |
| `src/app/api/users/me/rank/route.ts` | `?sort=` 返回完整排名与分数 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅（verify 瞬时 exit 7，单独 ssh verify 全 200）

## 下一轮

Tick #38 · **ux** · U10 BottomNav active 指示器统一
