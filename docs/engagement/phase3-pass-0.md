# Phase 3 Loop · Pass 0（Kickoff + SEO 基线）

> 2026-06-21 · `AGENT_LOOP_TICK_PHASE3` 启动前手动执行

## 本轮完成

| ID | 变更 | 文件 |
|----|------|------|
| S1 | `robots.ts` + `sitemap.ts` | `src/app/robots.ts`, `sitemap.ts` |
| S2 | OpenGraph / Twitter / keywords / canonical | `src/app/layout.tsx` |
| S3 | JSON-LD WebApplication | `src/components/SiteJsonLd.tsx` |
| — | `getSiteOrigin()` / `absoluteUrl()` | `src/lib/server/siteUrl.ts` |
| — | 测试快发：`SKIP_NPM_CI=1` + `sync-deploy-test.sh` | `deploy/scripts/` |

## 四角色审核摘要

| 角色 | 结论 |
|------|------|
| 产品 gpt-5.5-medium | SEO 基线不挡运营迭代；下轮 F1 Banner 与 F2 分享链接优先 |
| UX composer-2.5-fast | metadata 文案与首页 hero 承诺一致；OG 图可后续换专用 1200×630 |
| 性能 gpt-5.3-codex | sitemap/robots 零运行时开销；JSON-LD 内联 <1KB，可接受 |
| 代码 gpt-5.3-codex | basePath 通过 `metadataBase` + `absoluteUrl` 统一；无硬编码生产域名 |

## 验证

- [x] `npm run lint && npm run build`
- [x] `sync-deploy-test.sh` → verify-test
- [x] 浏览器：`/aipokerclubtest/sitemap.xml`、`/robots.txt`

## 下一轮（Tick #1 · pillar=feature · 完成即触发 #2）

**F1** 首页运营 Banner（可 dismiss + sessionStorage）

Loop：**100 轮 · 完成即下一轮** — 每轮结束执行 `bash deploy/scripts/phase3-loop-arm-next.sh`
