# Phase 3 Loop · Pass 59（P15 图片 sizes 属性补全）

> Tick #59/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/imageSizes.ts` | 统一 hero / showcase / journey / casino `sizes` 常量 |
| `src/app/page.tsx` | hero + player-card 改用 `next/image` + `sizes` |
| `src/components/HeroLcpPreload.tsx` | preload 增加 `imageSizes` |
| `src/lib/homeHeroLcp.ts` | 导出 `HOME_HERO_LCP_WEBP_PATH` |
| `src/app/casino-org/page.tsx` | 复用 `imageSizes.casinoPhone` |
| `src/app/journey/content.html` | 7 张 pixel-art 补 `sizes` |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #60 · **seo** · Wave 3 polish（见 tracker）
