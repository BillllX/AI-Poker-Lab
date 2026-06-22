# UI/UX 实现 Loop Pass #20/30

> **Polish** · flowSection 标题语义 + coachingRecent i18n

## 实现

- **flowSection 标题**：区块 header 改用 `flowEyebrow` + `flowTitle` + `flowText`（「三步开始训练」流程说明）
- **预览 panel**：`tablePreviewTitle` / `tablePreviewText` 移入 `tablePreviewPanel` 内，与 live 桌预览语义分离
- **coachingRecent**：英文改为 "Recent 3 coaching notes"，与中文「最近 3 条 Coaching」粒度一致

## 文件

- `src/app/page.tsx`
- `src/app/home.module.css`
- `src/app/tables/[tableId]/page.tsx`

## 验证

- `npm run lint && npm run build` ✓
