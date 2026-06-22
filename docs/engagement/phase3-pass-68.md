# Phase 3 Loop · Pass 68（SEO Wave 3 polish）

> Tick #68/100 · watcher nudge 触发 ✅ · `polish:S9` + `polish:S10` + `polish:S13` + `polish:S14`

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/JourneyArticleJsonLd.tsx` | journey 页 BlogPosting 结构化数据 |
| `src/app/journey/layout.tsx` | 注入 Article JSON-LD |
| `src/components/AgentProfileJsonLd.tsx` | Agent 页 ProfilePage JSON-LD |
| `src/app/agents/[agentId]/layout.tsx` | 注入 ProfilePage + 复用 description |
| `src/lib/server/sitemapAgents.ts` | sitemap `lastModified` 优先用 `lastSeenAt` |
| `src/components/NoScriptFallback.tsx` | noscript 导航补 `/casino-org` |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #69 · **feature** · F18（牌桌内「报告问题」反馈链接）
