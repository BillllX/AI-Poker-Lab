# Phase 3 Loop · Pass 78（U20 真人桌 action bar sticky）

> Tick #78/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/human-table/page.tsx` | action dock 包在 sticky 容器；入座页加 seated 类 |
| `src/app/table/table.module.css` | `.humanTableStickyActionBar` 移动端贴底悬浮（BottomNav 上方） |

## 行为

- 移动端滚动牌桌时，**Fold/Call/Raise** 操作条保持 sticky
- 轮到你行动时边框高亮；背景 blur + 阴影增强可读性
- Stats / Leave 等次要控件仍在 stack 内正常滚动

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #79 · **perf** · Wave 3 polish
