# Phase 3 Loop · Pass 75（Perf Wave 3 polish）

> Tick #75/100 · watcher nudge 触发 ✅ · `polish:P8` + `polish:P10` + `polish:P11`

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/publicApiFetch.ts` | 公共 API fetch 默认 honor `Cache-Control` |
| `src/app/page.tsx` | 首页 leaderboard/tables 改用 public fetch |
| `src/app/leaderboard/page.tsx` | 同上 |
| `src/app/tables/page.tsx` | 同上 |
| `src/components/AgentComparePanel.tsx` | 同上 |
| `src/lib/server/sseSnapshot.ts` | SSE `handSummaries` cap 5 |
| `src/app/tables/[tableId]/page.tsx` | `PlayingCard` `React.memo` |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #76 · **seo** · Wave 3 polish
