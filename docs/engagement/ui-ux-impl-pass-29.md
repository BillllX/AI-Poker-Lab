# UI/UX 实现 Loop Pass #29/30

> **收尾** · 中屏牌桌溢出 + 路线图同步

## 实现

- **牌桌 ≤1180px**：`.table` 取消 `min-width: 680px` 强制，改为 `width: 100%`，避免单列 layout 横向滚动
- **首页 advancedSection**：底部 padding 改用 `--space-section`
- **ENGAGEMENT_ROADMAP.md**：P1–P3 标记为已实现并链到 pass 文档

## 文件

- `src/app/table/table.module.css`
- `src/app/home.module.css`
- `docs/engagement/ENGAGEMENT_ROADMAP.md`

## 验证

- `npm run lint && npm run build` ✓
