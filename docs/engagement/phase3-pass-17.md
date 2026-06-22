# Phase 3 Loop · Pass 17（F5 活动条）

> Tick #17/100 · watcher nudge #13 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/activityStrip.ts` | `NEXT_PUBLIC_ACTIVITY_STRIP` 配置 + dismiss |
| `src/components/ActivityStrip.tsx` | 全站金绿活动条 |
| `src/app/layout.tsx` | 顶栏下方全局挂载 |

## 运营

- 默认文案指向今日奖励榜 `/leaderboard`
- `NEXT_PUBLIC_ACTIVITY_STRIP=off` 关闭；JSON 覆盖 copy / CTA
- dismiss 写入 localStorage（按 `id`）

## 下一轮

Tick #18 · **ux** · U5 touch target 审计
