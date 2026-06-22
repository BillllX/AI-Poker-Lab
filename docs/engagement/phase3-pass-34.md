# Phase 3 Loop · Pass 34（U9 seat reduced-motion）

> Tick #34/100 · watcher nudge #30 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/table/table.module.css` | seat 过渡/thinking 脉冲/当前座 scale 的 reduced-motion 分支 |

## 行为

- `prefers-reduced-motion: reduce` 时取消 seat transform 过渡与 thinking 脉冲动画
- 当前行动座位保留边框高亮，不再 scale 放大

## 下一轮

Tick #35 · **perf** · P9 API 响应 gzip 或 payload trim
