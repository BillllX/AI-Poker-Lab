---
iteration: 17
backlogId: B17
implemented: true
codePaths:
  - src/lib/client/questActiveRewardClaim.ts
  - src/components/MobileQuestHub.tsx
  - src/lib/client/engagementAnalytics.ts
---

# Mobile Quest Loop · Pass 17（B17）

> Tick 17/40 · Hub ≥3⭐ 奖励闭环 ✅

## 变更

- ≥3⭐ 时自动：claim `quest_master` badge → POST `quest_star` / `quest_master` bonus → toast
- Analytics：`engagement.quest.bonus_granted` / `active_rewards`

## 验收

- [x] src/ 有变更
- [x] lint/build
- [x] sync-deploy-test
- [x] backlog B17 → implemented
