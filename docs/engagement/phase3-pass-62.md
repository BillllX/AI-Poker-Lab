# Phase 3 Loop · Pass 62（U16 表格/列表 zebra stripe token）

> Tick #62/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/globals.css` | 新增 `--list-row-surface` / `--list-row-surface-alt` / `--list-row-border` |
| `src/app/leaderboard/leaderboard.module.css` | 排行榜行 zebra； podium / 动画行除外 |
| `src/app/home.module.css` | 首页 mini 排行榜 zebra；冠亚季军行保留高亮 |
| `src/app/table/table.module.css` | 观战行动日志 + 手牌复盘列表 zebra |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #63 · **perf** · P16（见 tracker ⬜）
