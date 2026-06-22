# Phase 3 Loop · Pass 79（Perf Wave 3 polish）

> Tick #79/100 · watcher nudge 触发 ✅ · `polish:P10` + `polish:P11` + `polish:P16`

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/prefetchTableRoutes.ts` | `prefetchAppRoute` + BottomNav 预取 human-table / profile |
| `src/components/BottomNav.tsx` | 挂载时 + hover 预取导航目标 |
| `src/lib/server/sseSnapshot.ts` | SSE `actionHistory` cap 40 |
| `src/app/human-table/page.tsx` | `PlayingCard` `React.memo` |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #80 · **seo** · Wave 3 polish
