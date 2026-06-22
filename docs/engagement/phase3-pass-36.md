# Phase 3 Loop · Pass 36（S12 hreflang en + zh-Hans）

> Tick #36/100 · watcher nudge #32 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/server/hreflangAlternates.ts` | `hreflangForPath`：`en` / `zh-Hans` / `x-default` |
| `src/lib/server/pageMetadata.ts` | `buildPageMetadata` 注入 `alternates.languages` |
| `src/app/layout.tsx` | 根 metadata hreflang |
| `src/app/tables|leaderboard|human-table/layout.tsx` | 各 hub hreflang |
| `src/app/agents/[agentId]/layout.tsx` | Agent 页 hreflang |
| `src/lib/client/i18n.ts` | `?lang=zh-Hans` / `en` 解析并持久化；`html lang` 用 `zh-Hans` |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅（verify 瞬时 exit 7，单独 ssh verify 全 200）

## 下一轮

Tick #37 · **feature** · F10 排行榜「我的排名」sticky 条
