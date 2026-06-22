# Mobile Quest Loop · Pass 0（基线审计）

> 2026-06-22 · Kickoff

## 移动端顶部「Chrome 堆叠」现状

| 层级 | 组件 | 位置 | 移动端问题 |
|------|------|------|------------|
| 1 | `ActivityStrip` | `layout.tsx` 全局 | 全宽黄条 + CTA，~52px |
| 2 | `DailyTasksStrip` | `layout.tsx` 全局 | 紫条双任务文案 + CTA，~56px |
| 3 | `OpsBanner` | 首页 `page.tsx` | 运营通知，~48px |
| 4 | `DailyCheckInStrip` | 首页 `page.tsx` | 签到条，~56px |
| **合计（首页）** | | | **~210px+** 才到 Hero |

观战页 `/tables/[id]` 无签到/Ops，但仍叠 **Activity + DailyTasks**。

## 任务系统现状

| 能力 | 状态 |
|------|------|
| 观战 5 手 | ✅ `dailyTasks.ts` |
| Coaching 1 次 | ✅ |
| 签到 streak | ✅ 独立条，**未与任务奖励联动** |
| 可选任务 | ❌ 仅 2 条固定线 |
| 奖励领取 | ⚠️ 服务端 badge（climber/grinder/highlight），**UI 无任务完成→领奖路径** |
| 任务面板 | ❌ 无汇总 |

## Pass 0 设计方向（写入 ROADMAP）

1. **Mobile Quest Hub** — 移动端单条 44px 入口，点开 Bottom Sheet 看全部任务与奖励。
2. **任务池** — Core（观战/Coach）+ Optional（签到/分享/练习/快速开赛），可只做部分。
3. **奖励层** — 每任务显示奖励预览；完成累积「今日星数」；登录用户对接 `daily-badges`；后续 Wave 2 实验积分 micro-bonus。

## 下一轮

Pass 1 · **M1** 实现 `MobileQuestHub` + `questCatalog` + 移动端隐藏旧条。
