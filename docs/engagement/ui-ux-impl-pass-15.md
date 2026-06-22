# UI/UX 实现 Loop Pass #15/30

> **P3-T001** · 持久化今日高光徽章

## 实现

- Prisma `UserDailyBadge`：`userId + dayKey + badge` 唯一（climber / highlight / grinder）
- **climber**：排行榜排名上升庆祝时 claim（对比昨日 snapshot）
- **highlight**：Agent 桌高光手牌完成时自动写入 owner
- **grinder**：当日结算 ≥3 次时 lazy award
- 展示：`/me` 与 `/agents/[agentId]` badge 条（金色 honor pill）
- API：`GET/POST /api/users/me/daily-badges`

## 文件

- `prisma/schema.prisma`
- `prisma/migrations/20260621180000_add_user_daily_badges/`
- `src/lib/server/userDailyBadges.ts`
- `src/app/api/users/me/daily-badges/route.ts`
- `src/lib/server/simulator.ts`
- `src/lib/server/agentProfile.ts`
- `src/app/api/users/me/agent/route.ts`
- `src/app/me/page.tsx`
- `src/app/agents/[agentId]/page.tsx`
- `src/app/leaderboard/page.tsx`

## 验证

- `npx prisma generate && npm run lint && npm run build` ✓
- 部署前需 `prisma migrate deploy`
