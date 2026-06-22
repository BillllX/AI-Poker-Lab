# UI/UX 实现 Loop Pass #23/30

> **Polish** · CoachDock 历史区 loading / empty / error 三态

## 实现

- **historyLoadState**：`loading` / `ready` / `error`，首屏不再误显示「还没有 Coaching 记录」
- **提交后刷新**：`refreshHistory({ silent: true })`，已有列表时不闪 loading
- **i18n**：新增 `coachingHistoryLoading` / `coachingHistoryLoadFailed`（zh/en）
- **a11y**：loading 用 `role=status`，error 用 `role=alert`

## 文件

- `src/components/CoachDock.tsx`
- `src/app/tables/[tableId]/page.tsx`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓
