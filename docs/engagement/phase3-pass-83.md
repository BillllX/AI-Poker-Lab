# Phase 3 Loop · Pass 83（Perf Wave 3 polish）

> Tick #83/100 · watcher nudge 触发 ✅ · `polish:P11` + `polish:P3` + `polish:P4` + `polish:P10`

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/server/sseSnapshot.ts` | 统一 `handSummaries` cap=5（含 human-table SSE） |
| `src/lib/client/reconnectingEventSource.ts` | SSE 重连 backoff 加 ±20% jitter，减轻 herd |
| `src/components/LazyActivityStrip.tsx` | ActivityStrip 客户端 lazy load（减首包） |
| `src/app/layout.tsx` | 改用 `LazyActivityStrip` |
| `src/components/ReactionBar.tsx` | `React.memo` 减少观战页无效重渲染 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #84 · **seo** · Wave 3 polish
