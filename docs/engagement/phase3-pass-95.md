# Phase 3 Loop · Pass 95（Perf Wave 3 polish）

> Tick #95/100 · watcher nudge 触发 ✅ · `polish:P4` + `polish:P10` + `polish:P16`

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/LazySpectatorActionLogList.tsx` | 观战行动日志 lazy load |
| `src/components/LazyHandReviewList.tsx` | 手牌回顾列表 lazy load |
| `src/components/SpectatorActionLogList.tsx` | `React.memo` 减少侧栏重渲染 |
| `src/components/HandReviewList.tsx` | 同上 |
| `src/app/tables/[tableId]/page.tsx` | 改用 lazy 侧栏组件；挂载时 prefetch 大厅 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #96 · **seo** · Wave 3 polish
