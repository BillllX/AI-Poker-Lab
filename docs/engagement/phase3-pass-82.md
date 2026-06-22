# Phase 3 Loop · Pass 82（UX Wave 3 polish）

> Tick #82/100 · watcher nudge 触发 ✅ · `polish:U17` + `polish:U10` + `polish:U20` + `polish:U19`

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/CoachDock.tsx` | `#coach-dock` 锚点自动展开并平滑滚动（respect reduced-motion） |
| `src/app/table/table.module.css` | Coach Dock `scroll-margin-top`；入座页底部留白适配 sticky action bar |
| `src/components/BottomNav.module.css` | 主导航项 `focus-visible` 焦点环增强 |
| `src/app/not-found.module.css` | 404 CTA hover / focus-visible 可见性 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #83 · **perf** · Wave 3 polish
