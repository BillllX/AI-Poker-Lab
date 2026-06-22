# Phase 3 Loop · Pass 38（U10 BottomNav active 指示器统一）

> Tick #38/100 · watcher nudge #34 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/BottomNav.tsx` | 统一 `navItem` + `data-active` / `aria-current`；登录页高亮 profile 项 |
| `src/components/BottomNav.module.css` | 顶部 accent 条指示当前页；hover 与 active 视觉分离 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #39 · **perf** · P10 React.memo 热点 seat 组件
