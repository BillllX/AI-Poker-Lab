# Phase 3 Loop · Pass 19（P5 Hero LCP）

> Tick #19/100 · watcher nudge #15 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/homeHeroLcp.ts` | Hero WebP URL 常量 |
| `src/components/HeroLcpPreload.tsx` | `<link rel="preload">` high priority |
| `src/app/layout.tsx` | 全局注入 hero preload |
| `src/app/page.tsx` | Hero 改用 `<img fetchPriority="high">` |
| `home.module.css` | 背景图从 CSS 层拆到 LCP img |

## 下一轮

Tick #20 · **seo** · S8 FAQ schema
