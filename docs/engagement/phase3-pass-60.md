# Phase 3 Loop · Pass 60（SEO Wave 3 polish）

> Tick #60/100 · watcher nudge 触发 ✅ · `polish:S4` + `polish:S5` + `polish:S13`

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/leaderboard/layout.tsx` | `buildPageMetadata` + OG 图 + Twitter + keywords |
| `src/app/human-table/layout.tsx` | 同上（live-table OG 图） |
| `src/app/tables/[tableId]/layout.tsx` | 观战桌动态 metadata 对齐全站（OG 大图、hreflang、keywords） |
| `src/components/NoScriptFallback.tsx` | noscript 导航补 `/journey` 链接 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #61 · **feature** · F16（见 tracker ⬜）
