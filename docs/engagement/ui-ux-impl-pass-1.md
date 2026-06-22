# UI/UX 实现 Loop Pass #1/30

> Top10 **#4** · handReview interim

## 实现

- 赢家 overlay 增加「查看本手日志」按钮
- `scrollToHandLogs()` 关闭 overlay 并滚动至 `#hand-action-logs`
- 本手 log 条目 `.logItemCurrentHand` 高亮（`log.handId === highlightHandId`）
- i18n：`viewHandLog` zh/en

## 文件

- `src/app/tables/[tableId]/page.tsx`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓
