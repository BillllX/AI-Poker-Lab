# Loop 维护轮 #0（Kickoff）

> 2026-06-21 · Loop 重调度后立即执行

## 变更

- 原 2h 单次 wake 已停止（PID 41553）
- 新调度：**每 20 分钟 × 最多 30 次**（`AGENT_LOOP_TICK_ENGAGEMENT`）
- 配置见 [loop-config.md](./loop-config.md)

## P0 指标采集点对照（METRICS.md）

| 检查点 | 状态 |
|--------|------|
| Coach Dock 显示 appliesFromHandId | ✅ 已实现 |
| lastReasoning 在我的牌手面板 | ✅ 已实现 |
| 首页 Live 预览 + 双榜 | ✅ 已实现 |
| AI 桌 winningSeat + WIN 徽章 | ✅ 已实现 |
| myAgentDeciding 音效 | ✅ 已实现 |
| 前端 analytics 事件 | ⏳ 未接（P1 可选） |

## 下一轮（Tick #1）建议

- 开始 P1-T001 设计草案：Agent 桌 per-hand 摘要字段与 SSE 扩展
- 或补充 `HandInsightPanel` 线框到 loop-pass-2 附录
