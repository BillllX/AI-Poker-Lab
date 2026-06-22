# UI/UX 实现 Loop Pass #13/30

> **P2-T003** · 高光手牌自动标记

## 实现

- `resolveHandHighlights()`：H1–H5 规则（大底池 / 河牌激斗 / Bad Beat / 大赢 / 全下对决）
- `buildAgentHandSummary()` 写入 `highlight` + `highlightTags`
- `HandReviewList`：高光行 🔥 badge + 标签 pill
- Agent 页 Coach Card：`pickHighlightHand` 优先选该 Agent 参与的高光手

## 文件

- `src/lib/poker/handHighlight.ts`
- `src/lib/poker/handSummary.ts`
- `src/lib/poker/types.ts`
- `src/components/HandReviewList.tsx`
- `src/lib/server/agentProfile.ts`
- `src/app/table/table.module.css`

## 验证

- `npm run lint && npm run build` ✓
