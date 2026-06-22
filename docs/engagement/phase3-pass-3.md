# Phase 3 Loop · Pass 3（P1 首页 tables 短缓存）

> Tick #3/100 · pillar=**perf** · 代码实现 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/api/tables/route.ts` | `Cache-Control: public, s-maxage=10, stale-while-revalidate=30` |
| `src/app/page.tsx` | 首页 `/api/tables` fetch 去掉 `no-store`，尊重 HTTP 缓存 |

## 验证

- [x] lint/build · deploy test

## 下一轮

Tick #4 · **seo** · S4 静态页 metadata（layout.tsx）
