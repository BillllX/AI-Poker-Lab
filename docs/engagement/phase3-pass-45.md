# Phase 3 Loop · Pass 45（F12 真人桌邀请链接 copy）

> Tick #45/100 · 用户恢复 Loop ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/human-table/page.tsx` | 邀请文案含牌桌名 + 密码提示 + URL；顶栏与等待面板「复制邀请链接」按钮；2s「已复制」反馈 |
| `src/lib/client/engagementAnalytics.ts` | 新增 `engagement.human_table.invite_copy` 事件 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #46 · **ux** · U12 登录/注册 modal 步骤指示
