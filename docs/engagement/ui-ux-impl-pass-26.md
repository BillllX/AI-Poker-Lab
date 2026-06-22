# UI/UX 实现 Loop Pass #26/30

> **Polish** · BottomNav 安全区统一 + 侧栏 sticky + accent 收尾

## 实现

- **全局安全区**：`body` / `siteFilingFooter` 统一 `--bottom-nav-clearance`；新增 `--bottom-nav-height`
- **去重 padding**：首页、大厅、登录、牌桌页移除与 `body` 叠加的 `padding-bottom`
- **Quick Play 弹窗**：`max-height` 改用 clearance 变量，避免底部被 BottomNav 遮挡
- **桌面侧栏**：`≥1181px` 时 `sidePanel` sticky + 可滚动
- **CoachDock 视觉**：accent 左边框；textarea `min-height: 96px`
- **首页 preview badge**：cyan 改 `var(--accent)`

## 文件

- `src/app/globals.css`
- `src/app/home.module.css`
- `src/app/tables/tables.module.css`
- `src/app/login/login.module.css`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓
