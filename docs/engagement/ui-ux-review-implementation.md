# UI/UX 实现质量审查（Spectator + CoachDock + Sounds + i18n + basePath）

> 审查范围：`src/app/tables/[tableId]/page.tsx`、`src/components/CoachDock.tsx`、`src/lib/client/tableSoundEvents.ts`、`src/app/page.tsx`、`docs/engagement/loop-pass-maint-11.md`  
> 审查目标：可访问性、空态/错误态/加载态、文案与 i18n 一致性、移动端与生产 basePath 风险、修复优先级

---

## 1) 可访问性（aria / focus / live regions）

### 1.1 现状亮点

- 主页两个弹窗（快速开赛、登录注册）使用了 `role="dialog"` 与 `aria-modal="true"`，并配置了 `aria-labelledby`，语义基础到位。
- 牌桌赢家浮层使用了 `aria-live="polite"`，可让读屏用户感知关键结果更新。
- 复制按钮、关闭按钮等关键交互有 `aria-label`，基础可读性不错。

### 1.2 问题与风险

1. **弹窗焦点管理不完整（高优先）**
   - 当前只实现了蒙层点击关闭与内容区 `stopPropagation`，但未看到：
     - 打开弹窗后焦点自动落到弹窗首个可交互元素；
     - `Tab` 键焦点陷阱（focus trap）；
     - `Esc` 关闭；
     - 关闭后焦点回到触发按钮。
   - 影响：键盘用户与读屏用户可能“跳出弹窗”到背景页面，造成操作迷失。

2. **动态状态文本缺少状态播报语义（高优先）**
   - `controlStatus`、`registrationError`、`nameStatus`、`CoachDock status` 多为普通 `<p>`，未统一使用 `role="status"` / `aria-live` / `role="alert"`。
   - 影响：提交成功/失败、上桌失败等关键反馈可能不被辅助技术及时播报。

3. **空态卡位与牌桌动态变化缺少结构化语义（中优先）**
   - 座位、行动日志、筹码变化主要是视觉容器，读屏时缺少列表/表格语义与更明确标签（如当前行动玩家、本手阶段变化）。
   - 影响：信息密集场景可视可用，但非视觉用户理解成本高。

4. **图像替代文本不足（中优先）**
   - 首页展示图使用 `alt=""`，若仅装饰可接受；但该图在语义上承载“AI Player Card”说明，建议补有意义的替代文本或明确装饰性策略文档化。

---

## 2) 错误态 / 空态 / 加载态审计

### 2.1 观战页（`/tables/[tableId]`）

- **已覆盖**
  - 无动作日志：`noActions`
  - 空座位：`emptySeat` + `waitingAssign`
  - 未登录看“我的牌手”：`loadingLogin` / `loginToView`
  - join/leave 失败文案有兜底
  - 首手前公共牌空态：`preparingHand` / `waitingCommunity`
  - 与 `loop-pass-maint-11.md` 一致的部分：无 live 内容时已有基础空态处理

- **缺口**
  1. **SSE 断连体验不足（高）**
     - `EventSource.onerror` 仅静默回落到拉取 state，没有显式“连接波动/重连中”提示。
  2. **“我的牌手在别桌”分支缺失（高）**
     - 目前逻辑仅判定“本桌有无我的牌手 + 桌是否满员”，未给出“你在其他桌”的明确提示与跳转，和 `loop-pass-maint-11.md` 建议存在差距。
  3. **Coaching 历史为空无显式文案（中）**
     - `history.length === 0` 直接不渲染历史区，用户不知道是“暂无记录”还是“加载失败”。
  4. **操作失败粒度较粗（中）**
     - `joinTableFailed`、`coachingFailed` 等是单一兜底，缺少按错误类型细分（权限/不在桌/桌满/网络）的可行动反馈。

### 2.2 首页（`/`）

- **已覆盖**
  - live 桌为空：`noLiveTables`
  - 榜单为空：`emptyLeaderboard`
  - 快速开赛失败提示：`quickPlayFailed` + `registrationError`
  - 快速开赛忙态按钮文案：`quickPlayStarting`

- **缺口**
  1. **初始化加载缺乏 skeleton/明确 busy 区分（中）**
     - `refreshCaptcha`/`refreshMe`/`refreshLeaderboard` 初次加载时页面直接展示空态文案，和“真实空数据”视觉上不易区分。
  2. **弹窗关闭策略可能误触（中）**
     - `onMouseDown` 点击蒙层即关闭，若用户误触外部区域，填写内容可能丢失；缺少二次确认或最小保护。

---

## 3) i18n / 文案一致性（zh / en）

### 3.1 明显不一致

1. **中文词条夹杂英文（高）**
   - 牌桌页中文 `seats`、`Leave`、`WIN` 未本地化。
   - 中文 UI 中 `BOT`、`Coaching`、`Prompt`、`Researcher Mode` 等保留英文较多，存在“品牌词/术语”与“可翻译文案”混用未分层问题。

