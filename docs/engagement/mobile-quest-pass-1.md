# Mobile Quest Loop · Pass 1（M1 + Q1 + R1）

> Tick 1/40 · pillar=mobile-ux · 代码实现 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/questCatalog.ts` | 5 条任务（2 Core + 3 Optional）+ 奖励预览 |
| `src/lib/client/questOptionalProgress.ts` | 分享 / 练习桌可选任务进度 |
| `src/components/MobileQuestHub.tsx` | 移动端 44px 折叠条 + Sheet |
| `src/components/LazyMobileQuestHub.tsx` | layout 动态加载 |
| `src/app/layout.tsx` | 挂载 Quest Hub |
| `DailyTasksStrip` / `DailyCheckInStrip` CSS | 移动端隐藏旧条 |
| 观战分享 / 练习桌 | 写入可选任务进度 |

## 产品要点

- 任务**可多可少**：Optional 不做也不挡 Core。
- 每条显示 **+1⭐ + 奖励 hint**；≥3⭐ 显示「今日活跃」。
- 桌面端仍用原分条布局。

## 验证

- [x] lint/build
- [ ] sync-deploy-test（本轮 deploy）

## 下一轮

Pass 2 · **M2** ActivityStrip 移动端单行紧凑
