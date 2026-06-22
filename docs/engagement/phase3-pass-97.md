# Phase 3 Loop · Pass 97（Feature Wave 3 polish）

> Tick #97/100 · watcher nudge 触发 ✅ · `polish:F9` + `polish:F3` + `polish:F10`

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/engagementAnalytics.ts` | 新增 reaction 发送、结算 CTA、排行榜跳转事件 |
| `src/components/ReactionBar.tsx` | 表情发送成功埋点 |
| `src/app/tables/[tableId]/page.tsx` | 结算「再来一局 / 回大厅」埋点；再来一局成功补 quick play 事件 |
| `src/app/leaderboard/page.tsx` | sticky 排名条「跳转到我的行」埋点 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #98 · **ux** · Wave 3 polish
