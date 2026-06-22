# Loop 维护轮 #7/30

> 2026-06-21 · Tick #7 · P3 草图 + METRICS 打点 spec

## 本轮焦点 A：P3 长期粘性（草图）

### P3-T001 持久化「今日高光徽章」

- **触发**：leaderboard 页现有庆祝弹层（up/down/new）+ 当日首次 highlight 手牌
- **存储**：`UserDailyBadge { userId, dayKey, badge: "climber"|"highlight"|"grinder", earnedAt }`（Prisma 新表，可选）
- **展示**：`/me` 顶部 badge 条；Agent 页 profile 区
- **非积分**：纯荣誉，不与 `pointsBalance` 联动（避免与「无真钱」叙事冲突）

### P3-T002 Coaching Streak（实验指标）

- 定义：连续 3 手内提交 Coaching 且 hero 未 bust → 「活跃教练」
- 仅 UI 计数 + METRICS，不发奖励

### P3-T003 观战人数 social proof

- SSE 增 `spectatorCount`（内存计数，SSE 连接 +1/-1）
- 文案：「{n} 人正在观战」（不展示身份）

---

## 本轮焦点 B：METRICS 前端打点 spec

与 [METRICS.md](./METRICS.md) 对齐，实现阶段可选 `src/lib/client/engagementAnalytics.ts`：

```typescript
type EngagementEvent =
  | { name: "engagement.coaching.submit"; tableId: string; handId: number; appliesFromHandId: number }
  | { name: "engagement.spectator.session_end"; tableId: string; durationMs: number; handsSeen: number }
  | { name: "engagement.share.copy"; agentId: string }
  | { name: "engagement.home.table_preview_click"; tableId: string }
  | { name: "engagement.nav.practice_click"; from: string };
```

**传输（Phase 1）**
- `console.debug` + `sessionStorage` ring（dev 验证）
- **Phase 2**：`POST /api/analytics/engagement` batch（需 rate limit）

**挂载点**
| 事件 | 文件 |
|------|------|
| coaching.submit | `CoachDock.tsx` POST 成功 |
| session_end | `tables/[tableId]/page.tsx` unmount |
| share.copy | `agents/[agentId]/page.tsx` copy handler |
| table_preview_click | `page.tsx` live table link |
| practice_click | `BottomNav`（P2 实现后） |

---

## Loop 进度：7/30

设计覆盖：**P0 实现 · P1/P2 设计完成 · P3 草图 + 指标 spec**

## 下一轮（Tick #8）建议

- 合成 `loop-pass-maint-summary.md`（Tick 0–7 一页摘要）
- 或开始 PR-1 代码（需用户明确「开始 P1 实现」）
