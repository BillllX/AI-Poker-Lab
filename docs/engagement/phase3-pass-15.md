# Phase 3 Loop · Pass 15（P4 dynamic import）

> Tick #15/100 · watcher nudge #11 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/tables/[tableId]/page.tsx` | `CoachDock`、`HandInsightPanel` 改为 `next/dynamic` 懒加载 |

## 效果

- 观战页首屏 bundle 不再同步拉取 Coach / Insight 面板 JS
- 切到对应 Tab 或面板挂载时才加载，loading 用 `SkeletonStack`

## 下一轮

Tick #16 · **seo** · S7 llms.txt
