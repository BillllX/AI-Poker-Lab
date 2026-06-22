# Mobile Quest Loop · Pass 4（R2）

> Tick 4/40 · pillar=quest-reward · Core 完成 → Grinder 领取 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `userDailyBadges.ts` | `quest_core` 领取路径：当日有 Coaching 笔记即可领 Grinder |
| `daily-badges/route.ts` | POST 支持 `context: "quest_core"` |
| `questGrinderBadgeClaim.ts` | 客户端领取 + 每日一次 auto-claim |
| `MobileQuestHub.tsx` | Core 全完成时 footer 展示领取 / 登录 / 已领状态 |
| `engagementAnalytics.ts` | `engagement.quest.grinder_claim` |

## 产品要点

- 客户端 Core 双任务完成（观战 + Coach 进度）后触发领取尝试。
- 服务端校验：用户名下 Agent 当日至少 1 条 Coaching 笔记。
- 已登录且已领取时显示「已领取 Grinder」；未登录引导 `/login`。

## 验证

- [x] lint/build
- [x] sync-deploy-test

## 下一轮

Pass 5 · **M3** OpsBanner 并入 Hub「公告」Tab（pillar=mobile-ux）
