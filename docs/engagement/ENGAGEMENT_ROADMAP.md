# 玩家参与感精进路线图

> 合成自 Loop Pass 0–3 · 2026-06-21  
> 范围：AI 观战线 + 真人桌统一体验

## 目标

在「人类 = 教练/实验员，AI = 选手」定位下，提升：

| 维度 | P0 后目标 |
|------|-----------|
| 参与度 | 观战用户每 2–5 手有一次 Coaching 触点 |
| 参与感 | 我的牌手决策 reasoning 可见、可理解 |
| 情绪价值 | 首页承诺落地 + 赢家 seat 高亮 + 专属思考音 |

## P0 — 闭环现有承诺（本 Sprint）✓ 已实现

| ID | 任务 | 状态 |
|----|------|------|
| P0-T001 | Coach Dock | ✅ |
| P0-T002 | lastReasoning UI | ✅ |
| P0-T003 | 首页三块 | ✅ |
| P0-T004 | winningSeat + myAgentDeciding | ✅ |

## P1 — 复盘与身份 ✅ Phase 2b 已实现

| ID | 任务 | 文档 |
|----|------|------|
| P1-T001 | Agent 桌 per-hand 摘要 | ui-ux-impl-pass-8 |
| P1-T002 | Agent 页 Coach Card | ui-ux-impl-pass-11 |
| P1-T003 | HandInsightPanel | ui-ux-impl-pass-10 |
| P1-T004 | 轻量 Toast | ui-ux-impl-pass-9 |

## P2 — 社交与导航 ✅

| ID | 任务 | 文档 |
|----|------|------|
| P2-T001 | 观战 reaction 条 | ui-ux-impl-pass-12 |
| P2-T002 | BottomNav 真人实验入口 | ui-ux-impl-pass-6 |
| P2-T003 | 高光手牌自动标记 | ui-ux-impl-pass-13 |

## P3 — 长期粘性 ✅

| ID | 任务 | 文档 |
|----|------|------|
| P3-T001 | 持久化今日高光徽章 | ui-ux-impl-pass-15 |
| P3-T002 | Coaching streak 实验指标 | ui-ux-impl-pass-16 |
| P3-T003 | 观战人数 social proof | ui-ux-impl-pass-14 |

## 12 情绪峰值（Pass 1 摘要）

1. 快速开赛入座 · 2. 我的牌手分配上桌 · 3. 决策 tension · 4. Coaching 提交  
5. 大 pot 张力 · 6. 摊牌 reveal · 7. 赢家 release · 8. 大亏/ bust  
9. 结算回味 · 10. 升榜庆祝 · 11. Agent 主页分享 · 12. 真人桌 yourTurn

详见 [loop-pass-1.md](./loop-pass-1.md)。

## 共享组件（Pass 2）

- `CoachDock` — ✅
- `HandInsightPanel` — ✅
- `HandReviewList` — ✅
- `EngagementToastStack` — ✅
- `SoundProfile` — ✅（myAgentDeciding）

详见 [loop-pass-2.md](./loop-pass-2.md)。

## 风险清单

| 风险 | 缓解 |
|------|------|
| Coaching 下一手才生效 | UI 明确 handId 提示 |
| WebSocket schema 不变 | handAnalysis 仅 SSE 增字段 |
| basePath | 全部 `withBasePath()` |
| Virtual Bot | Coaching 仅 real agent |
| Mobile 底部遮挡 | Coach Dock 在 sidePanel，测 BottomNav |

详见 [loop-pass-3.md](./loop-pass-3.md)。

## Loop 文档索引

- [loop-pass-0.md](./loop-pass-0.md) — 基线审计
- [loop-pass-1.md](./loop-pass-1.md) — 情绪旅程
- [loop-pass-2.md](./loop-pass-2.md) — UX 变更
- [loop-pass-3.md](./loop-pass-3.md) — 技术分解
- [METRICS.md](./METRICS.md) — 指标定义

## 固定 Loop

- **Phase 1**（已停 @ Tick #15）：参与感设计 maint-0～13
- **Phase 2b**（✅ 已完成 @ Tick #30）：Top10 + P1–P3 + POL，见 [ui-ux-impl-tracker.md](./ui-ux-impl-tracker.md)
- **Phase 3**（**运行中**）：功能/UX/性能/SEO 四线 · **100 轮 · 完成即下一轮** · `AGENT_LOOP_TICK_PHASE3` · 见 [loop-config-phase3.md](./loop-config-phase3.md)
