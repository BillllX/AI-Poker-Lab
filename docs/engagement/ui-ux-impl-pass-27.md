# UI/UX 实现 Loop Pass #27/30

> **Polish** · 首页 CTA token + section 间距 + 移动 Coaching 提交

## 实现

- **`--space-section`**：全局 28px，应用于 `flowSection` / `rankingHubSection` 垂直节奏
- **`tablePreviewLink`**：cyan 改 `var(--accent)`，与俱乐部绿金主色一致
- **移动 badge**：`flowActivityBadge` 允许换行，避免小屏横向溢出
- **移动 CoachDock**：提交按钮 sticky 于 BottomNav 之上；侧栏去掉重复 bottom margin（已由 `body` clearance 承担）

## 文件

- `src/app/globals.css`
- `src/app/home.module.css`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓
