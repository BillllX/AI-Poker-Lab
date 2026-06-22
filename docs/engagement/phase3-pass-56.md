# Phase 3 Loop · Pass 56（SEO Wave 3 polish）

> Tick #56/100 · watcher nudge 触发 ✅ · `polish:S4` + `polish:S14`

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/server/sitemapTables.ts` | 运行中观战桌 top 12 写入 sitemap（按玩家数排序） |
| `src/app/sitemap.ts` | 合并 `runningTableSitemapEntries()` |
| `src/app/tables/layout.tsx` | 改用 `buildPageMetadata`（OG 图、keywords、hreflang 与全站一致） |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #57 · **feature** · F15（见 tracker ⬜）
