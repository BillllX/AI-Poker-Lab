# Phase 3 Loop · Pass 57（F15 实验积分变动实时 toast）

> Tick #57/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/useSpectatorPointsToast.ts` | 观战页积分变动 hook |
| `src/lib/client/engagementToast.ts` | 新增 `points` toast kind |
| `src/app/tables/[tableId]/page.tsx` | 接入 hook + 中英文文案 |
| `src/components/EngagementToastStack.module.css` | `.points` 样式 |
| `src/lib/client/engagementAnalytics.ts` | `engagement.points_delta_seen` 事件 |

## 行为

- 我的牌手赢池 → 「本手 +N」toast
- 每手结束后刷新账户积分 / 今日排名 → 结算入账或排名上升 toast
- 埋点区分 `hand_win` / `account_balance` / `daily_rank`

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #58 · **ux** · U15（见 tracker ⬜）
