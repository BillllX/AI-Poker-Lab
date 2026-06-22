# Mobile Quest · E2E 手测清单（P4）

> 测试环境：https://aiagentswitcher.com/aipokerclubtest · 视口 ≤640px

## 首屏 chrome

- [ ] Activity 单行 + Quest Hub 44px，总高 ≤96px
- [ ] 首页无 OpsBanner 独立条（公告在 Hub Tab）
- [ ] Hero 可视区 ≤65vh

## Quest Hub

- [ ] 折叠条展开 Sheet；Esc / 点遮罩关闭
- [ ] Tab「任务 / 公告」切换；公告可 dismiss
- [ ] 完成 Core 后出现 Grinder 领取区（已登录）
- [ ] ≥3⭐ 出现 toast + active 徽章（非 reduced-motion）
- [ ] 全完成 banner 文案

## 任务进度

- [ ] 观战 5 手 / Coach 1 次进度更新
- [ ] 分享 / 练习桌 / 快速开赛 optional 进度
- [ ] `/me` 今日进度 + 7 日历史

## 回归

- [ ] 无 React #185 白屏
- [ ] `npm run check:external-store-snapshots` 通过

## 桌面

- [ ] ≥641px 仍显示 OpsBanner + DailyTasksStrip（非 Hub）
