# Phase 3 Loop · Pass 71（Perf Wave 3 polish）

> Tick #71/100 · watcher nudge 触发 ✅ · `polish:P9` + `polish:P11` + `polish:P16`

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/prefetchTableRoutes.ts` | 大厅 `/tables` + top Agent 主页 prefetch |
| `src/app/page.tsx` | 首页 ready 后 prefetch 大厅；次 CTA hover prefetch |
| `src/app/leaderboard/page.tsx` | 榜加载后 prefetch top 4 Agent 页 |
| `src/lib/server/sseSnapshot.ts` | SSE 日志 cap 60、reactions cap 8 |
| `src/lib/client/audioManager.ts` | `myAgentDeciding` 复用 `yourTurn` 音频 buffer |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #72 · **seo** · Wave 3 polish
