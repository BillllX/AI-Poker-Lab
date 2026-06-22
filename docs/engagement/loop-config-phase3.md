# Loop 运行配置 · Phase 3（四线并进）

| 项 | 值 |
|---|---|
| 阶段 | **Phase 3 — 功能/运营 · UI/UX · 性能 · SEO** |
| 节奏 | **完成即下一轮**（无固定间隔；上一轮 lint/build/deploy 完成后立即 arm） |
| 模式 | **必须写代码** — 每轮至少一处 `src/` 或 `prisma/` 变更，禁止仅文档 |
| 最大次数 | **100** |
| Sentinel | `AGENT_LOOP_TICK_PHASE3` |
| 结束标记 | `AGENT_LOOP_DONE_PHASE3` |
| 状态文件 | [phase3-loop-state.json](./phase3-loop-state.json) |
| Arm 脚本 | `bash deploy/scripts/phase3-loop-arm-next.sh` |
| 测试环境 | https://aiagentswitcher.com/aipokerclubtest |
| 部署 | `deploy/scripts/sync-deploy-test.sh`（`SKIP_NPM_CI=1`） |

## 调度方式

1. Pass 0（Kickoff）手动完成 SEO 基线。
2. 每轮结束时 Agent：
   - 写 `phase3-pass-{N}.md`，tracker 标 ✅
   - 更新 `phase3-loop-state.json` 的 `lastCompletedIteration`
   - **同一会话内立即开始 Pass N+1**（不要等用户说话）
   - 并执行 `bash deploy/scripts/phase3-loop-arm-next.sh`（供会话断开后的唤醒）
3. **Watcher**（后台）：`bash deploy/scripts/phase3-loop-watcher.sh` — 若 `phase3-pass-{pending}.md` 缺失，每 3 分钟重发 tick（Cursor 通知唤醒 Agent）。
4. 100 轮完成后输出 `AGENT_LOOP_DONE_PHASE3`。

## 为什么没有「全自动」？

Loop 是 **两层机制**，脚本本身不会写代码：

| 层 | 做什么 | 不会做什么 |
|----|--------|------------|
| Shell | 输出 `AGENT_LOOP_TICK_PHASE3` 唤醒信号 | 不能代替 Agent 改代码 |
| Cursor Agent | 读 tracker → 实现 → lint/build → deploy | 会话关闭时不会自己运行 |

因此：**同一会话内必须链式执行**；会话离线时靠 **watcher 重复 tick + 你打开 Agent 聊天** 才能续跑。若要完全无人值守，需另配 [Cursor Automation](https://cursor.com/docs) 或 Cursor SDK。

## 启动 watcher（推荐常开）

```bash
bash deploy/scripts/phase3-loop-watcher.sh
# 在 Cursor 里用 monitored shell + notify_on_output 跑，匹配 ^AGENT_LOOP_TICK_PHASE3
```

## 四线 Backlog

见 [phase3-tracker.md](./phase3-tracker.md)（Wave 1 + Wave 2，共 100 项容量）

## 每轮模型分工（审核 → 实现 → 测试）

| 角色 | 模型 | 职责 |
|------|------|------|
| 产品/运营 | **gpt-5.5-medium** | 需求合理性、参与感、可运营性 |
| UI/UX | **composer-2.5-fast** | 交互、视觉、移动端、a11y |
| 性能 | **gpt-5.3-codex** | 方案风险、指标、回归点 |
| 代码 | **composer-2.5-fast**（实现）+ **gpt-5.3-codex**（审查） | lint/build + 可选 Task 子代理 |

每轮写入 `phase3-pass-{N}.md`，含四角色审核摘要。

## 每轮 Prompt

Texas Poker Phase 3 Loop {N}/100：**必须写代码**实现 tracker 中该 pillar 下一 ⬜ 项；四模型审核；lint/build；sync-deploy-test；更新 tracker + `phase3-pass-{N}.md`；**最后 `phase3-loop-arm-next.sh`**。

## 追踪

- [phase3-tracker.md](./phase3-tracker.md)
- [phase3-synthesis.md](./phase3-synthesis.md)
- Pass 日志：`phase3-pass-0.md` … `phase3-pass-100.md`

## 归档

- Phase 2b UI/UX 实现：✅ 30/30 · [ui-ux-impl-tracker.md](./ui-ux-impl-tracker.md)
