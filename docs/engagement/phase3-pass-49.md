# Phase 3 Loop · Pass 49（F13 首页「最近观战」localStorage 续看）

> Tick #49/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/recentSpectate.ts` | 记录/读取最近观战桌（7 天 TTL；snapshot 缓存防无限渲染） |
| `src/app/tables/[tableId]/page.tsx` | 进入观战页写入 `tableId` + `tableName` |
| `src/app/page.tsx` | Hero CTA 区「继续上次观战」链接 |
| `src/app/home.module.css` | `continueSpectateLink` 样式 |
| `src/lib/client/engagementAnalytics.ts` | `engagement.home.continue_spectate_click` |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #50 · **ux** · U13 观战页 pot 变化数字滚动
