# Loop 运行配置 · Phase 4（移动端 UI + 任务系统）

| 项 | 值 |
|---|---|
| 阶段 | **Phase 4 — 移动端信息架构 · 任务目录 · 奖励闭环** |
| 节奏 | **完成即下一轮**（上一轮 lint/build/deploy 完成后 arm） |
| 模式 | **设计 + 写代码 + 标记已实现** — 禁止仅设计文档过关 |
| 最大次数 | **40** |
| Sentinel | `AGENT_LOOP_TICK_MOBILE_QUEST` |
| 结束标记 | `AGENT_LOOP_DONE_MOBILE_QUEST` |
| 状态文件 | [mobile-quest-loop-state.json](./mobile-quest-loop-state.json)（**`status: done`** · 2026-06-22） |
| Wave2 待办 | [mobile-quest-backlog-wave2.json](./mobile-quest-backlog-wave2.json) |
| Loop 库 | `deploy/scripts/mobile-quest-loop-lib.mjs` |
| Arm 脚本 | `bash deploy/scripts/mobile-quest-loop-arm-next.sh` |
| Watcher | `bash deploy/scripts/mobile-quest-loop-watcher.sh` |
| 测试环境 | https://aiagentswitcher.com/aipokerclubtest |
| 部署 | `deploy/scripts/sync-deploy-test.sh`（`SKIP_NPM_CI=1`） |

## 每轮完成契约（Agent 必须全部做完）

1. **写代码**：至少一处 `src/` 或 `prisma/` 变更（设计稿 alone 不算完成）
2. **验证**：`npm run lint && npm run build && SKIP_NPM_CI=1 bash deploy/scripts/sync-deploy-test.sh`
3. **Pass 文档**：`mobile-quest-pass-{N}.md` 含 frontmatter `implemented: true` + `codePaths`
4. **Backlog**：`mobile-quest-backlog-wave2.json` 对应项 `status: "implemented"`
5. **State**：`lastCompletedIteration=N`，`pendingIteration=N+1`
6. **Arm 下一轮**：`bash deploy/scripts/mobile-quest-loop-arm-next.sh`

Watcher **不再**仅凭 pass 文件存在就 silence——必须检测到 `implemented: true` 且 state 已推进，才会进入下一项 nudge。

## Tick 是什么？为什么 tick 了却没代码？

| 组件 | 做什么 | 不做什么 |
|------|--------|----------|
| **Watcher** | 每 N 秒检查 pending pass 是否 `implemented: true`；若否，向 stdout 打印 `AGENT_LOOP_TICK_MOBILE_QUEST` | **不会**自动改代码、不会调 LLM |
| **Arm 脚本** | 更新 state、生成下一轮 prompt | 同上 |
| **Cursor Agent** | 读 tick / 对话 → 写代码 → pass 标 implemented → deploy → arm | 需要**有 Agent 会话在跑** |

因此：**tick = 闹钟**，不是自动执行器。无人值守 = Watcher 反复响铃 + Agent（本对话或 Automation）接手写代码。

推荐：Cursor **Monitored Shell** 跑 watcher，匹配 `^AGENT_LOOP_TICK_MOBILE_QUEST` 唤醒 Agent；或保持本 chat 连续执行。

## Wave 1–4 Tracker

见 [mobile-quest-tracker.md](./mobile-quest-tracker.md)（已全部 ✅）

## Wave 2 Backlog（Pass 16+）

见 [mobile-quest-backlog-wave2.json](./mobile-quest-backlog-wave2.json) — **已全部 implemented**。

## Loop 已结束（2026-06-22）

Backlog 耗尽，28/40 轮提前收官。详见 [mobile-quest-loop-close.md](./mobile-quest-loop-close.md)。Watcher 在 `status: done` 时不再 nudge。

1. Pass 0 基线 + [MOBILE_QUEST_ROADMAP.md](./MOBILE_QUEST_ROADMAP.md)
2. 每轮按 backlog 下一项 `pending` 执行
3. Watcher 每 3–5 分钟 nudge，直到当前 pass **已实现**

## 每轮 Prompt（自动生成）

读 backlog 下一 `pending` → **必须写代码** → lint/build/deploy → pass 标 `implemented: true` → backlog 标 `implemented` → 更新 state → arm 下一轮。
