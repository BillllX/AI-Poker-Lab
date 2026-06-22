# UI/UX 实现 Loop Pass #11/30

> **P1-T002** · Agent 页 Coach Card

## 实现

- 新组件 `CoachCard`：最近 3 次结算、Coaching 统计、高光手牌
- `agentProfile.ts` 新增 `coachCard { coachingCount, highlightHand }`
  - `coachingCount` 来自 runtime instructions
  - `highlightHand` 从当前桌 `handSummaries` 中按该 Agent 赢取金额取最高
- Agent 页用 Coach Card 替换原 `nextStep` 占位；保留 AI 牌手卡 iframe 与 contentGrid
- 样式：`agent-profile.module.css` 新增 `.coachCard` / `.coachCardGrid` / `.coachCardBlock`

## 文件

- `src/components/CoachCard.tsx`
- `src/lib/server/agentProfile.ts`
- `src/app/agents/[agentId]/page.tsx`
- `src/app/agents/agent-profile.module.css`

## 验证

- `npm run lint && npm run build` ✓
