# Phase 3 Loop · Pass 99（Perf Wave 3 polish）

> Tick #99/100 · watcher nudge 触发 ✅ · `polish:P4` + `polish:P10` + `polish:P16`

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/LazyReactionBar.tsx` | 观战表情栏 lazy load |
| `src/components/SpectatorSideTabs.tsx` | `React.memo` 减少侧栏 Tab 重渲染 |
| `src/components/AnimatedPotValue.tsx` | `React.memo` 减少底池数字无效重渲染 |
| `src/lib/client/prefetchTableRoutes.ts` | 新增 `prefetchHumanTableRoute` |
| `src/app/tables/[tableId]/page.tsx` | 改用 lazy 表情栏；挂载 prefetch 大厅 + 排行榜 |
| `src/app/page.tsx` | Hub 就绪后 prefetch 排行榜 + 真人桌 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #100 · **seo** · Wave 3 polish（Loop 收官）
