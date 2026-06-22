# UI/UX Loop Pass #3/30 · 实现 lens

> Tick #3 · 深化 Top10 **#4**：handReview 闭环（实现向）  
> 视角：gpt-5.3-codex（a11y / 状态 / 可落地）

## 问题

赢家 `winnerOverlay`（`aria-live="polite"`）3 秒后卸载，无持久复盘 UI。`loop-pass-maint-1` interim 方案需 **实现清单**。

## Interim 实现（Wave A · 不依赖 P1 ring buffer）

### 1. Overlay 扩展 — `tables/[tableId]/page.tsx`

```tsx
// winnerCard 内 winners 列表下方
<button type="button" className={styles.winnerLogJump} onClick={scrollToHandLogs}>
  {t.viewHandLog}
</button>
```

```typescript
function scrollToHandLogs() {
  document.getElementById("hand-action-logs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  setWinnerReveal(undefined); // 可选：关闭 overlay
}
```

### 2. 日志区 — id + 本手高亮

```tsx
<section className={styles.panel} id="hand-action-logs">
  ...
  className={`${styles.logItem} ${log.handId === state?.handId ? styles.logItemCurrentHand : ""} ...`}
```

需在 `ActionLog` 类型或 log 解析中关联 `handId`（若 `log.message` 无 handId，用 `actionHistory` 过滤本手）。

**简化**：overlay 关闭后高亮 **最近 N 条 log**（本手 actions 已在 `actionHistory` 有 handId）。

### 3. a11y

- 按钮：`aria-describedby` 指向赢家列表  
- 跳转后：`logList` 容器 `tabIndex={-1}` + focus 便于读屏  
- 新增 copy：`viewHandLog` zh/en

### 4. i18n 键

| key | zh | en |
|-----|----|----|
| `viewHandLog` | 查看本手日志 | View this hand's log |

## 与 P1 路径关系

| 阶段 | 交付 |
|------|------|
| Interim（本 pass） | overlay CTA + log 高亮 |
| P1 PR-1 | `handSummaries` + `HandReviewList` 替换 log 跳转 |

Interim **不阻塞** PR-1；PR-1 上线后可隐藏 CTA 或改为「查看复盘」。

## 文件清单

| 文件 | 变更 |
|------|------|
| `tables/[tableId]/page.tsx` | CTA、scroll、log class |
| `table.module.css` | `.winnerLogJump`, `.logItemCurrentHand` |
| `types.ts` | 若 log 缺 handId，从 actionHistory 派生 helper |

## 工作量 · 风险

| 项 | 值 |
|----|-----|
| 工作量 | **S**（~2h） |
| 风险 | log 与 handId 对齐需验证 SSE  payload |
| 测试 | 手动：赢牌 → 点 CTA → 侧栏高亮 |

## 下一轮（Tick #4 · emotion lens）

Top10 **#5**：CoachDock 侧栏顺序 + sticky + 生效反馈强化
