# Phase 3 Loop · Pass 87（Perf Wave 3 polish）

> Tick #87/100 · watcher nudge 触发 ✅ · `polish:P4` + `polish:P16`

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/LazyDailyTasksStrip.tsx` | 每日任务 strip 客户端 lazy load |
| `src/components/LazyDailyCheckInStrip.tsx` | 首页签到 strip lazy load |
| `src/app/layout.tsx` | 改用 `LazyDailyTasksStrip` |
| `src/app/page.tsx` | 改用 `LazyDailyCheckInStrip` |
| `src/app/tables/page.tsx` | 有「继续上次观战」记录时自动 prefetch 目标桌 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #88 · **seo** · Wave 3 polish
