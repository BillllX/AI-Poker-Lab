# Phase 3 Loop · Pass 44（S14 sitemap 活跃 Agent 页 top N）

> Tick #44/100 · watcher nudge #40 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/server/sitemapAgents.ts` | 积分榜 Top 25 → `/agents/[id]` URL（owner 映射 agentId） |
| `src/app/sitemap.ts` | 异步合并静态路由 + Agent 条目；`force-dynamic`；DB 不可用时不阻塞 |

## 验证

- `npm run lint && npm run build` ✅（`/sitemap.xml` 改为动态路由 ƒ）
- 测试环境 deploy ✅

## 下一轮

Tick #45 · **feature** · F12 真人桌邀请链接 copy
