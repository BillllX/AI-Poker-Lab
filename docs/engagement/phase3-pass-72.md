# Phase 3 Loop · Pass 72（SEO Wave 3 polish）

> Tick #72/100 · watcher nudge 触发 ✅ · `polish:S1` + `polish:S7` + `polish:S9` + `polish:S11`

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/TablesHubJsonLd.tsx` | `/tables` CollectionPage JSON-LD |
| `src/app/tables/layout.tsx` | 注入 TablesHub JSON-LD |
| `src/components/CasinoOrgWebPageJsonLd.tsx` | `/casino-org` WebPage JSON-LD |
| `src/app/casino-org/layout.tsx` | 注入 Casino.org WebPage |
| `src/app/sitemap.ts` | 移除 redirect 桩 `/dashboard` |
| `src/app/robots.ts` | disallow `/dashboard`、`/table` |
| `src/lib/server/llmsTxt.ts` | 补充 JSON-LD 与反馈链接说明 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #73 · **feature** · F19（每日任务：观战 5 手 / coaching 1 次）
