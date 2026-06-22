# Phase 3 Loop · Pass 61（F16 注册/onboarding 进度条）

> Tick #61/100 · watcher nudge 触发 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/components/OnboardingStepIndicator.tsx` | 步骤 pill + 线性进度条；快速开赛 step 解析 |
| `src/components/OnboardingStepIndicator.module.css` | 进度条与步骤样式（含 reduced-motion） |
| `src/app/page.tsx` | 快速开赛 modal 3 步/2 步进度；登录注册 modal 复用组件 |
| `src/app/home.module.css` | 移除内联 auth step 样式 |

## 行为

- **游客快速开赛**：账号信息 → 打法风格 → 准备开赛（成功态满格）
- **已登录快速开赛**：打法风格 → 准备开赛
- 填写账号三字段后自动推进至第 2 步

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #62 · **ux** · U16（见 tracker ⬜）
