# 测试环境部署（/aipokerclubtest）

与生产 `/aipokerclub` **完全独立**：独立代码目录、端口、PostgreSQL 库、systemd 服务、`node_modules` 与 `.next` 构建产物。

## 访问地址

| 入口 | URL |
|------|-----|
| HTTPS（主） | https://aiagentswitcher.com/aipokerclubtest |
| HTTP IP | http://150.158.85.220/aipokerclubtest |

## 服务器资源

| 组件 | 值 |
|------|-----|
| 代码目录 | `/root/texas-poker-agents-test` |
| systemd | `texas-poker-agents-test` |
| 端口 | `:3001` |
| 数据库 | `texas_poker_test`（用户 `texas_poker_test`） |
| basePath | `/aipokerclubtest` |

生产仍为 `/root/texas-poker-agents`、`:3000`、`texas_poker`，互不影响。

## 首次部署（已完成可跳过）

```bash
# 本地
rsync -avz --delete --exclude node_modules --exclude .next --exclude .git \
  --exclude '.env*' --exclude '.cursor' \
  ./ root@150.158.85.220:/root/texas-poker-agents-test/

# 服务器：建库 + systemd + nginx
ssh root@150.158.85.220 'bash /root/texas-poker-agents-test/deploy/scripts/setup-test-server.sh'
```

## 日常发版

```bash
# 完整（含 npm ci，package.json 变更时用）
rsync -avz --delete --exclude node_modules --exclude .next --exclude .git \
  --exclude '.env*' --exclude '.cursor' \
  ./ root@150.158.85.220:/root/texas-poker-agents-test/
ssh root@150.158.85.220 'bash /root/texas-poker-agents-test/deploy/scripts/deploy-remote-test.sh'

# Loop 快发（跳过 npm ci，仅 generate + build + restart）
bash deploy/scripts/sync-deploy-test.sh
# 或远程：SKIP_NPM_CI=1 bash deploy/scripts/deploy-remote-test.sh
```

## 仓库文件

- `deploy/scripts/setup-test-server.sh` — 一次性 bootstrap
- `deploy/scripts/deploy-remote-test.sh` — build + restart
- `deploy/scripts/verify-test.sh` — 健康检查
- `deploy/nginx/aipokerclubtest-location.snippet` — nginx 片段
- `deploy/systemd/texas-poker-agents-test.service.example`

## 注意

- 改 `NEXT_PUBLIC_BASE_PATH` 或 `NEXT_PUBLIC_SITE_ORIGIN` 后必须 `npm run build`，不能只 restart。
- SEO 约定见 [docs/engagement/SEO_SITE_ORIGIN.md](../docs/engagement/SEO_SITE_ORIGIN.md)。
- 测试库密码在服务器 `/root/.texas-poker-test-db-pass`（勿提交 git）。
- 托管 Agent LLM 密钥复用生产 drop-in（`hosted-agent.conf`），可按需改为独立 key。
