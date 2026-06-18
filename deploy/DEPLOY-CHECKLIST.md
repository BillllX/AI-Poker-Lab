# Texas Poker Lab — 发版检查清单（简版）

完整流程、迁移与 Agent 指令见 **[deploy/DEPLOY.md](./DEPLOY.md)**。

主机：`150.158.85.220` / `aiagentswitcher.com`  
应用 URL：**https://aiagentswitcher.com/aipokerclub**

---

## 路由（勿改乱）

| 外网路径 | 后端 |
|---|---|
| `/` | 静态 `/var/www/bill` |
| `/aipokerclub` | `texas-poker-agents` → `:3000` |
| `/api/*`、`/_next/*` | 兼容反代（见 nginx 全量模板） |
| `/lobster/` | 小龙虾 `:5176` |

---

## 发版前

- [ ] 代码已同步到 `/root/texas-poker-agents`
- [ ] `.env.production` 含 `NEXT_PUBLIC_BASE_PATH=/aipokerclub`
- [ ] `npm ci`（lockfile 变更时）
- [ ] `npm run prisma:migrate`（schema 变更时）
- [ ] `export NEXT_PUBLIC_BASE_PATH=/aipokerclub && npm run build`
- [ ] `basepath.conf` drop-in 存在且值一致
- [ ] `hosted-agent.conf` 密钥有效（托管 AI 需要）

## 发版

- [ ] `systemctl restart texas-poker-agents`
- [ ] nginx 未改路由时 **不必** reload；若更新了 `ai-assistant.conf`：`nginx -t && systemctl reload nginx`

## 发版后

- [ ] 运行 `bash deploy/scripts/verify-production.sh`（或在服务器执行同逻辑 curl）
- [ ] `journalctl -u texas-poker-agents -n 30` 无持续报错

---

## 常见失误

| 症状 | 原因 | 处理 |
|---|---|---|
| 域名打不开 | HTTPS 未监听 | 恢复 `deploy/nginx/ai-assistant.conf.example` |
| 无样式 / 404 静态 | build 无 basePath | 重设 `.env.production` 后 **重新 build** |
| API 返回 HTML | `/api/` 未反代 | 使用全量 nginx 模板 |
| 链接跳到 `/tables` 404 | 运行时无 basePath | 补 `basepath.conf` 并 restart |

---

## 仓库文件

- `deploy/DEPLOY.md` — 主文档
- `deploy/nginx/ai-assistant.conf.example`
- `deploy/nginx/aipokerclub-location.snippet`
- `deploy/systemd/*.example`
- `deploy/scripts/verify-production.sh`
