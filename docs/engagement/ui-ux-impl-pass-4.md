# UI/UX 实现 Loop Pass #4/30

> Top10 **#8** · 弹窗 focus trap

## 实现

- 新增 `useModalFocusTrap` hook（`src/lib/client/useModalFocusTrap.ts`）
- 快速开赛 / 登录注册弹窗接入：
  - 打开时焦点落入首个可交互元素
  - `Tab` / `Shift+Tab` 循环焦点
  - `Esc` 关闭
  - 关闭后焦点归位
  - 打开时 `body` 禁止滚动

## 文件

- `src/lib/client/useModalFocusTrap.ts`
- `src/app/page.tsx`

## 验证

- `npm run lint && npm run build` ✓
