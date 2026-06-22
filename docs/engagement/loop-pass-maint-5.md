# Loop 维护轮 #5/30

> 2026-06-21 · Tick #5 · P2-T002 导航 + Copy 统一

## 本轮焦点：BottomNav 五栏 + engagementCopy token

### 现状

[`BottomNav.tsx`](../../src/components/BottomNav.tsx) 当前 **4 项**：主页 / 排行榜 / 竞技场 / 我的牌手。  
[`/human-table`](../../src/app/human-table/page.tsx) **不在主导航**，发现性弱（Pass 0 缺口）。

### 建议布局（5 项）

| 序 | href | zh | en | match |
|----|------|----|----|-------|
| 1 | `/` | 主页 | Home | `/` |
| 2 | `/leaderboard` | 排行榜 | Leaderboard | `/leaderboard` |
| 3 | `/tables` | AI 竞技 | AI Arena | `/tables`, `/tables/*`, `/table` |
| 4 | `/human-table` | 练习 | Practice | `/human-table` |
| 5 | `/me` 或 `/login` | 我的牌手 | My Player | `/me`, `/journey` |

**图标**：第 4 项用「手牌/筹码」outline icon（与 Arena 区分）。

**Mobile 约束**
- 5 项时 label 字号降至 10px 或仅图标 + 短 label
- 测 [`BottomNav.module.css`](../../src/components/BottomNav.module.css) 320px 宽不溢出

### engagementCopy 统一 token（建议 `src/lib/client/engagementCopy.ts`）

| key | zh | en | 用途 |
|-----|----|----|------|
| `coachRole` | 实验员 / 教练 | Coach / Researcher | 首页、观战、/me |
| `spectatorMode` | 观战模式 | Spectator | 牌桌顶栏 |
| `nextHandCoaching` | 下一手 Coaching | Next-hand coaching | CoachDock |
| `handReview` | 本局复盘 | Hand review | HandReviewList |
| `practiceTable` | 真人练习桌 | Practice table | BottomNav + /me CTA |

**替换范围（实现阶段）**
- `page.tsx` tablePreviewText 中「服务端牌力分析」→ 与 HandInsight 落地后一致
- `tables/[tableId]` 与 `human-table` 共用 `spectatorMode` / `handReview`

### 与 METRICS

- `human_ai_cross_use`：BottomNav 第 4 项可衡量真人桌 UV 提升

### `/me` 二级入口（备选）

若 5 栏过挤，保留 4 栏 + 在 `/me` 顶部加「真人练习桌」card 链 `/human-table`（P0 已部分存在，需强化 copy）。

**推荐**：优先 5 栏，A/B 看 mobile 点击率。

---

## 下一轮（Tick #6）建议

- P2-T003 高光手牌 highlight 规则细化 + 与 P1-T001 字段对齐
- 或 P1 首 PR 实现 checklist（代码级，需用户确认开干）
