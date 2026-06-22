# Phase 3 Loop · Pass 40（S13 noscript 关键内容 fallback）

> Tick #40/100 · watcher nudge #36 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/NoScriptFallback.tsx` | 根 layout `<noscript>`：站点定位 + 中英 copy + 主链导航 |
| `src/app/layout.tsx` | 注入 `NoScriptFallback` |
| `src/app/globals.css` | noscript 区块样式 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #41 · **feature** · F11 快速开赛成功 celebration 微动画
