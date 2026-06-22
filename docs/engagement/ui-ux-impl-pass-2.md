# UI/UX 实现 Loop Pass #2/30

> Top10 **#6** · 首页区块合并

## 实现

- 移除独立 `activityCard`：badge 并入 `flowSection` header（`.flowActivityBadge`）
- 移除 `topLeaderboardSection` + 双列 `leaderboardsSection`
- 新增 `rankingHubSection`：**Tab 总榜 / 今日奖励**
  - 总榜：Top3 卡片 + 完整榜链接
  - 今日：今日奖励榜列表
- 叙事顺序：Hero → Live 预览 → 排行榜 Hub → Advanced

## 文件

- `src/app/page.tsx`
- `src/app/home.module.css`

## 验证

- `npm run lint && npm run build` ✓
