# UI/UX 实现 Loop Pass #18/30

> **Polish** · 别桌提示 + SSE 状态 + CoachDock 空态

## 实现

- **牌手在别桌**：登录但本桌无 myPlayer 时，拉取 `/api/users/me/agent`，展示所在桌名 + 跳转 CTA
- **满桌空态**：已登录且本桌满员时显示「本桌已满」（不再误显示 loginToView）
- **SSE 状态 pill**：连接中 / 实时连接 / 重连中（header + 移动状态条）
- **CoachDock**：无历史时显示空态文案；消息去前缀兼容 zh/en

## 文件

- `src/app/tables/[tableId]/page.tsx`
- `src/components/CoachDock.tsx`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓
