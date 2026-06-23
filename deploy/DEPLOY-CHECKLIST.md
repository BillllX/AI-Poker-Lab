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
- [ ] 人工无障碍 smoke check：发布后用键盘 `Tab` 验证 `/tables`（生产为 `/aipokerclub/tables`）页面主操作控件可聚焦，且焦点样式可见
- [ ] 人工无障碍语义检查：确认 `/tables`（生产为 `/aipokerclub/tables`）页面存在且仅存在一个 `h1` 主标题，并确认关键操作按钮具备可读名称（避免仅图标按钮缺少文本语义）
- [ ] 人工无障碍语言检查：确认 `/tables`（生产为 `/aipokerclub/tables`）页面根节点存在有效 `lang` 声明，且与页面主要文案语言一致（不强制固定语言值）
- [ ] 人工页面标题检查：确认 `/tables`（生产为 `/aipokerclub/tables`）加载后 `document.title` 非空，且与页面 `h1` 主标题语义一致（允许文案不完全相同），此项为人工核对不作为自动化/CI 门禁
- [ ] 人工首屏加载检查：在无痕窗口首次打开 `/tables`（生产为 `/aipokerclub/tables`），确认首屏关键文案约 3 秒内出现，且页面不长期停留在空白或骨架占位状态；此项为人工体验核对，不作为自动化测试、CI 门禁或严格性能 SLA。
- [ ] 人工深链接回退检查：在无痕窗口首次打开 `/tables`（生产为 `/aipokerclub/tables`），进入任一 `/tables/[tableId]` 后执行浏览器后退，确认可返回列表页且列表内容可见、无白屏；此项仅人工核对，不作为自动化测试、CI 门禁或 SLA 指标。
- [ ] 人工未知桌子路径兜底检查：在无痕窗口直接访问不存在的桌子路径 `/tables/not-exist`（生产为 `/aipokerclub/tables/not-exist`），确认页面无白屏，且有可理解的错误提示或返回入口；此项仅人工核对，不要求必须展示全局 404，不作为自动化测试、CI 门禁或 SLA 指标。
- [ ] 人工移动端窄屏横向溢出检查：在窄屏宽度下打开 `/tables`（生产为 `/aipokerclub/tables`），确认首屏无明显横向滚动，且主要内容未被裁切；此项仅人工核对，不作为自动化测试、CI 门禁或严格 SLA 指标。
- [ ] 人工 200% 浏览器缩放可用性检查：在桌面常规视口打开 `/tables`（生产为 `/aipokerclub/tables`）并将浏览器缩放设为 200%，确认首屏主要操作仍可见且可用、关键文字无明显重叠；此项仅人工核对，不作为自动化测试、CI 门禁或严格 SLA 指标。
- [ ] 人工 URL 一致性检查（桌面常规视口）：分别直接访问 `/tables` 与生产 `/aipokerclub/tables`，确认页面核心语义一致且无重定向循环；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对裸 `/tables` 永久可用性的承诺。
- [ ] 人工缓存一致性核对：发布后分别在普通窗口与无痕窗口打开 `/tables`（生产为 `/aipokerclub/tables`），确认页面主标题与关键首屏文案一致，且无旧版静态资源混用迹象；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA。
- [ ] 人工移动端系统字号放大可读性检查：发布后在手机浏览器将系统文字大小调大（如 iOS/Android 辅助功能字号）访问 `/tables`（生产为 `/aipokerclub/tables`），确认关键文案无明显重叠或截断且主要操作可见；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有系统字号档位的兼容承诺。
- [ ] 人工移动端系统深色模式可读性检查：发布后在手机浏览器开启系统深色模式访问 `/tables`（生产为 `/aipokerclub/tables`），确认关键文案与主要操作在深色背景下可辨识；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有机型与主题组合的兼容承诺。
- [ ] 人工移动端系统“减少动态效果”可用性检查：发布后在手机系统开启“减少动态效果/降低动画”后访问 `/tables`（生产为 `/aipokerclub/tables`），确认关键流程在弱化或关闭动画时仍可理解、可操作；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有机型与系统设置组合的兼容承诺，且不对具体动画实现方式作要求。
- [ ] 人工移动端弱网可理解性检查：发布后在慢速网络/省流环境访问 `/tables`（生产为 `/aipokerclub/tables`），确认加载中或失败态文案可理解，且提供可操作的重试或返回入口；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有网络条件的兼容承诺。
- [ ] 人工移动端读屏顺序检查：发布后使用 VoiceOver/TalkBack 访问 `/tables`（生产为 `/aipokerclub/tables`），确认读屏朗读顺序与视觉顺序基本一致，且主标题与关键操作名称可被正确读出；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有读屏器/系统组合的兼容承诺。
- [ ] 人工移动端横竖屏切换稳定性检查：发布后在手机浏览器访问 `/tables`（生产为 `/aipokerclub/tables`），执行竖屏→横屏→竖屏切换，确认页面无白屏、主操作不丢失、关键文案仍可见；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有机型与方向组合的兼容承诺。
- [ ] 人工移动端触控目标可操作性检查：发布后在手机浏览器访问 `/tables`（生产为 `/aipokerclub/tables`），抽查主要按钮/入口在单手触控下可稳定点击、无明显误触；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有机型与手势习惯的兼容承诺。
- [ ] 人工移动端页面内返回入口可达性检查：发布后在手机浏览器访问 `/tables`（生产为 `/aipokerclub/tables`），进入任一桌子页面后，确认页面内存在清晰且可点击的返回/上一级入口，并可通过该入口回到列表页；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有机型与浏览器返回手势一致性的承诺，且不要求新增 UI 功能或特定路由实现方式。
- [ ] 人工移动端桌子详情页断网/恢复错误态可理解性检查：发布后在手机浏览器从 `/tables`（生产为 `/aipokerclub/tables`）进入任一桌子页，临时断网后再恢复，确认错误提示文案可理解，且提供可点击的恢复路径（如重试或返回列表）；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有网络条件/机型组合的兼容承诺，且不要求新增 UI 功能或特定网络实现方式。
- [ ] 人工移动端浏览器字体设置放大可用性检查：发布后在手机浏览器仅调大浏览器字体设置（非系统辅助功能字号）访问 `/tables`（生产为 `/aipokerclub/tables`），并进入任一桌子详情页，确认关键按钮文案无明显截断且可点击；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有浏览器字体设置档位/机型组合的兼容承诺，且不要求特定 CSS/UI 实现。
- [ ] 人工移动端浏览器地址栏显隐稳定性检查：发布后在手机浏览器访问 `/tables`（生产为 `/aipokerclub/tables`），上下滚动触发地址栏收起/展开，再进入任一桌子详情页，确认关键按钮仍可见可点，且无明显布局跳动导致误触；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有移动浏览器地址栏行为的兼容承诺，且不要求特定动态视口 CSS/UI 实现方式。
- [ ] 人工移动端返回后列表滚动位置保持检查：发布后在手机浏览器访问 `/tables`（生产为 `/aipokerclub/tables`），向下滚动列表后进入任一桌子详情页，再返回列表，确认列表回到接近离开前的位置，避免回到顶部导致重复滚动或误触；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有浏览器滚动恢复行为的兼容承诺，且不要求特定路由或滚动实现方式。
- [ ] 人工移动端多标签页隔离核对：发布后在手机浏览器同时打开两个标签页，从 `/tables`（生产为 `/aipokerclub/tables`）分别进入不同桌子详情页并返回列表，确认两个标签页的列表状态、返回行为或错误提示无明显相互串扰；此项仅发布后人工核对，不作为自动化测试、CI 门禁或严格 SLA，也不构成对所有浏览器多标签状态隔离行为的兼容承诺，且不要求特定 storage/history/router 实现方式。

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