2. **中英语义不完全对齐（中）**
   - 例如 `coachingRecent`：zh 为“最近 3 条 Coaching”，en 为“Recent coaching”，粒度不同。
   - 部分文案 zh 更偏运营表达，en 更偏功能表达；同一位置跨语言“承诺级别”不同。

3. **动态文案格式不统一（中）**
   - 时间、手数、盈亏表达在不同模块中标点与单位样式不一致（如 `hand #`、`+数字`、`pts` 与中文单位混用）。

### 3.2 CoachDock 特有问题

- 历史文案清洗逻辑硬编码中文前缀：
  - `note.message.replace(/^用户下一手起生效的 Coaching：/, "")`
- 风险：英文环境下无法正确去前缀；后端文案一改即失效。属于“数据展示依赖自然语言模板”的脆弱实现。

---

## 4) 移动端 + basePath 生产风险

### 4.1 移动端风险

1. **观战页信息密度极高（中）**
   - 单屏包含座位环、日志、筹码榜、我的牌手、Coaching，若无显式分段折叠与可读性优化，小屏易出现滚动疲劳与可点目标拥挤。
2. **赢家浮层 + 声音双提醒可能造成干扰（中）**
   - 3 秒赢家浮层叠加动作音效对移动端连续观战有认知负担，建议允许更细粒度静音或减弱动画/播报频率。

### 4.2 basePath 风险（生产挂载 `/aipokerclub`）

1. **链接路径未统一 `withBasePath`（高）**
   - 审查文件中大量 `Link href="/..."` 与 `router.push("/...")` 直写绝对路径（例如主页与牌桌页的 `/tables`、`/agents/...`）。
   - 若 Next `basePath` 配置与运行时环境不一致、或部分 URL 来自运行时拼接，会出现跳转到站点根路径的风险。

2. **静态资源路径直写（中）**
   - `Image src="/images/landing/..."` 依赖框架层自动处理；在非标准代理或兼容路径下可能暴露边缘问题。

3. **后端返回 URL 与前端 fallback 混用（中）**
   - `router.push(payload.tableUrl ?? (payload.tableId ? "/tables/..." : "/tables"))` 逻辑中存在“后端已给完整 URL”和“前端拼接 fallback”两套来源，建议统一策略避免环境差异导致跳转不一致。

---

## 5) 修复优先级清单（含工作量）

> 评估口径：S=0.5~1 天，M=1~3 天，L=3+ 天（含联调/回归）

1. **P0：补齐弹窗可访问性焦点系统（Effort: M）**
   - 范围：主页两个弹窗（快速开赛、登录注册）
   - 内容：初始焦点、focus trap、Esc 关闭、关闭后焦点归位、背景可交互禁用
   - 价值：显著降低键盘与读屏用户操作失败率

2. **P0：统一状态播报语义（Effort: S）**
   - 范围：`registrationError`、`controlStatus`、`nameStatus`、CoachDock 提交反馈
   - 内容：成功消息走 `role="status" aria-live="polite"`，错误走 `role="alert"`；确保提交后可被读屏读出
   - 价值：关键反馈可达性与可理解性提升

3. **P1：补“我的牌手在别桌”状态与跳转 CTA（Effort: M）**
   - 范围：观战页 my player 模块
   - 内容：展示所在桌名/ID，提供“前往该桌”链接
   - 价值：直接对应 `loop-pass-maint-11.md`，减少用户困惑

4. **P1：清理 zh/en 文案混杂与术语策略（Effort: M）**
   - 范围：`/tables/[tableId]` 与 `/`
   - 内容：先修明显未翻译项（`seats`、`Leave`、`WIN`），再定义“保留英文术语白名单”（如 BOT/Prompt 是否保留）
   - 价值：语言一致性提升，减少“半中半英”割裂感

5. **P1：CoachDock 历史文案去模板化（Effort: M）**
   - 范围：`CoachDock` + 对应 API 返回结构
   - 内容：用结构化字段（`displayMessage`/`sourceType`）替代对中文前缀的字符串替换
   - 价值：i18n 稳定性与后续维护性提升

6. **P1：basePath 链接策略统一（Effort: M）**
   - 范围：主页/观战页所有导航与路由跳转
   - 内容：统一使用项目约定（`withBasePath` / 可封装 `linkWithBasePath`）并补回归清单
   - 价值：降低生产子路径部署回归风险

7. **P2：SSE 连接状态可视化（Effort: S）**
   - 范围：观战页实时状态条
   - 内容：增加“实时连接中/重连中/已回退轮询”指示
   - 价值：提升系统可预期性，降低误判“卡住”的焦虑

8. **P2：空态分层与加载态区分（Effort: S）**
   - 范围：首页榜单与 live 桌块、CoachDock 历史区
   - 内容：区分首次加载 skeleton、无数据 empty、请求失败 error 三态
   - 价值：减少空态误解，改善首屏感知质量

---

## 总结

当前实现已经具备较完整的核心交互与基础空态，但在**可访问性细节（尤其焦点与状态播报）**、**中英文一致性**、以及**basePath 路由统一性**上仍有明显提升空间。  
建议按 P0/P1 先做“可达性 + 文案一致 + 路径安全”三项，再补体验细化（连接状态、加载分层）。

