# Loop 维护轮 #4/30

> 2026-06-21 · Tick #4 · P2 设计启动 + P1 实现排期

## 本轮焦点：P2-T001 观战 reaction 条 + P1 实现顺序

### Reaction 条 API 草案（P2-T001）

**原则**：轻社交、无持久 chat、限频、不影响 Agent 协议。

**端点**

```
POST /api/tables/[tableId]/reactions
Body: { emoji: "👏" | "🔥" | "😱" | "💪" }
Auth: 可选（匿名也可，按 IP/session 限频）
```

**限频**：每用户每桌 1 条 / 10 秒；每桌全局 30 条 / 分钟。

**SSE 扩展**

```typescript
recentReactions?: Array<{
  id: string;
  emoji: string;
  at: string;
  // 不暴露 userId，可选 displayName 前缀「观众」
}>;
```

- 内存 ring：每桌保留最近 20 条，桌 stop 清空
- 广播：现有 SSE snapshot 推送周期附带 `recentReactions`（或独立 `reaction` event）

**UI**：观战页底栏 4 个 preset 按钮；选中后 float 动画 2 秒消失（不遮挡牌桌）。

**Virtual Bot / 真人桌**
- AI 桌：启用
- 真人桌：P2 后期可选（优先 AI 观战线）

---

### P1 实现排期建议（1 PR / 任务）

| 顺序 | 任务 | 估时 | 依赖 |
|------|------|------|------|
| 1 | P1-T001 ring buffer + SSE `handSummaries` | 1–2d | simulator |
| 2 | `HandReviewList` 组件 + 观战页接入 | 0.5d | #1 |
| 3 | P1-T003 `HandInsightPanel` | 1d | snapshot heroHandAnalysis |
| 4 | P1-T004 `EngagementToastStack` | 0.5d | 无 |
| 5 | P1-T002 Coach Card on Agent 页 | 1d | #1, coaching stats API |

**建议首个 PR**：P1-T001 + HandReviewList（闭环「赛后回味」峰值 #9）。

---

## Loop 进度

| Tick | 文档 | 主题 |
|------|------|------|
| 0 | maint-0 | Kickoff + P0 验收 |
| 1 | maint-1 | per-hand 摘要模型 |
| 2 | maint-2 | HandInsight + Coach Card |
| 3 | maint-3 | Toast + simulator 写入点 |
| 4 | maint-4 | Reaction API + P1 排期 |

## 下一轮（Tick #5）建议

- P2-T002 BottomNav「练习」入口 + copy 统一
- 或更新 `ENGAGEMENT_ROADMAP.md` P1 状态为「设计完成，待实现」
