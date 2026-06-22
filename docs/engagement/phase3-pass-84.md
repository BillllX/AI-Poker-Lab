# Phase 3 Loop · Pass 84（SEO Wave 3 polish）

> Tick #84/100 · watcher nudge 触发 ✅ · `polish:S4` + `polish:S8` + `polish:S11` + `polish:S12` + `polish:S14` + `polish:S7`

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/TableSpectatorJsonLd.tsx` | 单桌观战页 `WebPage` + `WatchAction` JSON-LD |
| `src/app/tables/[tableId]/layout.tsx` | 挂载观战桌结构化数据 |
| `src/lib/tablesHubStructuredData.ts` | 大厅 FAQ 条目 |
| `src/components/TablesHubFaqJsonLd.tsx` | 大厅 `FAQPage` JSON-LD |
| `src/app/tables/layout.tsx` | 挂载大厅 FAQ |
| `src/lib/server/pageMetadata.ts` | 全站子页 OG `alternateLocale: zh_CN` |
| `src/app/sitemap.ts` | 静态路由按更新频率差异化 `lastModified` |
| `src/lib/server/llmsTxt.ts` | 结构化数据说明补 tables FAQ / 观战 WebPage |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #85 · **feature** · Wave 3 polish
