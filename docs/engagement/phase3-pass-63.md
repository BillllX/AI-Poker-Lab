# Phase 3 Loop · Pass 63（P16 prefetch tables→观战）

> Tick #63/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/prefetchTableRoutes.ts` | 观战路由 path + 按 running/玩家数排序 prefetch top 4 |
| `src/app/tables/page.tsx` | 大厅加载后自动 prefetch；桌卡 / 继续观看 Link `prefetch` + hover |
| `src/app/page.tsx` | 首页 live 桌预览 + 继续观战 Link prefetch |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #64 · **seo** · Wave 3 polish（见 tracker）
