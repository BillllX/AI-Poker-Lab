# Mobile Quest Loop · Tracker

> Phase 4 · 40 轮 · 四线轮转：mobile-ux · quest-product · quest-impl · quest-reward

## Wave 1 — 移动端信息架构（M*）

| ID | 项 | Pillar | 状态 |
|----|-----|--------|------|
| M1 | Mobile Quest Hub 折叠条 + Sheet，隐藏移动端旧 DailyTasks/CheckIn | mobile-ux | ✅ |
| M2 | ActivityStrip 移动端单行紧凑模式 | mobile-ux | ✅ |
| M3 | OpsBanner 并入 Hub「公告」Tab 或首页可折叠 | mobile-ux | ✅ |
| M4 | 观战页 Coach 区与 Hub 不重叠（safe-area 复核） | mobile-ux | ✅ |
| M5 | 首页 Hero 首屏高度目标 ≤ 65vh（去条后验收） | mobile-ux | ✅ |

## Wave 2 — 任务池与进度（Q*）

| ID | 项 | Pillar | 状态 |
|----|-----|--------|------|
| Q1 | `questCatalog` 多任务定义（core + optional） | quest-product | ✅ |
| Q2 | 分享观战链接 / 访问练习桌 可选任务进度 | quest-impl | ✅ |
| Q3 | 快速开赛一次 可选任务 | quest-impl | ✅ |
| Q4 | 任务完成 client 事件 + analytics | quest-impl | ✅ |
| Q5 | `/me` 任务历史与今日星数展示 | quest-product | ✅ |

## Wave 3 — 奖励机制（R*）

| ID | 项 | Pillar | 状态 |
|----|-----|--------|------|
| R1 | 每任务奖励预览 copy（星数 / 徽章 hint） | quest-reward | ✅ |
| R2 | 完成 Core 双任务 → 尝试 claim grinder badge（已登录） | quest-reward | ✅ |
| R3 | 3 星「今日活跃」client 庆祝 + `/me` 荣誉条 | quest-reward | ✅ |
| R4 | 新 badge kind `quest_master`（Prisma + API） | quest-reward | ✅ |
| R5 | 实验积分 micro-bonus API 设计稿（不真钱） | quest-product | ✅ |

## Wave 4 — 打磨（P*）

| ID | 项 | Pillar | 状态 |
|----|-----|--------|------|
| P1 | Sheet focus trap + Esc + reduced-motion | mobile-ux | ✅ |
| P2 | 任务 i18n 收拢 `questCatalog` | quest-impl | ✅ |
| P3 | 空态：全部完成时的 Hub 文案 | quest-product | ✅ |
| P4 | E2E 手测清单写入 pass 文档 | quest-impl | ✅ |

Pass 日志：`mobile-quest-pass-0.md` … `mobile-quest-pass-28.md`

> **2026-06-22**：Wave 1–4 tracker 项（M/Q/R/P）已全部 ✅。Pass 16+ Wave2 backlog（B16–B28）已全部 ✅。

**Loop 状态**：`AGENT_LOOP_DONE_MOBILE_QUEST` · 28/40 完成（backlog 耗尽提前收官）· 详见 [mobile-quest-loop-close.md](./mobile-quest-loop-close.md)
