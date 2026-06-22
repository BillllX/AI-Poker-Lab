# UI/UX 实现 Loop Pass #28/30

> **Polish** · /me 加载失败态 + 牌桌 layout + accent 日志高亮

## 实现

- **`/me` 页**：网络/解析失败时显示 `loadFailed`，与「未登录」空态分离；loading / error 使用 `liveRegionProps`
- **牌桌 layout**：桌面 grid 改为 `minmax(0, 1fr) min(340px, 30vw)`，避免窄屏横向溢出
- **观战高亮**：`myAgentSeat` / `logItemMine` cyan 改 `var(--accent)`

## 文件

- `src/app/me/page.tsx`
- `src/app/me.module.css`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓
