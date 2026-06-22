# UI/UX 实现 Loop Pass #25/30

> **Polish** · 大厅三态 + 观战叙事 + accent token

## 实现

- **比赛大厅 `/tables`**：`loadState` loading / ready / error，首屏不再误显示空桌态
- **观战页侧栏**：无 `myPlayer` 时展示 `spectatorHint` 观战叙事条
- **品牌 token**：`reasoningBlock` / `mobileStatusMine` cyan 改 `var(--accent)`
- **Link 修正**：别桌 CTA 使用 Next 相对路径，移除 `withBasePath` 双前缀风险

## 文件

- `src/app/tables/page.tsx`
- `src/app/tables/tables.module.css`
- `src/app/tables/[tableId]/page.tsx`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓
