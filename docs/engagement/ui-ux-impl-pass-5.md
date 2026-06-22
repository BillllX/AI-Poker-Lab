# UI/UX 实现 Loop Pass #5/30

> Top10 **#9** · role=status 全局

## 实现

- 新增 `liveRegionProps()` helper（`src/lib/client/liveRegion.ts`）
- **CoachDock**：成功 `role="status"`，失败 `role="alert"`
- **AI 观战桌**：join/leave 反馈区分 status / alert
- **首页弹窗**：`registrationError` → alert；表单 hint、Quick Play 确认 → status
- 统一 `aria-live="polite"` / `assertive`

## 文件

- `src/lib/client/liveRegion.ts`
- `src/components/CoachDock.tsx`
- `src/app/tables/[tableId]/page.tsx`
- `src/app/page.tsx`

## 验证

- `npm run lint && npm run build` ✓
