# UI/UX 实现 Loop · Kickoff（模式切换）

> 2026-06-21 · 用户选择：**每轮直接改代码**

## 本轮实现（Wave A · Top10 #1 #2 #3 + #5 部分）

| # | 变更 |
|---|------|
| 1 | `page.tsx` 渲染 `heroSubtitle` + `heroSignals` |
| 2 | `globals.css` `--bottom-nav-clearance`；`table.module.css` / `home.module.css` 统一 mobile padding；`sidePanel` 底部留白 |
| 3 | `tables/[tableId]/page.tsx` 添加 `mobileTableStatus` + `mobileStatusMine` |
| 5 | 侧栏顺序：日志 → 筹码；`CoachDock` 加 `coachingPanel`；`role="status"` |

## 验证

- `npm run lint && npm run build`

## 下一轮 Loop

Top10 **#4**：overlay「查看本手日志」+ `#hand-action-logs` 锚点（已有 id）
