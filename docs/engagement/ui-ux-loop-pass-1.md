# UI/UX Loop Pass #1/30 · 情绪 lens

> Tick #1 · 深化 Top10 **#2**：BottomNav padding 遮挡 Coaching  
> 视角：gpt-5.5-medium（情绪参与）

## 情绪问题

Coaching 是 AI 线核心参与动作（「教练在场」叙事）。当用户在关键手牌后想提交「下一手建议」时，若 **CoachDock 提交按钮被 BottomNav 挡住**，会产生：

- **挫败感**：「我输入了但点不到」→ 参与动机骤降  
- **叙事断裂**：首页 promise「给下一手 Coaching」，牌桌却无法完成  
- **与真人桌对比**：human-table 有 `actionDock` + 更大 `padding-bottom`，AI 观战侧栏反而更易被挡

这不是纯 CSS 问题，是 **参与度峰值 #4（Coach 介入）被物理 UI 掐断**。

## 用户场景

1. 我的牌手 river 大 pot 后用户打开侧栏写 Coaching  
2. 移动端键盘收起后点「提交 Coaching」  
3. 按钮在 BottomNav 下方 20–40px → 误触导航或点不到  
4. 用户放弃 Coaching → `coaching_rate` 指标受损

## 情绪向修复目标

| 目标 | 做法 |
|------|------|
| **提交必达** | 侧栏底部 `padding-bottom` ≥ BottomNav + safe-area + 16px 缓冲 |
| **Coach 可见** | 滚动时 CoachDock 提交区始终在可视区（sticky footer 于 sidePanel） |
| **成功反馈** | 提交后 `role="status"` 播报 + 轻 haptic 可选（P2） |

## 与视觉/实现文档交叉引用

- 具体 px 与文件：`ui-ux-review-visual.md` §1.3、`ui-ux-review-implementation.md` §4  
- 统一 token 建议：`--bottom-nav-clearance: calc(72px + env(safe-area-inset-bottom))`

## Wave A 验收（情绪）

- [ ] 320px 宽 iPhone SE：CoachDock 提交按钮完全可见且可点  
- [ ] 提交成功后 3 秒内用户能感知「已从第 N 手生效」（已有 copy，需不被遮挡）

## 附录：Kickoff 预写 #4 草案

赢家 overlay 后复盘空白 interim 方案见 git 历史或 Tick #4 轮（Top10 #5 时重写）。

## 下一轮（Tick #2 · visual lens）

Top10 **#3**：AI 桌 `mobileTableStatus` 移植
