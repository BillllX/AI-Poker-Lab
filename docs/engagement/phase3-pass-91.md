# Phase 3 Loop · Pass 91（Perf Wave 3 polish）

> Tick #91/100 · watcher nudge 触发 ✅ · `polish:P4` + `polish:P10` + `polish:P16`

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/LazyEngagementToastStack.tsx` | 观战/真人桌 toast 栈 lazy load |
| `src/components/LazyFavoriteAgentsPanel.tsx` | My Player 收藏面板 lazy load |
| `src/components/HandInsightPanel.tsx` | `React.memo` 减少洞察面板重渲染 |
| `src/lib/client/prefetchTableRoutes.ts` | 新增 `prefetchLeaderboardRoute` |
| `src/app/tables/[tableId]/page.tsx` | 改用 lazy toast 栈 |
| `src/app/human-table/page.tsx` | 同上 |
| `src/app/me/page.tsx` | 改用 lazy 收藏面板 |
| `src/app/tables/page.tsx` | 挂载时 prefetch `/leaderboard` |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #92 · **seo** · Wave 3 polish
