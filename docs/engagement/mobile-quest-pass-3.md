# Mobile Quest Loop · Pass 3（Q2 + Q3 + Q4）

> Tick 3/40 · pillar=quest-impl · 可选任务进度 + 完成事件 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `questOptionalProgress.ts` | 写入时同步 cache；新增 `quickPlay` 可选任务 flag |
| `questCatalog.ts` | 第 6 条可选任务「快速开赛一次」+ `#quick-play` CTA |
| `questCompletionTelemetry.ts` | 首次完成时派发 `engagement.quest.complete` |
| `MobileQuestHub.tsx` | `useMemo` 任务板 + 完成 telemetry |
| `engagementAnalytics.ts` | 新事件类型 `engagement.quest.complete` |
| `page.tsx` / `tables/*` | 快速开赛成功写入 quest 进度 |
| `external-store-snapshot-smoke.ts` | quickPlay snapshot 稳定性 |

## 产品要点

- Q2：分享 / 练习桌进度写入后 Hub 即时刷新（cache + event）。
- Q3：首页 / 牌桌列表 / 结算再开 均计「快速开赛」可选任务。
- Q4：每条任务首次完成打 client analytics（按日去重）。

## 验证

- [x] lint/build
- [x] sync-deploy-test

## 下一轮

Pass 4 · **M3** OpsBanner 并入 Hub「公告」Tab（pillar=quest-reward 线见 tracker R2）
