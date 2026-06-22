# Phase 3 Loop · Pass 30（U8 焦点环 / reduced-motion）

> Tick #30/100 · watcher nudge #26 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/globals.css` | `--focus-ring-*` token + `:focus-visible`；全局 reduced-motion |
| `src/lib/client/motionPreference.ts` | `prefersReducedMotion()` helper |
| `src/app/leaderboard/page.tsx` | 复用 motion helper |
| `TableMomentOverlay` / `ReactionBar` CSS | 峰值动画 reduced-motion 分支 |

## 下一轮

Tick #31 · **perf** · P8（Wave 2 下一 perf ⬜）
