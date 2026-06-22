# Loop 维护摘要（Tick #0–8）

> 2026-06-21 · Tick #8 合成 · Texas Poker Club 玩家参与感

## 参与感三角 · 当前状态

| 维度 | P0 后 | 设计就绪（P1–P3） |
|------|-------|-------------------|
| 参与度 | Coach Dock、首页双榜 | Reaction 条、BottomNav 练习 |
| 参与感 | lastReasoning、我的牌手高亮 | Coach Card、HandReview |
| 情绪价值 | 赢家 seat/音、Live 预览 | Toast、HandInsight、高光徽章 |

## 已实现（代码 · 未 commit）

- `CoachDock` · `lastReasoning` UI · 首页三块 · `winningSeat` · `myAgentDeciding`

## 设计文档索引

| Tick | 文件 | 主题 |
|------|------|------|
| 0 | loop-pass-maint-0 | Kickoff、Loop 20m×30 |
| 1 | loop-pass-maint-1 | P1-T001 手牌摘要模型 |
| 2 | loop-pass-maint-2 | HandInsight + Coach Card |
| 3 | loop-pass-maint-3 | Toast + simulator 写入点 |
| 4 | loop-pass-maint-4 | Reaction API + P1 排期 |
| 5 | loop-pass-maint-5 | BottomNav 五栏 + copy |
| 6 | loop-pass-maint-6 | Highlight 规则 + PR checklist |
| 7 | loop-pass-maint-7 | P3 草图 + analytics spec |
| 8 | **本文** | 一页摘要 |

Pass 0–3 原始 Loop：[loop-pass-0.md](./loop-pass-0.md) … [loop-pass-3.md](./loop-pass-3.md)  
路线图：[ENGAGEMENT_ROADMAP.md](./ENGAGEMENT_ROADMAP.md) · 指标：[METRICS.md](./METRICS.md)

## 推荐实现顺序（4 PR）

1. **PR-1** 手牌摘要 + `HandReviewList`（闭环回味峰值 #9）
2. **PR-2** `HandInsightPanel`（牌力 reveal #6）
3. **PR-3** `EngagementToastStack`
4. **PR-4** Coach Card + BottomNav 练习

## Loop 剩余

- **8/30 tick 已处理**（含本摘要）
- Tick 9–30：可重复「设计深化 / 评审记录 / P1 实现进度」或 **用户确认后切到代码模式**

## 决策点（需产品确认）

1. 是否 **现在开始 P1 PR-1 代码**？
2. BottomNav **4 栏 vs 5 栏**（练习入口）
3. Tick 9+ Loop 是否 **降为文档维护** 或 **停止**（设计已齐）

---

*Tick #8 产出：本摘要文件 `loop-pass-maint-8.md`*
