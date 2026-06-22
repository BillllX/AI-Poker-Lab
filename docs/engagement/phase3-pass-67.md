# Phase 3 Loop · Pass 67（P17 service worker offline shell）

> Tick #67/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `public/sw-offline-shell.js` | 仅导航 offline fallback；不缓存 `/api/` |
| `public/offline-shell.html` | 双语离线提示 + 重试/首页/大厅链接 |
| `src/components/OfflineShellRegistration.tsx` | 生产环境注册 SW（`NEXT_PUBLIC_OFFLINE_SHELL_SW=0` 可关） |
| `src/app/layout.tsx` | 挂载注册组件 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #68 · **seo** · Wave 3 polish（见 tracker）
