# 玩家参与感指标

> Texas Poker Club · Loop 跟踪用 · 2026-06-21

## 核心指标

| 指标 | 定义 | 目标（P0 后） | 采集方式 |
|------|------|---------------|----------|
| `time_to_first_coaching` | 注册 → 首次提交 coaching（秒） | < 600s（10 分钟内） | 前端 `sessionStorage` + POST coaching 打点 |
| `coaching_rate` | coaching 次数 / 观战手数 | > 0.3 / 10 手 | API log 或 coaching route 计数 |
| `spectator_session_length` | SSE 连接时长（秒） | median > 480s（8 分钟） | 观战页 unmount 上报 |
| `share_copy_clicks` | Agent 页复制分享次数 | 基线 +20% | click handler 计数 |
| `return_within_24h` | 结算后 24h 内再开赛比例 | > 25% | `AgentResult.settledAt` 查询 |
| `human_ai_cross_use` | 7 日内同时使用两线用户占比 | 基线建立 | session / 路由访问 log |

## P0 验收检查点

- [x] Coach Dock 提交后显示 `appliesFromHandId`
- [x] `lastReasoning` 在「我的牌手」面板可见
- [x] 首页渲染 Live 桌预览 + 今日奖励榜 + 实验积分榜
- [x] AI 桌赢家 seat 有 `winningSeat` + WIN 徽章
- [x] 我的牌手思考时播放 `myAgentDeciding` 音效

## 事件命名建议（前端）

详见 [loop-pass-maint-7.md](./loop-pass-maint-7.md) 完整 payload spec。

```typescript
engagement.coaching.submit
engagement.spectator.session_end
engagement.share.copy
engagement.home.table_preview_click
engagement.nav.practice_click
engagement.quest.complete
engagement.quest.grinder_claim
engagement.quest.active_today
engagement.quest.bonus_granted
engagement.quest.active_rewards
engagement.quest.cta_click
```

## Quest Loop 指标（Phase 4 · Pass 19+）

| 事件 | 用途 |
|------|------|
| `engagement.quest.complete` | 单任务首次完成率（按 `questId`） |
| `engagement.quest.active_today` | ≥3⭐ 达成次数 |
| `engagement.quest.bonus_granted` | micro-bonus 发放（`reason` + `granted`） |
| `engagement.quest.active_rewards` | 3⭐ 一键领奖汇总 |
| `engagement.quest.grinder_claim` | Core 双任务 Grinder 领取漏斗 |

目标（Wave2 后 7 日）：`bonus_granted` / `active_today` > 0.35（已登录用户）

## 报表节奏

- **Loop 每轮**：对照本表更新 `loop-pass-maint.md`
- **发版后 7 天**：Review P0 目标是否达成，决定是否启动 P1

## 与产品峰值映射

| 峰值 | 主要指标 |
|------|----------|
| Coaching 介入 | coaching_rate, time_to_first_coaching |
| 观战沉浸 | spectator_session_length |
| 分享传播 | share_copy_clicks |
| 回访 | return_within_24h |
| 两线探索 | human_ai_cross_use |
