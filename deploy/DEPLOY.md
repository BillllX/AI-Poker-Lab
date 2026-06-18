# AI Poker Lab 生产部署手册

本文档面向 **Cursor Agent 一次性部署** 与后续 **迁移/发版**。按顺序执行即可；发版时从「代码发布」章节开始。

---

## 1. 目标架构

| 组件 | 路径 / 端口 | 说明 |
|------|-------------|------|
| 域名 | `aiagentswitcher.com` | 主入口，**必须** HTTPS |
| 公网 IP | `150.158.85.220` | 备用 HTTP 入口 |
| nginx | `:80` / `:443` | 反向代理 + 静态站 |
| 本应用 | `/root/texas-poker-agents` → `:3000` | Next.js + 自定义 `server.ts` |
| PostgreSQL | `127.0.0.1:5432` | 库名 `texas_poker` |
| 静态首页 | `/var/www/bill` | 站点根 `/`，**不是**本应用 |

### 路由约定（勿随意改动）

| 外网路径 | 后端 |
|----------|------|
| `/` | 静态 SPA `/var/www/bill` |
| `/aipokerclub` | 本应用 `:3000`（`basePath=/aipokerclub`） |
| `/lobster/` | 小龙虾前端 `:5176`（独立服务） |
| `/api/*`（兼容） | 反代到 `:3000/aipokerclub/api/*` |
| `/_next/*`（兼容） | 反代到 `:3000/aipokerclub/_next/*` |
| `/tables` 等（兼容） | 301 → `/aipokerclub/tables` 等 |

**对外访问 URL（给用户）：**

- https://aiagentswitcher.com/aipokerclub
- http://150.158.85.220/aipokerclub（仅 IP 调试）

### basePath 三件套（缺一不可）

改 `NEXT_PUBLIC_BASE_PATH` 后必须 **同时** 满足：

1. 构建：`.env.production` 含 `NEXT_PUBLIC_BASE_PATH=/aipokerclub`
2. 运行：systemd drop-in `basepath.conf` 同值
3. 构建产物：`npm run build`（仅 `restart` 不够）

代码内链接与 fetch 使用 `withBasePath()` / `getBasePath()`，见 `src/lib/client/basePath.ts`。

---

## 2. 前置条件

### 服务器

- OpenCloudOS 9.x / 类 RHEL，root SSH 可用
- Node.js 20（生产机：`/opt/node-v20.19.5-linux-x64`，`npm` 在 `/usr/local/bin/npm`）
- PostgreSQL 已安装，库 `texas_poker` 已创建
- nginx 1.26+
- Let's Encrypt 证书（域名 `aiagentswitcher.com`）

### 本地 / Agent 环境

- 可 `ssh root@150.158.85.220`（BatchMode 免密或密钥）
- 仓库路径本地：`Texas-poker`（即 `texas-poker-agents`）

### 密钥（勿提交仓库）

在服务器维护，**不要**写入 git：

| 变量 | 用途 |
|------|------|
| `DATABASE_URL` | Prisma → PostgreSQL |
| `MINIMAX_API_KEY` | 托管 AI 牌手 LLM |
| `MINIMAX_BASE_URL` | 可选，默认 MiniMax Anthropic 兼容端点 |
| `HOSTED_AGENT_MODEL` | 可选，托管模型名 |

---

## 3. Agent 一次性部署流程

> **给 Cursor Agent 的执行顺序**：逐步 SSH，每步失败则停止并修复，不要跳步。

### Step 0 — 连通性与现状

```bash
ssh -o BatchMode=yes root@150.158.85.220 'uname -a; ss -tlnp | grep -E ":80|:443|:3000|:5432"'
```

期望：`:80`、`:443`（nginx）、`:3000`（node）、`:5432`（postgres）在监听或发版后即将监听。

### Step 1 — 同步代码到服务器

在**本地仓库**（排除 `node_modules`、`.next`、`.env`）：

```bash
rsync -avz --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude '.env*' --exclude '.cursor' \
  ./ root@150.158.85.220:/root/texas-poker-agents/
```

或使用 git（若服务器已 clone）：

```bash
ssh root@150.158.85.220 'cd /root/texas-poker-agents && git pull && git log -1 --oneline'
```

### Step 2 — 生产环境变量

在服务器创建/更新 `/root/texas-poker-agents/.env.production`（**仅构建用**，不含密钥时可只放 basePath）：

```bash
NEXT_PUBLIC_BASE_PATH=/aipokerclub
```

运行时密钥放在 **systemd**（见 Step 4），不要依赖把 `.env.production` 提交到 git。

