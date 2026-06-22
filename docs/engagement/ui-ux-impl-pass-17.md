# UI/UX 实现 Loop Pass #17/30

> **Polish** · 观战页 i18n + analytics 挂载

## 实现

- 观战页中文：`座位`、`手`、`离桌`、`胜`（替换 seats/Leave/WIN 硬编码）
- 英文：`Seats`、`Hand` 首字母大写
- Agent 页分享：`engagement.share.copy` 打点
- BottomNav 练习入口：`engagement.nav.practice_click` 打点

## 文件

- `src/app/tables/[tableId]/page.tsx`
- `src/app/agents/[agentId]/page.tsx`
- `src/components/BottomNav.tsx`

## 验证

- `npm run lint && npm run build` ✓
