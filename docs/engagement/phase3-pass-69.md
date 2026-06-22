# Phase 3 Loop · Pass 69（F18 牌桌内报告问题）

> Tick #69/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/tableFeedbackLink.ts` | 预填 table/hand/URL 的反馈链接构建 |
| `src/components/TableFeedbackLink.tsx` | 观战桌 header「报告问题 / Report issue」 |
| `src/app/tables/[tableId]/page.tsx` | 挂载反馈链接（复制观战链接旁） |
| `src/app/table/table.module.css` | `.feedbackLink` 样式 |
| `.env.example` | `NEXT_PUBLIC_TABLE_FEEDBACK_URL` 说明 |

## 行为

- 默认打开 GitHub new issue，正文含牌桌 ID、手数、阶段、当前 URL
- 可通过 `NEXT_PUBLIC_TABLE_FEEDBACK_URL` 改为 mailto 或自定义表单

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #70 · **ux** · U18（见 tracker ⬜）
