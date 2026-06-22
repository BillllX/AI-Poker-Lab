# Phase 3 Loop · Pass 27（P7 观战 log cap）

> Tick #27/100 · watcher nudge #23 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/spectatorLogs.ts` | `capSpectatorLogs` + 60 条上限 |
| `src/components/SpectatorActionLogList.tsx` | 观战侧栏 log 列表组件 |
| `src/app/tables/[tableId]/page.tsx` | 接入 cap；高亮手牌日志优先保留 |
| `src/app/table/table.module.css` | 移除 mobile `nth-child(n+4)` 硬隐藏 |

## 下一轮

Tick #28 · **seo** · S10（Wave 2 下一 seo ⬜）
