---
iteration: 16
backlogId: B16
implemented: true
codePaths:
  - src/lib/server/questBonus.ts
  - src/app/api/users/me/quest-bonus/route.ts
  - deploy/scripts/mobile-quest-loop-lib.mjs
  - docs/engagement/mobile-quest-backlog-wave2.json
---

# Mobile Quest Loop · Pass 16（B16 · quest-bonus API）

> Tick 16/40 · pillar=quest-reward · **已实现（代码已 ship）** ✅

## 变更

| 文件 | 说明 |
|------|------|
| `questBonus.ts` | `QUEST_BONUS` ledger 写入 + 三种 reason 幂等 |
| `quest-bonus/route.ts` | `GET` 今日已发总额 / `POST` 领取 |
| `mobile-quest-loop-lib.mjs` | Loop 契约：backlog + `implemented: true` 校验 |
| `mobile-quest-backlog-wave2.json` | Wave2 待办 B16–B20 |
| arm/watcher 脚本 | 仅 pass 文件存在不够，须 `implemented: true` |

## 服务端规则（Pass A）

| reason | 条件 | 积分 |
|--------|------|------|
| `quest_core` | 当日有 Coaching 笔记 | +15 |
| `quest_master` | 当日已有 quest_master badge | +50 |
| `quest_star` | quest_master 或 (grinder + coaching) | +25 |

Hub **本 pass 不调用**（B17 接客户端）。

## 验收

- [x] `src/` 有变更
- [x] lint/build
- [x] sync-deploy-test
- [x] backlog B16 → `implemented`
- [x] state → lastCompleted=16 pending=17

## 下一轮

**B17** · Hub ≥3⭐ claim quest_master + POST quest-bonus + toast
