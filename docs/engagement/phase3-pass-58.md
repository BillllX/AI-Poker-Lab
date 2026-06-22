# Phase 3 Loop · Pass 58（U15 深色模式 contrast 审计）

> Tick #58/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/globals.css` | 新增 `--text-secondary` / `--text-tertiary`；`--muted` 对齐 AA |
| `src/components/BottomNav.module.css` | 未选中 tab 文案对比度提升 |
| `src/components/FormFieldMessage.module.css` | hint 改用 secondary 色 |
| `src/app/leaderboard/leaderboard.module.css` | 副文案 rgba → token |
| `src/app/home.module.css` | 登录/表单副文案对比度 |
| `src/app/me.module.css` | 训练面板副文案 |
| `src/app/table/table.module.css` | 观战 meta / 空态文案 |
| `src/app/tables/tables.module.css` | 大厅 loading 文案 |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #59 · **perf** · P15（见 tracker ⬜）
