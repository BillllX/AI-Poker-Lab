# Phase 3 四线合成 · Kickoff

> 2026-06-21 · 模型分工见 [loop-config-phase3.md](./loop-config-phase3.md)

## 目标

在 Phase 2b UX 闭环基础上，四线并进：

| 线 | 目标 |
|----|------|
| 功能/运营 | 更强人类参与感、可配置运营位、分享与复访 |
| UI/UX | 侧栏信息架构、token 统一、空态/loading |
| 性能 | LCP、API 缓存、SSE、bundle 拆分 |
| SEO | 可索引、OG、结构化数据、AI 爬虫说明 |

## 三模型 Kickoff 共识（Pass 0）

### 产品（gpt-5.5-medium 视角）

- **优先**：分享链接、运营 Banner、结算 CTA — ROI 高、改动面小
- **次优**：签到 streak — 需防刷，先用 localStorage 实验
- **避免**：重后台 CMS；用 env/const 配置 copy 即可

### UI/UX（composer-2.5-fast 视角）

- 观战侧栏 Tab 是最大 IA 痛点（日志/教练/洞察堆叠）
- 首页仍有 hardcoded cyan；应迁入 `globals.css` token
- 空态/ Skeleton 三处样式不一致（tables、leaderboard、me）

### 性能（gpt-5.3-codex 视角）

- 首页多次 `no-store` fetch — 加 5–15s 短缓存即可减 TTFB
- Hero PNG/WebP 已压缩；补 `fetchPriority="high"` 与 font-display
- SSE 断线立即重连会放大负载 — backoff 必做
- dynamic import 观战重组件可减首屏 JS ~15–25%（估）

### SEO（合成）

- **P0 已做**：sitemap、robots、OG/Twitter、JSON-LD
- **P1**：分页 metadata、Agent 动态 title/description
- **P2**：llms.txt、FAQ schema

## 测试环境发版约定

```bash
bash deploy/scripts/sync-deploy-test.sh   # rsync + SKIP_NPM_CI=1 build + restart
bash deploy/scripts/phase3-loop-arm-next.sh  # 本轮完成后触发下一轮（~5s debounce）
```

## 调度

- **100 轮**，**无固定间隔** — 上一轮 deploy 完成后立即 arm 下一轮
- 状态：[phase3-loop-state.json](./phase3-loop-state.json)

## 验收口径

- 每轮：`npm run lint && npm run build` 绿
- 每轮：`verify-test.sh` 绿
- 文档：`phase3-pass-{N}.md` 含四角色审核摘要
