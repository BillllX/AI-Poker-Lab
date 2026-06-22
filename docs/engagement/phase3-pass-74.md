# Phase 3 Loop · Pass 74（U19 404 品牌化）

> Tick #74/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/not-found.tsx` | 全站品牌化 404（中英 copy + 导航 CTA） |
| `src/app/not-found.module.css` | 俱乐部主题卡片样式 |

## 行为

- 404 页显示扑克主题文案与 **首页 / 竞技场 / 排行榜** 三个入口
- 跟随 `useLanguage` 切换中英文

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #75 · **perf** · Wave 3 polish
