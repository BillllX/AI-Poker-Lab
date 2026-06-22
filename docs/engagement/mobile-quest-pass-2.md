# Mobile Quest Loop · Pass 2（M2）

> Tick 2/40 · pillar=quest-product · ActivityStrip 移动端单行紧凑 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/ActivityStrip.module.css` | ≤640px 单行：`nowrap`、文案 ellipsis、操作按钮同行紧凑 |

## UX 要点

- 移动端不再把 CTA/关闭挤到第二行，与 Quest Hub 叠层时首屏更矮。
- 文案左对齐 + 单行截断；按钮 32px 紧凑但仍可点。

## 验证

- [x] lint/build
- [x] sync-deploy-test

## 下一轮

Pass 3 · **M3** OpsBanner 并入 Hub「公告」Tab 或首页可折叠
