# Phase 3 Loop · Pass 66（U17 Coach Dock 折叠态记忆）

> Tick #66/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/coachDockCollapse.ts` | localStorage 持久化折叠偏好 |
| `src/components/CoachDock.tsx` | 收起/展开 toggle + `aria-expanded` |
| `src/app/table/table.module.css` | 折叠按钮与摘要样式 |
| `src/app/tables/[tableId]/page.tsx` | 中英文 collapse copy |

## 行为

- 观战 Coach 面板可收起，仅显示一行摘要
- 折叠状态写入 `localStorage`，跨桌台/会话保持

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #67 · **perf** · P17（见 tracker ⬜）
