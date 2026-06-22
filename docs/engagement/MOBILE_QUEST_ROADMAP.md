# 移动端任务系统 · 产品路线图

> Phase 4 Loop · 2026-06-22  
> 合成 Pass 0 + 用户诉求

## 1. 问题陈述

移动端首屏被 **活动条 + 每日任务 + 签到 + 运营条** 纵向堆叠，挤压 Hero / 牌桌可视区。任务只有「观战 5 手 + Coach 1 次」两条硬线，**无可选任务、无完成奖励感知**。

## 2. 设计原则

| 原则 | 说明 |
|------|------|
| **一入口** | 移动端仅保留一条 Quest Hub（44px），详情进 Sheet |
| **多选可做** | Core 2 条 + Optional 3+ 条，完成任意组合即可攒星 |
| **奖励可见** | 每条任务展示「+1⭐ / 徽章 hint / 荣誉文案」，完成即时反馈 |
| **不绑架** | 可关闭 Hub 条；Activity 运营条可 dismiss；不做惩罚性 streak 断档 |
| **实验叙事** | 奖励为实验荣誉与 lab 积分提示，非真钱 |

## 3. 任务池（v1）

| ID | 类型 | 条件 | 奖励预览 |
|----|------|------|----------|
| `spectate` | Core | 观战 5 手 | +1⭐ · 观战者徽章进度 |
| `coach` | Core | 提交 1 次 Coaching | +1⭐ · Coach 荣誉 |
| `check_in` | Optional | 今日签到 | +1⭐ · streak 徽章 |
| `share` | Optional | 复制观战/分享链接 1 次 | +1⭐ · 传播实验 |
| `practice` | Optional | 打开真人练习桌 | +1⭐ · 练习者 |

**星数规则**：每完成 1 任务 +1⭐；≥3⭐ 显示「今日活跃」；Core 全完成额外 copy 庆祝（Wave 3）。

## 4. 移动端 IA（After）

```
┌─────────────────────────────┐
│ Activity（单行，可关）         │  ← M2 再瘦身
├─────────────────────────────┤
│ ⭐ 任务 2/5  展开 ▾          │  ← MobileQuestHub（M1）
├─────────────────────────────┤
│ Hero / 页面主体               │
├─────────────────────────────┤
│ BottomNav                    │
└─────────────────────────────┘

Sheet 内：任务列表 · 进度条 · 奖励 · 签到按钮 · 跳转 CTA
```

桌面端：保持现有分条布局（Hub 仅 `@media (max-width: 640px)`）。

## 5. 奖励与技术映射

| 奖励类型 | v1 | v2 |
|----------|----|----|
| 今日星数 | client 汇总 + Hub UI | `/me` 持久展示 |
| 荣誉徽章 | 文案 hint | `quest_master` badge + POST daily-badges |
| grinder/climber | 已有服务端逻辑 | Hub 内「可领取」按钮 |
| Lab 积分 bonus | 仅 UI copy | 受控 API + ledger |

## 6. Loop 执行顺序建议

1. **M1–M5** 移动端 chrome 收敛  
2. **Q1–Q5** 任务池与进度  
3. **R1–R5** 奖励闭环  
4. **P1–P4** a11y / i18n / 验收  

## 7. 成功指标

- 移动端首屏 chrome 高度 **≤ 96px**（Activity 单行 + Hub）
- 任务 Sheet 打开率、单任务完成率（见 `METRICS.md` 扩展 `engagement.quest.*`）
- 7 日内 `/me` 荣誉/badge 查看率 uplift

## 参考

- [mobile-quest-tracker.md](./mobile-quest-tracker.md)
- [mobile-quest-loop-config.md](./mobile-quest-loop-config.md)
- 现有：`dailyTasks.ts` · `dailyCheckIn.ts` · `userDailyBadges.ts`
