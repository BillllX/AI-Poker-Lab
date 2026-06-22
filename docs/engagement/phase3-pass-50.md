# Phase 3 Loop · Pass 50（U13 观战页 pot 变化数字滚动）

> Tick #50/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/AnimatedPotValue.tsx` | 底池数字 ease 滚动 + 变化时 pulse；`prefers-reduced-motion` 直出数值 |
| `src/components/AnimatedPotValue.module.css` | tabular-nums 与 pulse 动画 |
| `src/app/tables/[tableId]/page.tsx` | 桌心 / 信息条 / 移动状态栏三处 pot 使用动画组件 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #51 · **perf** · P13 静态页 ISR revalidate
