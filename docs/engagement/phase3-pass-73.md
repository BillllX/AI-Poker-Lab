# Phase 3 Loop · Pass 73（F19 每日任务）

> Tick #73/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/dailyTasks.ts` | localStorage 每日任务：观战 5 手 + Coaching 1 次 |
| `src/components/DailyTasksStrip.tsx` | 全站进度条（login 页隐藏） |
| `src/app/layout.tsx` | 挂载 DailyTasksStrip |
| `src/app/tables/[tableId]/page.tsx` | 新手数计入观战任务 |
| `src/components/CoachDock.tsx` | 成功提交 Coaching 计入任务 |
| `src/lib/client/engagementAnalytics.ts` | `engagement.daily_tasks.complete` |

## 行为

- 观战页每遇到新手（按 tableId+handId 去重）进度 +1
- Coach Dock 提交成功 Coaching 进度 +1
- 两项均完成时 strip 显示完成态；未完成且不在大厅时显示「去观战」

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #74 · **ux** · U19（错误页 404 品牌化）
