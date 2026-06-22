# SEO · Canonical URL 与 `NEXT_PUBLIC_SITE_ORIGIN`

> Phase 3 · Pass 12（S6）

## 用途

- `metadataBase`、`<link rel="canonical">`、OpenGraph `url`、sitemap 条目需使用**绝对 URL**（含 basePath）。
- 运行时/构建时通过 `getSiteOrigin()` / `absoluteUrl()` 统一生成，见 `src/lib/server/siteUrl.ts`。

## 环境变量

| 变量 | 必填 | 示例 |
|------|------|------|
| `NEXT_PUBLIC_BASE_PATH` | 生产/测试必填 | `/aipokerclub` 或 `/aipokerclubtest` |
| `NEXT_PUBLIC_SITE_ORIGIN` | 可选 | `https://aiagentswitcher.com/aipokerclub` |

未设置 `NEXT_PUBLIC_SITE_ORIGIN` 时默认：

- 生产：`https://aiagentswitcher.com` + `NEXT_PUBLIC_BASE_PATH`
- 本地：`http://localhost:3000` + basePath（若有）

## 各环境推荐值

| 环境 | `NEXT_PUBLIC_BASE_PATH` | `NEXT_PUBLIC_SITE_ORIGIN` |
|------|-------------------------|-----------------------------|
| 生产 | `/aipokerclub` | `https://aiagentswitcher.com/aipokerclub` |
| 测试 | `/aipokerclubtest` | `https://aiagentswitcher.com/aipokerclubtest` |
| 本地 | （空） | （可不设） |

**改 basePath 或 SITE_ORIGIN 后必须重新 `npm run build`**，不能只 restart。

## 代码约定

- 新页面：`buildPageMetadata({ path, title, description })`（`src/lib/server/pageMetadata.ts`）
- Client page：旁路 server `layout.tsx` 导出 metadata
- Agent 动态页：`agents/[agentId]/layout.tsx` 的 `generateMetadata`

## 部署脚本

- 测试：`deploy/scripts/deploy-remote-test.sh` 写入 `.env.production` 并 export 构建变量
- 生产：在 `.env.production` / systemd drop-in 中同步设置

## 验证

```bash
curl -sI https://aiagentswitcher.com/aipokerclubtest/tables | grep -i link
# 或查看页面 <head> 中 canonical
curl -s https://aiagentswitcher.com/aipokerclubtest/llms.txt | head
```

## AI 爬虫

- 动态路由 `src/app/llms.txt/route.ts` → `{SITE_ORIGIN}/llms.txt`
- 内容生成见 `src/lib/server/llmsTxt.ts`（含 Agent skill / WebSocket 说明）