### Step 3 — 依赖、数据库、构建

可手动执行，或上传后运行脚本 `deploy/scripts/deploy-remote.sh`：

```bash
ssh root@150.158.85.220 'bash /root/texas-poker-agents/deploy/scripts/deploy-remote.sh'
```

等价手动命令：

```bash
ssh root@150.158.85.220 'set -e
cd /root/texas-poker-agents
export PATH=/opt/node-v20.19.5-linux-x64/bin:/usr/local/bin:$PATH
npm ci
npm run prisma:generate
npm run prisma:migrate
export NEXT_PUBLIC_BASE_PATH=/aipokerclub
npm run build
systemctl restart texas-poker-agents
'
```

构建成功标志：存在 `.next/BUILD_ID`，且：

```bash
grep basePath /root/texas-poker-agents/.next/routes-manifest.json
# 应看到 "basePath": "/aipokerclub"
```

### Step 4 — systemd 服务

安装单元与 drop-in（模板见 `deploy/systemd/`）：

```bash
# 主单元（若不存在）
# deploy/systemd/texas-poker-agents.service.example → /etc/systemd/system/texas-poker-agents.service

# basePath（必须）
# deploy/systemd/basepath.conf.example → /etc/systemd/system/texas-poker-agents.service.d/basepath.conf

# 托管 Agent 密钥（必须，若启用托管牌手）
# deploy/systemd/hosted-agent.conf.example → .../hosted-agent.conf
# 在服务器上填入真实 MINIMAX_API_KEY、DATABASE_URL
```

重载并启动：

```bash
ssh root@150.158.85.220 'systemctl daemon-reload
systemctl enable texas-poker-agents
systemctl restart texas-poker-agents
systemctl status texas-poker-agents --no-pager -l | head -20'
```

### Step 5 — nginx

将仓库模板部署到服务器（**先备份**）：

```bash
ssh root@150.158.85.220 'cp /etc/nginx/conf.d/ai-assistant.conf /etc/nginx/conf.d/ai-assistant.conf.bak.$(date +%Y%m%d%H%M%S)'
```

把 `deploy/nginx/ai-assistant.conf.example` 复制为 `/etc/nginx/conf.d/ai-assistant.conf`，确认 SSL 证书路径存在：

```bash
ls /etc/letsencrypt/live/aiagentswitcher.com/fullchain.pem
nginx -t && systemctl reload nginx
ss -tlnp | grep -E ":80|:443"
```

### Step 6 — 发布后验证（必须全部通过）

在服务器：

```bash
curl -s -o /dev/null -w "/ -> %{http_code}\n" http://127.0.0.1/
curl -s -o /dev/null -w "/aipokerclub -> %{http_code}\n" http://127.0.0.1/aipokerclub
curl -s -o /dev/null -w "/aipokerclub/api/tables -> %{http_code}\n" http://127.0.0.1/aipokerclub/api/tables
curl -s -o /dev/null -w "legacy /api/tables -> %{http_code}\n" http://127.0.0.1/api/tables
```

外网：

```bash
curl -s -o /dev/null -w "https aipokerclub -> %{http_code}\n" https://aiagentswitcher.com/aipokerclub
curl -s -o /dev/null -w "https api -> %{http_code}\n" https://aiagentswitcher.com/aipokerclub/api/tables
curl -s -I http://aiagentswitcher.com/aipokerclub 2>&1 | grep -i location
# 期望：Location: https://aiagentswitcher.com/aipokerclub
```

期望状态码：`/` → 200；`/aipokerclub` → 200；API → 200（JSON）。

日志抽查：

```bash
journalctl -u texas-poker-agents -n 20 --no-pager
```

---

## 4. 日常发版（仅更新应用）

已有 nginx / systemd / 数据库时，Agent 只需：

```bash
# 1. rsync 或 git pull
# 2. 服务器上：
cd /root/texas-poker-agents
npm ci                                    # package-lock 变更时
npm run prisma:migrate                    # schema 变更时
export NEXT_PUBLIC_BASE_PATH=/aipokerclub
npm run build
systemctl restart texas-poker-agents
# 3. 跑 Step 6 验证
```

**不要**在仅改业务代码时改 nginx，除非路由约定变更。

---

## 5. 迁移场景

### 5.1 迁移到新 VM（整机搬迁）

1. 新机器安装：Node 20、PostgreSQL、nginx、certbot
2. `pg_dump texas_poker` → 新库 `psql` 恢复
3. rsync `/root/texas-poker-agents`（含 `.next` 可选，建议新机构建）
4. 复制 systemd 单元与 drop-in（含密钥）
5. 复制 `/etc/nginx/conf.d/ai-assistant.conf`，更新 IP / 证书
6. DNS `aiagentswitcher.com` 指向新 IP
7. `certbot certonly` 或复制 `/etc/letsencrypt`
8. 执行 Step 6 全量验证

