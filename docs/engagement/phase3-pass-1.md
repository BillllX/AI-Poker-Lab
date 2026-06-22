# Phase 3 Loop · Pass 1（F1 运营 Banner）

> Tick #1/100 · pillar=**feature** · 代码实现 ✅

## 变更文件

| 文件 | 说明 |
|------|------|
| `src/lib/client/opsBanner.ts` | Banner 配置 + sessionStorage dismiss |
| `src/components/OpsBanner.tsx` | 首页运营条（en/zh、CTA、关闭） |
| `src/components/OpsBanner.module.css` | 样式 |
| `src/app/page.tsx` | 挂载 `<OpsBanner />` |
| `src/app/home.module.css` | `opsBannerSlot` 间距 |

## 四角色审核

| 角色 | 结论 |
|------|------|
| 产品 | Coach Dock 导向 copy，可运营；`NEXT_PUBLIC_OPS_BANNER` / `off` 可后续接 |
| UX | dismiss ≥44px；region + aria；移动端 actions 换行 |
| 性能 | 无 extra fetch；sessionStorage 首屏 SSR 不闪（useSyncExternalStore） |
| 代码 | 与 i18n / basePath Link 一致 |

## 验证

- [x] `npm run lint && npm run build`
- [x] `sync-deploy-test.sh`

## 下一轮

Tick #2 · **ux** · **U1** 观战侧栏 Tab
