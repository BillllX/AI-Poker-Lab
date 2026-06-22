---
iteration: 27
backlogId: B27
implemented: true
codePaths:
  - src/lib/server/questBonus.ts
  - scripts/quest-bonus-smoke.ts
  - package.json
---

# Pass 27 · questBonus 单元测试

- 导出 `evaluateQuestBonusEligibility` + `resolveQuestBonusGrant`
- `npm run test:quest-bonus` 覆盖 eligibility 矩阵与幂等分支
