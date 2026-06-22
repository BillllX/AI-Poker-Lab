# Phase 3 Loop · Pass 2（U1 观战侧栏 Tab）

> Tick #2/100 · pillar=**ux** · 代码实现 ✅

## 变更文件

| 文件 | 说明 |
|------|------|
| `src/components/SpectatorSideTabs.tsx` | 日志 / 教练 / 洞察 三 Tab + sessionStorage 记忆 |
| `src/components/SpectatorSideTabs.module.css` | Pill tab 样式、44px touch、sticky（移动） |
| `src/app/tables/[tableId]/page.tsx` | 侧栏重组；赢家「查看日志」自动切 Log Tab |

## 四角色审核

| 角色 | 结论 |
|------|------|
| 产品 | 教练/洞察独立 Tab，降低侧栏堆叠；无牌手时空态引导登录 |
| UX | role=tablist/tabpanel；洞察 ready 绿点；移动端 tab 条 sticky |
| 性能 | 未 mount 的 tab 用 hidden，内容仍 DOM（可后续 lazy） |
| 代码 | scrollToHandLogs 同步切 Tab；与 CoachDock/HandInsight 兼容 |

## 验证

- [x] `npm run lint && npm run build`
- [x] `sync-deploy-test.sh`

## 下一轮

Tick #3 · **perf** · **P1** 首页 live tables 短缓存
