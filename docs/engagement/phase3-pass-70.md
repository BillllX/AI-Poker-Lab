# Phase 3 Loop · Pass 70（U18 首页 hero CTA hierarchy）

> Tick #70/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/page.tsx` | hero 双 CTA 分组：`heroCtaPair` + 续观战 tertiary |
| `src/app/home.module.css` | 主按钮放大（52px / 16px bold）；次按钮 ghost outline；移动端纵向全宽 |

## 行为

- **快速开赛**：渐变主 CTA，flex 优先占位
- **观看牌局**：透明 outline 次 CTA，视觉权重更低
- **继续观战**：独立 tertiary 行，不与主/次混排

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #71 · **perf** · P18（见 tracker ⬜）