### 5.2 仅换域名

1. 申请新证书，`ai-assistant.conf` 中改 `server_name` 与 `ssl_certificate` 路径
2. 若 Agent onboarding URL 写死域名，检查 `server.ts` / API 是否用 `Host` 头生成
3. `nginx -t && reload`，验证 HTTPS 与 WebSocket

### 5.3 修改 basePath（例如 `/aipokerclub` → `/poker`）

1. 改 `.env.production`、`basepath.conf` 中的 `NEXT_PUBLIC_BASE_PATH`
2. **必须** `npm run build` + `systemctl restart`
3. 改 nginx 中所有 `aipokerclub` 字符串（location、legacy 反代路径）
4. 全局搜代码与文档中的硬编码路径

### 5.4 与静态站 `/` 共存（当前模式）

- 根路径 **永远** 指向 `/var/www/bill`，不要把 `:3000` 挂到 `/`
- Poker 只挂在 `/aipokerclub`
- 在 Bill 静态页加链接到 `/aipokerclub` 方便用户发现

### 5.5 数据库迁移（Prisma）

```bash
cd /root/texas-poker-agents
npm run prisma:migrate    # 生产用 migrate deploy
systemctl restart texas-poker-agents
```

回滚：恢复 `pg_dump` 备份 + 部署旧 git tag 的 build。

---

## 6. 故障排查

| 症状 | 可能原因 | 处理 |
|------|----------|------|
| 域名完全打不开 | HTTPS 未监听 / 证书过期 | `ss -tlnp \| grep 443`；`certbot certificates`；恢复 `ai-assistant.conf` |
| 页面无样式 | 构建未带 basePath | 设 `.env.production` 后 **重新 build** |
| API 返回 HTML | 请求打到 `/api/` 但 nginx 未配 legacy | 使用 `deploy/nginx/ai-assistant.conf.example` |
| 链接跳到 `/tables` 404 | 运行时无 basePath | 检查 `basepath.conf` 并 restart |
| `/aipokerclub/` 与无斜杠 308 | 正常 Next 行为 | 用 `/aipokerclub`，不要 nginx 强制加斜杠 |
| 牌桌 SSE 断开 | 服务重启或 upstream 超时 | 查 `journalctl -u texas-poker-agents` 与 nginx error.log |
| 托管 AI 不决策 | `MINIMAX_API_KEY` 缺失 | 检查 `hosted-agent.conf` |
| `Connection refused :3000` | 服务未起 / 构建失败 | `systemctl status texas-poker-agents` |

常用命令：

```bash
journalctl -u texas-poker-agents -f
tail -f /var/log/nginx/error.log
ss -tlnp | grep -E "3000|80|443"
```

---

## 7. 仓库内文件索引

| 文件 | 用途 |
|------|------|
| `deploy/DEPLOY.md` | 本文档（Agent 主流程） |
| `deploy/DEPLOY-CHECKLIST.md` | 发版勾选清单（简版） |
| `deploy/nginx/ai-assistant.conf.example` | 完整 nginx（含 HTTPS + legacy） |
| `deploy/nginx/aipokerclub-location.snippet` | 仅 Poker 反代片段 |
| `deploy/systemd/texas-poker-agents.service.example` | systemd 主单元 |
| `deploy/systemd/basepath.conf.example` | basePath drop-in |
| `deploy/systemd/hosted-agent.conf.example` | 密钥 drop-in 模板 |
| `deploy/scripts/deploy-remote.sh` | 服务器端 build + restart 脚本 |
| `deploy/scripts/verify-production.sh` | 发布后自动验证脚本 |
| `.cursor/rules/production-routing.mdc` | Agent 路由约定 |
| `PROJECT_CONTEXT.md` | 架构与产品说明 |

---

## 8. Agent 执行摘要（复制给 Cursor）

```
目标：将 Texas-poker 部署到 root@150.158.85.220:/root/texas-poker-agents
路由：HTTPS https://aiagentswitcher.com/aipokerclub ，basePath=/aipokerclub
步骤：rsync → .env.production → npm ci → prisma migrate → npm run build → systemd restart → nginx reload → 跑 deploy/scripts/verify-production.sh
禁止：提交密钥；把应用挂到站点根 /；只 restart 不 build（改 basePath 或前端后）
参考：deploy/DEPLOY.md 全文
```
