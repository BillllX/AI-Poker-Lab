# Phase 3 Loop · Pass 81（Feature Wave 3 polish）

> Tick #81/100 · watcher nudge 触发 ✅ · `polish:F19` + `polish:F18`

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/dailyTasks.ts` | 共享 `DAILY_TASKS_COMPLETE_COPY` 完成文案 |
| `src/app/tables/[tableId]/page.tsx` | 观战达成每日任务时弹出完成 toast |
| `src/components/CoachDock.tsx` | Coaching 达成每日任务时 toast；`id="coach-dock"` 锚点 |
| `src/components/DailyTasksStrip.tsx` | 观战已完成、Coaching 未完成时在牌桌页显示「去 Coaching」CTA |
| `src/components/TableFeedbackLink.tsx` | 点击反馈链接触发 `engagement.table.feedback_click` |
| `src/lib/client/engagementAnalytics.ts` | 新增反馈点击事件类型 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #82 · **ux** · Wave 3 polish
