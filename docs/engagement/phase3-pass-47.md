# Phase 3 Loop · Pass 47（P12 tables list 精简）

> Tick #47/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/server/tablesListPayload.ts` | 大厅 API 专用 table/agent summary（去掉 `currentPlayerId`、注册时间等冗余字段） |
| `src/app/api/tables/route.ts` | 映射 slim payload；移除未使用的 `modelStats`（避免每桌 `cachedSnapshot` 扫描） |
| `src/lib/server/residentAgents.ts` | resident 池 Prisma bootstrap 只跑一次；`findUnique` 仅 `select pointsBalance` |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #48 · **seo** · S15 Core Web Vitals 说明入 llms.txt
