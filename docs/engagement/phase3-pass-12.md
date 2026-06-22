# Phase 3 Loop · Pass 12（S6 canonical + SITE_ORIGIN）

> Tick #12/100 · watcher nudge #8 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `docs/engagement/SEO_SITE_ORIGIN.md` | canonical / SITE_ORIGIN 约定 |
| `src/lib/server/pageMetadata.ts` | `buildPageMetadata()`  helper |
| `deploy/scripts/deploy-remote-test.sh` | 构建时注入 `NEXT_PUBLIC_SITE_ORIGIN` |
| `journey` / `casino-org` / `me/layout` | canonical + OG url |

## 下一轮

Tick #13 · **feature** · F4 每日签到
