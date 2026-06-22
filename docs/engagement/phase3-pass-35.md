# Phase 3 Loop · Pass 35（P9 音频 lazy load）

> Tick #35/100 · watcher nudge #31 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/audioManager.ts` | 解锁后仅预热 deal/check/win；其余首播再载；fallback `preload=none` |
| `src/lib/client/tableSoundEvents.ts` | 移除 mount 时全量 preload |

## 下一轮

Tick #36 · **seo** · S12 hreflang en + zh-Hans
