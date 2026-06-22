# UI/UX 实现 Loop Pass #16/30

> **P3-T002** · Coaching streak 实验指标

## 实现

- `engagementAnalytics.ts`：`console.debug` + `sessionStorage` ring（coaching.submit / streak_active / session_end）
- `coachingStreak.ts`：3 手窗口内提交 3 次 Coaching →「活跃教练」
- **CoachDock**：进度 pill（1/3…）与达成 badge；提交时打点
- **观战页**：bust 时重置 streak；unmount 上报 `spectator.session_end`

## 文件

- `src/lib/client/engagementAnalytics.ts`
- `src/lib/client/coachingStreak.ts`
- `src/components/CoachDock.tsx`
- `src/app/tables/[tableId]/page.tsx`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓
