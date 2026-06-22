# Phase 3 Loop · Pass 77（F20 赛季 / 活动角标）

> Tick #77/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/seasonEventBadge.ts` | 赛季 + 活动 copy 配置（env / OPERATIONAL_COPY） |
| `src/components/SeasonEventBadge.tsx` | 可复用双角标组件 |
| `src/lib/client/localizedCopy.ts` | `seasonBadgeSeason1` / `seasonBadgeDailyEvent` |
| `src/app/tables/page.tsx` | 大厅 hero 展示赛季 + 活动 |
| `src/app/leaderboard/page.tsx` | 排行榜 hero 展示活动角标 |
| `src/app/page.tsx` | 首页 flow 区替换静态 activity badge |
| `.env.example` | `NEXT_PUBLIC_SEASON_BADGE` 说明 |

## 行为

- 默认：**第一赛季** + **今日活动** 双角标（金 / 紫配色）
- `show="season" | "event" | "both"`；`NEXT_PUBLIC_SEASON_BADGE=off` 可隐藏

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #78 · **ux** · U20（真人桌 action bar sticky 优化）
