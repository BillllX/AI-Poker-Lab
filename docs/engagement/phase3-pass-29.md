# Phase 3 Loop · Pass 29（F8 Coaching 里程碑 toast）

> Tick #29/100 · watcher nudge #25 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/coachingMilestones.ts` | 累计提交计数 + 1/3/5/10/25 里程碑 |
| `src/components/CoachDock.tsx` | 提交成功时 push `EngagementToastStack` |
| `src/app/tables/[tableId]/page.tsx` | 中英文 milestone / streak 文案 |

## 行为

- 第 1/5/10/25 次累计提交 → 里程碑 toast
- 3 手内第 3 次提交（活跃教练）→ 专用 streak toast（优先于第 3 次里程碑）

## 下一轮

Tick #30 · **ux** · U8 焦点环 / reduced-motion 审计
