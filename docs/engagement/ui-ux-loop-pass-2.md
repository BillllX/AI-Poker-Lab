# UI/UX Loop Pass #2/30 · 视觉 lens

> Tick #2 · 深化 Top10 **#3**：AI 桌移植 `mobileTableStatus`  
> 视角：composer-2.5-fast（布局 / 移动 IA）

## 问题

`@media (max-width: 760px)` 下 `.subtitle` 被隐藏，AI 观战页 [`tables/[tableId]/page.tsx`](../../src/app/tables/[tableId]/page.tsx) **未渲染** `.mobileTableStatus`。真人桌 [`human-table/page.tsx`](../../src/app/human-table/page.tsx) L551–556 已有 pill 条。

结果：移动端用户失去 **手号 / 底池 / 当前行动者** 一览，只剩牌桌下方 `tableInfoBar`（小字、易被侧栏滚动淹没）。

## 规格（对齐 human-table）

在 `header` 内 `mobileHeaderMain` 结构下，`subtitle` 之后插入：

```tsx
<div className={styles.mobileTableStatus}>
  <span>{state?.running ? t.running : t.waitingStart}</span>
  <span>{t.hand} #{state?.handId ?? 0}</span>
  <span>{t.pot} {state?.pot ?? 0}</span>
  <span>{activePlayer ? `${activePlayer.name} ${t.thinking}` : t.spectatorMode}</span>
</div>
```

**AI 线差异**（第四 pill）：
- 有 `myPlayer` 且 `myPlayer.id === state.currentPlayerId` → `{myPlayer.name} · {t.thinking}` + accent class `.mobileStatusMine`
- 否则保持 `spectatorMode` 或 `{activePlayer.name} {t.thinking}`

## CSS（已有，无需新文件）

- 默认 `.mobileTableStatus { display: none }` — [`table.module.css`](../../src/app/table/table.module.css) L993
- `<760px` 显示 flex pills — L1623–1642
- 可选新增：

```css
.mobileStatusMine {
  border-color: rgba(34, 211, 238, 0.35);
  color: #67e8f9;
}
```

## 结构改动

| 文件 | 改动 |
|------|------|
| `tables/[tableId]/page.tsx` | header 包一层 `mobileHeaderMain`（与 human-table 一致） |
| `table.module.css` | 可选 `.mobileStatusMine` |

## 视觉验收

- [ ] 375px 宽：subtitle 隐藏后，4 pills 换行可读  
- [ ] 与 `tableInfoBar` 信息不重复过多（可保留 bar 作牌桌内嵌，pills 作 header 锚点）  
- [ ] 我的牌手思考时第四 pill 高亮

## 工作量

**S** — 约 30 行 JSX，CSS 复用现有。

## 下一轮（Tick #3 · implementation lens）

Top10 **#4**：handReview 闭环 — 实现向 interim overlay CTA spec
