# Phase 3 Loop · Pass 51（P13 静态页 ISR revalidate）

> Tick #51/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/server/staticPageRevalidate.ts` | 统一 ISR 间隔常量（3600s） |
| `src/app/journey/layout.tsx` | `revalidate = 3600` |
| `src/app/casino-org/layout.tsx` | 同上 |
| `src/app/human-table/layout.tsx` | 同上 |
| `src/app/leaderboard/layout.tsx` | 同上 |
| `src/app/login/layout.tsx` | 新建 layout + ISR + metadata |
| `src/app/llms.txt/route.ts` | Cache-Control 与常量对齐 |

注：`/tables` 因含动态 `[tableId]` 子路由未设 segment revalidate，避免 Next 配置冲突。

## 验证

- `npm run lint && npm run build` ✅（journey/casino-org 等显示 `1h` ISR）
- 测试环境 deploy ✅

## 下一轮

Tick #52 · **seo** · Wave 3 polish 或下一 pillar ⬜（tracker 无 seo ⬜ 时走 polish）
