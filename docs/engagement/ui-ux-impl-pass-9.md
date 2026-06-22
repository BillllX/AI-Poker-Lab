# UI/UX 实现 Loop Pass #9/30

> **P1-T004** · EngagementToastStack

## 实现

- `EngagementToastStack` 组件（top-center，`z-index: 130`）
- `pushEngagementToast()` + sessionStorage 跨页队列
- AI 观战页接入：
  - 离桌结算 → `settled`
  - Coaching 生效手 → `coaching`
  - 我的牌手 bust → `bust`

## 文件

- `src/lib/client/engagementToast.ts`
- `src/components/EngagementToastStack.tsx`
- `src/components/EngagementToastStack.module.css`
- `src/app/tables/[tableId]/page.tsx`

## 验证

- `npm run lint && npm run build` ✓
