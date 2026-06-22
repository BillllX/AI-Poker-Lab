# UI/UX 实现 Loop Pass #21/30

> **Polish** · Coaching 历史结构化字段

## 实现

- **RuntimeInstructionNote**：新增可选 `sourceType`（`coaching`）与 `displayMessage`
- **Coaching API**：提交时写入结构化字段，LLM 仍用完整 `message` 前缀
- **共享工具** `coachingNoteDisplay.ts`：`isCoachingNote` / `resolveCoachingDisplayMessage`（旧记录仍走前缀剥离 fallback）
- **CoachDock**：按 `sourceType` 筛选并展示 `displayMessage`，移除组件内字符串 replace
- **agentProfile**：coaching 计数改用 `isCoachingNote`

## 文件

- `src/lib/coachingNoteDisplay.ts`（新）
- `src/lib/server/runtimeInstructions.ts`
- `src/app/api/users/me/agent/coaching/route.ts`
- `src/components/CoachDock.tsx`
- `src/lib/server/agentProfile.ts`

## 验证

- `npm run lint && npm run build` ✓
