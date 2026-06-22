# Phase 3 任务追踪 · 功能/运营 · UI/UX · 性能 · SEO

> **100 轮 Loop · 完成即下一轮** · 每轮发 `/aipokerclubtest`

**图例**：⬜ 待做 · 🔄 进行中 · ✅ 完成

## Wave 1 — 核心 backlog

### 功能 / 运营（F）

| ID | 任务 | 状态 |
|----|------|------|
| F1 | 首页可配置运营 Banner（copy + CTA + dismiss） | ✅ |
| F2 | 观战页「复制观战链接」+ 分享文案 | ✅ |
| F3 | 牌桌结算「再来一局 / 回大厅」双 CTA | ✅ |
| F4 | 每日签到 / streak 轻量 UI（localStorage + 徽章） | ✅ |
| F5 | 站内活动通知条（admin copy via env 或 const） | ✅ |
| F6 | Agent 页「收藏」星标 + 我的收藏列表入口 | ✅ |
| F7 | 积分榜周榜 / 日榜 Tab | ✅ |
| F8 | Coaching 里程碑 toast（第 N 次提交） | ✅ |

### UI / UX（U）

| ID | 任务 | 状态 |
|----|------|------|
| U1 | 观战侧栏 Tab（日志 / 教练 / 洞察） | ✅ |
| U2 | 首页 cyan 渐变全量 design token | ✅ |
| U3 | 统一 `SkeletonBlock` loading 组件 | ✅ |
| U4 | 空态组件 `EmptyState` 统一三页 | ✅ |
| U5 | 移动端 touch target ≥44px 审计补丁 | ✅ |
| U6 | `TableMomentOverlay` 抽取复用 | ✅ |
| U7 | 表单 inline 错误样式统一 | ✅ |
| U8 | 焦点环 / reduced-motion 一致性扫尾 | ✅ |

### 性能（P）

| ID | 任务 | 状态 |
|----|------|------|
| P1 | 首页 live tables fetch + Route Handler 短缓存 | ✅ |
| P2 | `next/font` 本地 Inter，减 CLS | ✅ |
| P3 | SSE 重连 exponential backoff | ✅ |
| P4 | 重组件 dynamic import（HandInsight / CoachDock） | ✅ |
| P5 | Hero LCP：`fetchPriority` + 预加载 WebP | ✅ |
| P6 | `/api/tables` 列表 limit + stale-while-revalidate | ✅ |
| P7 | 观战页 log 列表虚拟化或 cap 条数 | ✅ |

### SEO（S）

| ID | 任务 | 状态 |
|----|------|------|
| S1 | `robots.ts` + `sitemap.ts` | ✅ |
| S2 | 根 layout OpenGraph / Twitter / keywords | ✅ |
| S3 | 首页 JSON-LD WebApplication | ✅ |
| S4 | 各静态页 `generateMetadata` | ✅ |
| S5 | Agent 动态页 `generateMetadata` | ✅ |
| S6 | `canonical` + `NEXT_PUBLIC_SITE_ORIGIN` 文档 | ✅ |
| S7 | `public/llms.txt` AI 爬虫说明 | ✅ |
| S8 | 结构化数据 FAQ / HowTo（首页实验流程） | ✅ |

## Wave 2 — 扩展（轮次 33+ 优先取 ⬜）

### 功能 / 运营（F9–F20）

| ID | 任务 | 状态 |
|----|------|------|
| F9 | 观战 reaction 快捷 emoji 栏增强 | ✅ |
| F10 | 排行榜「我的排名」sticky 条 | ✅ |
| F11 | 快速开赛成功 celebration 微动画 | ✅ |
| F12 | 真人桌邀请链接 copy | ✅ |
| F13 | 首页「最近观战」localStorage 续看 | ✅ |
| F14 | Agent 主页「对比其他 Agent」入口 | ✅ |
| F15 | 实验积分变动实时 toast | ✅ |
| F16 | 注册/onboarding 进度条 | ✅ |
| F17 | 多语言运营 copy 切换（en/zh key） | ✅ |
| F18 | 牌桌内「报告问题」反馈链接 | ✅ |
| F19 | 每日任务：观战 5 手 / coaching 1 次 | ✅ |
| F20 | 赛季标签 / 活动角标组件 | ✅ |

### UI / UX（U9–U20）

| ID | 任务 | 状态 |
|----|------|------|
| U9 | 牌桌 seat 动画 reduced-motion 分支 | ✅ |
| U10 | BottomNav active 指示器统一 | ✅ |
| U11 | 排行榜 mobile 卡片化 | ✅ |
| U12 | 登录/注册 modal 步骤指示 | ✅ |
| U13 | 观战页 pot 变化数字滚动 | ✅ |
| U14 | 我的页 agent 卡 grid 响应式 | ✅ |
| U15 | 深色模式下 contrast 审计 | ✅ |
| U16 | 表格/列表 zebra stripe token | ✅ |
| U17 | Coach Dock 折叠态记忆 | ✅ |
| U18 | 首页 hero CTA 双按钮 hierarchy | ✅ |
| U19 | 错误页 404 品牌化 | ✅ |
| U20 | 真人桌 action bar sticky 优化 | ✅ |

### 性能（P8–P17）

| ID | 任务 | 状态 |
|----|------|------|
| P8 | leaderboard API 缓存 30s | ✅ |
| P9 | 音频 lazy load / 首触再载 | ✅ |
| P10 | React.memo 热点 seat 组件 | ✅ |
| P11 | SSE payload 瘦身（omit 冗余字段） | ✅ |
| P12 | prisma 查询 select 精简（tables list） | ✅ |
| P13 | 静态页 ISR revalidate | ✅ |
| P14 | bundle analyzer 报告入 docs | ✅ |
| P15 | 图片 sizes 属性补全 | ✅ |
| P16 | prefetch 下一跳 Link（tables→观战） | ✅ |
| P17 | service worker 仅 offline shell（可选） | ✅ |

### SEO（S9–S15）

| ID | 任务 | 状态 |
|----|------|------|
| S9 | journey / casino-org 独立 metadata | ✅ |
| S10 | Agent profile OG 动态图 | ✅ |
| S11 | breadcrumbs JSON-LD | ✅ |
| S12 | hreflang en + zh-Hans | ✅ |
| S13 | noscript 关键内容 fallback | ✅ |
| S14 | sitemap 加入活跃 Agent 页（top N） | ✅ |
| S15 | Core Web Vitals 说明入 llms.txt | ✅ |

## Wave 3 — Polish（某 pillar 无 ⬜ 时）

同 pillar 已完项做 **二轮打磨**：a11y、copy、edge case；pass 日志标记 `polish:<ID>`。

---

**Loop 状态**：见 [phase3-loop-state.json](./phase3-loop-state.json) · Kickoff [phase3-pass-0.md](./phase3-pass-0.md)

**轮转规则**：Tick N → pillar = **(N−1) mod 4** → `0=feature, 1=ux, 2=perf, 3=seo`，取该 pillar 下一 ⬜ 项。
