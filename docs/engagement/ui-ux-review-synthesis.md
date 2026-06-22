# UI/UX 三模型审查 · 合成摘要

> 2026-06-21 · Phase 2 Loop Kickoff  
> 模型分工：gpt-5.5-medium（情绪）· composer-2.5-fast（视觉）· gpt-5.3-codex（实现）

## 三份完整报告

| 模型 | 文档 | 视角 |
|------|------|------|
| gpt-5.5-medium | [ui-ux-review-emotion.md](./ui-ux-review-emotion.md) | 情绪旅程、峰值、Coach 叙事 |
| composer-2.5-fast | [ui-ux-review-visual.md](./ui-ux-review-visual.md) | 布局、移动、首页 cohesion、26 条 CSS 清单 |
| gpt-5.3-codex | [ui-ux-review-implementation.md](./ui-ux-review-implementation.md) | a11y、空态、i18n、basePath、S/M/L 工作量 |

## 三模型共识 · Top 10 修复（按 ROI）

| # | 问题 | 模型 | 文件 | 优先级 |
|---|------|------|------|--------|
| 1 | Hero 未渲染 `heroSubtitle` / `heroSignals` | 情绪+视觉 | `page.tsx` | **P0** |
| 2 | 移动端 BottomNav padding 不一致，遮挡 Coaching | 视觉+实现 | `globals.css`, `table.module.css`, `home.module.css` | **P0** |
| 3 | AI 桌缺 `mobileTableStatus`（真人桌有） | 视觉 | `tables/[tableId]/page.tsx` | **P0** |
| 4 | 无 handReview 闭环（赢家 overlay 后空白） | 情绪 | P1 代码或 interim 空态 copy | **P0/P1** |
| 5 | CoachDock 埋侧栏中段 + 生效反馈弱 | 情绪+视觉 | `CoachDock.tsx`, sidePanel 顺序 | **P1** |
| 6 | 首页 Top3 / activity / 双榜 排名叙事重复 | 视觉 | `page.tsx` 区块合并或折叠 | **P1** |
| 7 | Quick Play 缺「AI 已创建」确认 moment | 情绪 | `page.tsx` modal | **P1** |
| 8 | 弹窗无 focus trap / Esc | 实现 | `page.tsx` modals | **P1** |
| 9 | 状态文案缺 `role="status"` / live region | 实现 | 观战页、CoachDock | **P1** |
| 10 | BottomNav 无 `/human-table` 练习入口 | 情绪+设计 | `BottomNav.tsx` | **P2** |

## 建议实施 waves

**Wave A（UX Quick Wins，1–2d）** — 仅改 UI/copy/CSS  
- #1 Hero subtitle  
- #2 padding 统一  
- #3 mobileTableStatus 移植  
- #8/#9 a11y 基础  

**Wave B（参与感闭环，与 P1 代码重叠）**  
- #4 HandReviewList  
- #5 CoachDock 置顶 + coaching_applied toast  

**Wave C（首页信息架构）**  
- #6 区块合并  
- #7 Quick Play 确认  

## Phase 2 Loop 规则

- **间隔**：20 分钟 × 30 次  
- **Sentinel**：`AGENT_LOOP_TICK_UX`  
- **每轮**：读取本摘要 + 三份 review，写入 `ui-ux-loop-pass-{N}.md`（深化一条 Top10 或交叉评审）  
- **模型轮换**（Agent 执行时）：N%3=1 情绪 · 2 视觉 · 0 实现  

## 与 P0 代码关系

当前工作区 P0 已实现 CoachDock 等，但 **三模型审查发现的新 P0 UX 项尚未改代码**。Loop Phase 2 以 **UX 修复清单深化** 为主；Wave A 可在用户确认后直接实现。
