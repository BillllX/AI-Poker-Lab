# UI/UX Loop Pass #4/30 · 情绪 lens

> Tick #4 · 深化 Top10 **#5**：CoachDock 位置 + 生效反馈  
> 视角：gpt-5.5-medium

## 情绪问题

Coaching 是「教练在场」的核心参与动作。当前 [`tables/[tableId]/page.tsx`](../../src/app/tables/[tableId]/page.tsx) 侧栏顺序：

1. 我的牌手  
2. CoachDock  
3. 筹码变化  
4. 行动日志  

移动端侧栏在牌桌**下方**长滚动栈中，CoachDock 夹在中间：用户看完牌面 → 滚过筹码榜 → 才找到 Coaching。提交后仅一行 muted 文案「已从第 N 手生效」，**缺少「我的指令被听见」的 moment**。

## 情绪目标

| 时刻 | 用户应感到 |
|------|-----------|
| 发现 Coach | 「我可以在这里调教它」 |
| 提交后 | 「下一把它会听我的」 |
| 下一手 hero 行动 | 「它真的按我的建议在做」 |

## UX 方案

### A. 侧栏重排（P1 · M）

```
1. 我的牌手（含 lastReasoning）
2. CoachDock  ← 紧挨 identity
3. 行动日志
4. 筹码变化
```

筹码榜偏数据，日志偏叙事；Coach 应在「身份确认」之后、「看过程」之前。

### B. Sticky Coach 条（移动 · S）

`<760px`：`CoachDock` 折叠为底部 **sticky** 条：

- 收起：「给下一手建议 ▲」  
- 展开：textarea + 提交（与 #2 padding 联调）

### C. 生效反馈强化（S）

提交成功后：

1. 现有 `appliesFromHandId` 文案保留  
2. + **pill 挂到「我的牌手」面板**：「Coaching 待生效 · 手 #N」直到 `handId >= N`  
3. 可选：轻音效 `coachingSent`（复用 check.wav，volume 0.5）

下一手 hero 首次行动时清除 pill，Toast「你的 Coaching 已在本手生效」（链 pass-3 / P1-T004）。

## copy 增补

| key | zh |
|-----|-----|
| `coachingPending` | Coaching 将在第 {n} 手生效 |
| `coachingActive` | 本手已应用你的 Coaching |

## 验收（情绪）

- [ ] 新用户 30 秒内找到 Coach 输入框（无需滚过筹码榜）  
- [ ] 提交后 5 秒内能复述「从哪一手生效」  
- [ ] 与 `coaching_rate` 指标：Dock 曝光 → 提交转化

## 文件

- `tables/[tableId]/page.tsx` — 侧栏顺序、pending pill  
- `CoachDock.tsx` — sticky 模式、成功态  
- `table.module.css` — `.coachStickyBar`, `.coachingPendingBadge`

## 下一轮（Tick #5 · visual lens）

Top10 **#6**：首页 Top3 / activity / 双榜信息架构合并
