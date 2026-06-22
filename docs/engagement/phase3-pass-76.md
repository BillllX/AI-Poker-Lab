# Phase 3 Loop · Pass 76（SEO Wave 3 polish）

> Tick #76/100 · watcher nudge 触发 ✅ · `polish:S1` + `polish:S3` + `polish:S7` + `polish:S11` + `polish:S12`

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/HumanTableHubJsonLd.tsx` | `/human-table` CollectionPage JSON-LD |
| `src/app/human-table/layout.tsx` | 注入 HumanTable JSON-LD |
| `src/components/NotFoundPage.tsx` | 404 UI 拆为 client 组件 |
| `src/app/not-found.tsx` | 404 `noindex` metadata |
| `src/components/SiteJsonLd.tsx` | WebApplication 补 `inLanguage` |
| `src/app/layout.tsx` | OG `alternateLocale: zh_CN` |
| `src/lib/server/llmsTxt.ts` | 结构化数据说明补 human-table / casino-org |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #77 · **feature** · F20（赛季标签 / 活动角标组件）
