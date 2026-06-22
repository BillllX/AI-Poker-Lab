# Phase 3 Loop · Pass 46（U12 登录/注册 modal 步骤指示）

> Tick #46/100 · Loop 恢复后连续执行 ✅

## 变更

| 文件 | 说明 |
|------|------|
| `src/app/page.tsx` | `AuthStepIndicator`：登录 1 步；注册 2 步（账号信息 → 保存凭证），注册成功自动高亮第 2 步 |
| `src/app/home.module.css` | 步骤 pill 样式（active / complete / touch ≥44px） |

## 验证

- `npm run lint && npm run build` ✅
- 测试环境 deploy ✅

## 下一轮

Tick #47 · **perf** · P12 prisma 查询 select 精简（tables list）
