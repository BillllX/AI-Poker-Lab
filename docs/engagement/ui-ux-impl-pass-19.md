# UI/UX 实现 Loop Pass #19/30

> **Polish** · 首页 hub 三态 + table_preview_click analytics

## 实现

- **hubLoadState**：`loading` / `ready` / `error`，`refreshLeaderboard()` 失败时不再误显示 empty
- **Live 桌预览区**：加载中 / 失败 / 空 / 有桌 四分支；`liveRegionProps` 播报 loading 与 error
- **双榜 hub**：同样受 `hubLoadState` 控制，避免首屏闪现「暂无数据」
- **Analytics**：live 桌 `Link` 点击上报 `engagement.home.table_preview_click`（含 `tableId`）

## 文件

- `src/app/page.tsx`
- `src/app/home.module.css`

## 验证

- `npm run lint && npm run build` ✓
