# Quest Micro-Bonus API · 设计稿（R5）

> Phase 4 · 实验积分 micro-bonus · **不真钱** · 2026-06-22

## 目标

完成可选任务或达到 3⭐ 时，向已登录用户发放 **+10～+50 实验积分**（可配置），写入现有 `PointsLedger`，UI 仅显示「实验奖励」文案。

## 非目标

- 提现、真钱、链上资产
- 未登录用户的持久奖励

## API 草案

```
POST /api/users/me/quest-bonus
Authorization: session cookie
Body: { "reason": "quest_star" | "quest_core" | "quest_master", "questId"?: string, "dayKey"?: string }

200 { "granted": 25, "pointsBalance": 10025, "ledgerId": "..." }
409 { "error": "Already claimed for this reason today." }
401 / 400
```

## 服务端规则

| reason | 条件 | 默认积分 |
|--------|------|----------|
| `quest_star` | 当日首次达到 3⭐（client 触发，服务端幂等 dayKey+userId） | +25 |
| `quest_core` | Core 双任务完成 + Coaching 笔记存在 | +15 |
| `quest_master` | 已领 `quest_master` badge 当日 | +50 |

## 幂等

- `PointsLedger` 新增 `source: "quest_bonus"` + `metadata.reason` + `dayKey`
- 唯一索引 `(userId, dayKey, reason)` 或通过 ledger 查询去重

## 客户端

- Hub 在 `engagement.quest.active_today` 后 optional POST（失败静默）
- `/me` 显示「今日实验奖励 +N」若 ledger 有当日 quest_bonus

##  rollout

1. Pass A：只写 ledger + API，Hub 不调用 — **✅ Pass 16**
2. Pass B：Hub 调用 + toast — **✅ Pass 17–22**
3. Pass C：METRICS 看 uptake — **✅ Pass 19**；7 日 review 待运营

## 风险

- Client 滥用 POST → 必须服务端校验 badge / 任务状态，不能信任 body  alone
