# UI/UX 实现 Loop Pass #24/30

> **Polish** · 首页 stat 顺序 + 今日榜标题 + 排行榜页三态

## 实现

- **matchStatGrid**：调整为「观测 → 复盘 → 迭代」叙事顺序
- **今日榜 Tab**：移除与外层 `rankingHub` 重复的 `dailyProfitTitle` / `dailyProfitText` 内层标题
- **排行榜页**：`loadState` loading / ready / error 三态，失败不再误显示 empty

## 文件

- `src/app/page.tsx`
- `src/app/leaderboard/page.tsx`
- `src/app/leaderboard/leaderboard.module.css`

## 验证

- `npm run lint && npm run build` ✓
