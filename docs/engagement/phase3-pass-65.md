# Phase 3 Loop · Pass 65（F17 多语言运营 copy 切换）

> Tick #65/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/lib/client/localizedCopy.ts` | `OPERATIONAL_COPY` 双语 key 注册表 + `pickOperationalCopy` |
| `src/lib/client/opsBanner.ts` | 默认 banner 走 copy key；`resolveOpsBannerMessage` |
| `src/lib/client/activityStrip.ts` | 活动条同上 |
| `src/components/LanguageToggle.tsx` | 全站 EN / 中文切换（localStorage + `?lang=`） |
| `src/components/OpsBanner.tsx` / `ActivityStrip.tsx` | 接入 keyed copy |
| `src/app/layout.tsx` | 页脚语言切换 |
| `src/components/MobileTopNav.tsx` | 顶栏语言切换（无快捷 action 时） |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #66 · **ux** · U17（见 tracker ⬜）
