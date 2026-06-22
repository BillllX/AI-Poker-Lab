# UI/UX 实现 Loop Pass #7/30

> Top10 已全部完成 · 补完 **#5** CoachDock 生效反馈

## 背景

Tick #7 时 Top10 #1–#10 均已落地；本轮按 Loop 规则处理下一未完成项：**#5 部分**（`ui-ux-loop-pass-4.md` 规格 C）。

## 实现

- `CoachDock` 提交成功后回调 `onCoachingApplied(handId)`
- 「我的牌手」面板显示 **Coaching 待生效** pill，直至 `handId >= appliesFromHandId`
- i18n：`coachingPending` zh/en
- 样式：`.coachingPendingBadge`

## 文件

- `src/components/CoachDock.tsx`
- `src/app/tables/[tableId]/page.tsx`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓

## 后续 Loop 建议

- P1：`HandReviewList`、Toast、sticky Coach 条（pass-4 B）
- 或停 Loop / 切 P1 实现模式
