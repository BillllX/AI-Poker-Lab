# Phase 3 Loop · Pass 22（U6 TableMomentOverlay）

> Tick #22/100 · watcher nudge #18 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/TableMomentOverlay.tsx` | 统一 handWin / sessionEnd 峰值 overlay |
| `src/components/TableMomentOverlay.module.css` | 从 table 样式抽取 |
| `tables/[tableId]` / `human-table` | 替换内联 overlay JSX |

## 下一轮

Tick #23 · **perf** · P6 tables limit
