# Mobile Quest Loop · Pass 5（M3）

> Tick 5/40 · pillar=mobile-ux · OpsBanner 并入 Hub 公告 Tab ✅

## 变更

| 文件 | 说明 |
|------|------|
| `opsBanner.ts` | `subscribeOpsBanner` + dismiss 事件 |
| `MobileQuestHub.tsx` | Sheet「任务 / 公告」双 Tab；公告内容 + 关闭 |
| `OpsBanner.module.css` / `home.module.css` | 移动端隐藏独立 OpsBanner / 签到条 |
| `MobileQuestHub.module.css` | Tab 与公告卡片样式；折叠条公告圆点 |

## 验证

- [x] lint/build
- [x] sync-deploy-test

## 下一轮

Pass 6 · **M4** 观战页 Coach safe-area
