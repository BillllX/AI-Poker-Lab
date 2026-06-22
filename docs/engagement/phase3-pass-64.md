# Phase 3 Loop · Pass 64（SEO Wave 3 polish）

> Tick #64/100 · watcher nudge 触发 ✅ · `polish:S4` + `polish:S5` + `polish:S8` + `polish:S15`

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/server/pageMetadata.ts` | 支持 `robotsIndex` + `profile` OG type |
| `src/app/me/layout.tsx` | OG 图、keywords、`noindex` |
| `src/app/login/layout.tsx` | 同上 |
| `src/components/LeaderboardJsonLd.tsx` | CollectionPage 结构化数据 |
| `src/app/leaderboard/layout.tsx` | 注入 Leaderboard JSON-LD |
| `src/app/agents/[agentId]/layout.tsx` | Agent 页 keywords |
| `src/lib/server/llmsTxt.ts` | sitemap 动态项 + prefetch / sizes 说明 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #65 · **feature** · F17（见 tracker ⬜）
