# Texas Poker Club UI/UX 情绪价值评审

> 范围：基于当前真实代码与 CSS，而非仅基于设计文档。重点阅读 `src/app/page.tsx`、`src/app/home.module.css`、`src/app/tables/[tableId]/page.tsx`、`src/app/table/table.module.css`、`src/components/CoachDock.tsx`、`src/app/me/page.tsx`、`src/app/human-table/page.tsx`、`docs/engagement/loop-pass-maint-8.md`。

## 结论

当前 UI 已经从“技术接入工具”推进到“AI 牌手俱乐部”：首页有快速开赛、Top 3、每日奖励榜；牌桌有赢家浮层、座位高亮、最近 reasoning、CoachDock；我的牌手页有训练房、风格 Prompt、战绩沉淀。最主要的问题不是视觉不够，而是情绪闭环还断在几个关键节点：用户创建 AI 后缺少明确的“我拥有一名牌手”的确认，观战时缺少“这一手为什么值得看”的叙事，赢家高光之后缺少复盘和下一步训练 CTA。

优先级上，P0 应先补“首屏价值说明实际未渲染”“AI 牌桌缺少手牌复盘闭环”“Coach 生效范围和反馈不够强”三个断点；P1 再做 Toast、Reaction、Coach Card、底部练习入口等增强。

## 1. 当前 UI 的情绪旅程缺口

### 新用户首页：承诺很强，但首屏解释缺席

`src/app/page.tsx` 的 copy 已经把产品定位写清楚：`heroSubtitle` 说明“你只负责设定风格、观战、复盘和冲榜”，`heroSignals` 说明“无需充值、云端自动入桌、实时观战、冲击排行榜”。但当前 JSX 的 hero 只渲染了标题和两个 CTA，未渲染 `heroSubtitle` 与 `heroSignals`；`src/app/home.module.css` 也保留了 `.subtitle`、`.heroSignals` 的样式。结果是首屏视觉很有气势，但用户第一眼只看到“训练你的 AI Poker，成为世界第一”和“快速开赛”，还没被明确告知自己不是来手动打牌，而是来训练、观战、复盘一个 AI 牌手。

情绪影响：用户的第一步动机从“我在创建自己的 AI 竞争者”变成“这是个扑克按钮/游戏入口”。对非技术用户尤其容易丢失参与身份。

### Quick Play：转化路径短，但拥有感不足

快速开赛流程有昵称、邮箱、密码、打法风格三选一，并会调用 `/api/users/quick-play` 后跳转牌桌。这个路径很好，降低了接入门槛。但点击风格后立即开赛，界面只用 busy 文案“正在创建 AI 牌手并进入牌桌...”，缺少一个短暂的身份确认，例如“稳健型 Bill 已入池”“下一手会按这个风格决策”。`src/app/page.tsx` 的 `renderQuickPlayStylePicker()` 也没有展示选择后的二次确认或牌手卡预览。

情绪影响：用户完成了一个重要创造行为，但系统没有把它包装成“你的 AI 出生了”。这是参与感的第一处损失。

### 我的牌手页：养成感扎实，但和牌桌回路没有完全打通

`src/app/me/page.tsx` 做得最好的是把用户身份对象化：`playerHero`、头像 Orb、积分、排名、今日收益、手数、胜率、训练风格编辑、最近比赛、云端牌手状态都在同一页。它让用户感觉自己拥有一个持续成长的 AI Player。

缺口在于：我的牌手页是“长期养成房”，牌桌页是“实时观战场”，两者之间的情绪链路还偏弱。牌桌上的 CoachDock 提交成功后，只显示“已从第 X 手起生效”，没有回写到我的牌手页的“打法风格训练”叙事中；我的牌手页的最近比赛也只显示结算结果，无法对应某一条 Coach 是否改善了之后的手牌表现。

情绪影响：用户能编辑 Prompt，也能观战，但还不够确信“我的干预真的改变了它”。

### AI 牌桌：实时感强，回味感弱

`src/app/tables/[tableId]/page.tsx` 的牌桌状态很完整：公共牌、底池、当前行动者、座位状态、位置、筹码、盈亏、暗牌背面、赢家高亮、我的牌手面板、最近 reasoning、行动日志。`src/app/table/table.module.css` 对 `currentSeat`、`winningSeat`、`winBadge`、`winnerOverlay`、`winnerCard` 做了明显的峰值视觉。

但 AI 牌桌目前没有像 `src/app/human-table/page.tsx` 那样的 `handReview`/`handSummaryList`。AI 牌桌只有最近 actions 和 chip board，赢牌后的 overlay 3 秒消失后，用户没有一个可停留的复盘卡片来回答：“这手为什么赢/输？我的 AI 这手表现如何？下一手要怎么 coach？”

情绪影响：实时刺激存在，但沉淀不足。用户看到 WIN，但很快回到普通日志流，难以形成可分享、可复盘、可学习的记忆点。

### 旁观者：能看牌局，但缺少“为什么我应该关心”

未登录或非本桌用户进入 `src/app/tables/[tableId]/page.tsx` 时，本质是 spectator。界面展示桌面和日志，但侧边 My Player 面板只提示登录后查看或可上桌时展示 join。它没有单独的 spectator narrative：例如“正在观察 X 的激进实验”“这手最大底池”“当前领先者”“关注这名 AI”。首页虽然承诺“你不是下注玩家，而是训练 AI 的实验员”，但牌桌页没有持续强化这个身份。

情绪影响：旁观者容易变成被动看数据，而不是“围观一场 AI 竞技”。这会压低停留和二次参与。

### 真人牌桌：操作参与强，反而更完整

`src/app/human-table/page.tsx` 的真人桌已经有更完整的参与闭环：我的回合倒计时、合法动作、下注金额选择、赢家浮层延迟展示、胜利原因、最近复盘、最终统计、邀请链接、等待下一手提示。它更像完整游戏体验。

这对 AI 俱乐部是一个对照：真人桌的“我行动 -> 结果 -> 复盘”闭环更强；AI 桌的核心应该是“我训练 -> AI 行动 -> 结果 -> 复盘 -> 再训练”，但目前少了复盘和再训练的桥。

## 2. 有效峰值 vs 偏平时刻

### 已经有效的峰值

- 首页 Top 3 和每日奖励榜有效。`src/app/page.tsx` 直接在 hero 后展示前三名和积分，`src/app/home.module.css` 对冠军/亚军/季军做了徽章和高亮。它能快速建立“我要追谁”的目标感。
- 牌桌当前行动者高亮有效。`currentSeat` 的发光与缩放让用户知道现在轮到谁，这对实时观战很关键。
- 赢家浮层有效。`winnerOverlay`、`winnerCard`、`trophyBounce`、`winnerPop` 把一手结束做成了明显仪式，情绪峰值足够清楚。
- 我的牌手面板有效。`myPlayerPanel`、`myPlayerSummary`、`reasoningBlock` 把“这是我的 AI”从全局牌桌里提出来，避免用户在 6 人桌里找不到自己。
- CoachDock 方向正确。`src/components/CoachDock.tsx` 的“下一手 Coaching”、状态反馈和最近 3 条历史，已经把用户从旁观者拉回训练者。
- 真人桌 hand review 是好的参考实现。`src/app/human-table/page.tsx` 的 `handSummaryList`、赢家原因、每名玩家净变化，比 AI 桌更接近可回味峰值。

### 目前偏平的时刻

- 首页首屏文案峰值被削弱。强 copy 存在但未渲染，导致用户没有在第一屏理解“AI 牌手养成”的完整承诺。
- 创建成功偏平。Quick Play 完成后直接跳转，缺少“牌手诞生/入池/已选择风格”的微仪式。
- AI 赢家之后偏平。overlay 消失后只剩行动日志，缺少“本手卡片”和“下一手建议”入口。
- Coach 提交偏平。`CoachDock` 成功文案只说从第几手生效，没有解释将如何影响 AI，也没有在下一手开始时让用户看到“刚才的 Coaching 已被使用”。
- Spectator 偏平。非拥有者只看到桌面，没有“关注对象”“精彩点”“参与下一步”的引导。
- 移动端部分情绪信息被隐藏。`src/app/table/table.module.css` 在移动端隐藏 `chipDelta`、座位 reasoning snippet、后续日志，只保留紧凑牌桌。这对可用性合理，但会削弱“我看到 AI 表现变化”的反馈，需要用更集中的移动端 bottom summary 补回。

## 3. Coach / Spectator 叙事一致性

当前叙事主线是清楚的：用户不是手动代打，而是定义风格、观察、给下一手 Coaching、复盘排名。首页、我的牌手页、牌桌页都有这条线索：

- `src/app/page.tsx`：`DEFINE / OBSERVE / COACH / REWARD` 的 copy 和快速风格选择。
- `src/app/me/page.tsx`：训练风格 Prompt 进入云端 AI 决策上下文。
- `src/app/tables/[tableId]/page.tsx`：最近 reasoning、下一手 Coaching、我的牌手状态。
- `src/components/CoachDock.tsx`：提交 runtime instruction，显示最近 3 条 Coaching。

主要不一致在三个地方：

- Coach 的层级不够清楚。首页 Quick Play 风格、我的牌手 Prompt、牌桌 CoachDock 都会影响 AI，但 UI 没有区分“长期打法风格”和“下一手短期建议”。用户可能不知道应该在哪里改长期策略，在哪里写临场建议。
- Spectator 和 Coach 身份断开。拥有者看到 CoachDock，旁观者只看到登录/上桌提示。若产品希望旁观也能转化，应让 spectator 看到“登录后可训练自己的 AI，或关注此桌玩家”的明确桥接。
- AI 桌和真人桌体验语言混杂。AI 桌强调“托管 Agent/本地 Agent/Coaching”，真人桌强调“我的操作/倒计时/合法动作”。这本身合理，但两者共用 `table.module.css`，视觉上非常接近；需要在文案和页面标题上更明确区分“AI 实验赛场”和“真人牌桌”，避免用户误以为 AI 桌也应该手动操作。

## 4. P0 / P1 优先修复建议

### P0-1：恢复首页首屏价值说明

文件：`src/app/page.tsx`、`src/app/home.module.css`

建议：在 hero 标题下实际渲染 `t.heroSubtitle` 和 `t.heroSignals`，复用已有 `.subtitle`、`.heroSignals` 样式。首屏需要明确告诉用户：不用充值、不用手动打、创建云端 AI、观战和冲榜。

原因：这是用户进入情绪旅程的第一秒。如果只剩大标题和 CTA，会让“AI 养成俱乐部”退化成普通游戏入口。

### P0-2：给 Quick Play 增加“牌手诞生”反馈

文件：`src/app/page.tsx`、`src/app/home.module.css`

建议：选择风格后，在跳转前或 modal 内展示一个短状态：“已保存稳健型风格”“正在创建你的云端 AI 牌手”“下一手起按此风格决策”。如果接口跳转太快，可以把 busy 文案改得更具人格化。

原因：用户刚完成创造行为，需要获得拥有感。这个节点决定他是否愿意把后续输赢看成“我的 AI 的表现”。

### P0-3：AI 牌桌补手牌复盘卡片

文件：`src/app/tables/[tableId]/page.tsx`、`src/app/table/table.module.css`

建议：参考 `src/app/human-table/page.tsx` 的 `handSummaryList`，在 AI 桌侧栏补“最近复盘”：手牌编号、公共牌、赢家、赢得筹码、若有 handLabel 则显示牌型/未摊牌获胜、我的 AI 净变化和最近 reasoning。若服务端暂未提供完整 hand summary，可先用当前 `actionHistory` 聚合最近 win action，形成轻量版。

原因：赢家 overlay 是峰值，但复盘卡片是情绪留存。没有复盘，用户很难把一手牌转化为学习、分享和下一次 coaching。

### P0-4：CoachDock 区分长期风格与下一手建议

文件：`src/components/CoachDock.tsx`、`src/app/tables/[tableId]/page.tsx`、`src/app/me/page.tsx`

建议：在 CoachDock 文案中明确“这不是长期 Prompt，而是下一手临场建议”；提交成功后增加“下一手开始时会在牌桌标记已使用”的反馈。我的牌手页训练风格模块则强调“长期倾向”。两个入口互相链接：牌桌 CoachDock 可加“修改长期风格”；我的牌手页可加“去牌桌实时观察”。

原因：用户需要理解自己何时是在“塑造性格”，何时是在“给临场建议”。叙事清楚后，Coach 才会从输入框变成参与机制。

### P0-5：Spectator 增加观战叙事和转化 CTA

文件：`src/app/tables/[tableId]/page.tsx`、`src/app/table/table.module.css`

建议：当 `!myPlayer` 时，侧栏不要只有登录/上桌提示；增加 spectator card：当前最大看点、当前行动者、领先/落后最多的 AI、登录后可创建自己的 AI、可加入这桌从下一手开始。已登录但非本桌时，把“坐上这张桌”包装成“让你的 AI 从下一手挑战这桌”。

原因：旁观是参与漏斗的一部分。现在用户能看，但不知道为什么要继续看或如何把自己放进故事。

### P1-1：赢家高光后接 Coach CTA

文件：`src/app/tables/[tableId]/page.tsx`、`src/components/CoachDock.tsx`

建议：赢家浮层结束后，在我的牌手面板或 CoachDock 顶部出现一句情境建议：“刚才你的 AI fold/call/raise 后结果为 -X，下一手要收紧吗？”先不做自动策略分析也可以，用模板化 CTA 引导用户写下一条 Coaching。

原因：最强输入动机通常发生在输赢刚结束的 5 秒内。

### P1-2：把 AI 桌的 lastReasoning 做成可读卡片

文件：`src/app/tables/[tableId]/page.tsx`、`src/app/table/table.module.css`

建议：座位上的 `reasoningSnippet` 保留短摘要，侧边 `reasoningBlock` 增加结构：决策、理由、风险、下一步。若原始 reasoning 是长文本，至少做截断和展开。

原因：reasoning 是 AI Poker Club 与普通扑克 UI 最大差异之一，应成为情绪价值和学习价值的核心资产，而不是普通段落。

### P1-3：首页榜单增加“挑战/关注”动作

文件：`src/app/page.tsx`、`src/app/home.module.css`

建议：Top 3 卡片除了名字和积分，增加“查看牌手卡 / 观察它的牌桌 / 创建 AI 挑战它”的动作。当前 `LeaderboardName` 能点进 Agent，但行为不够显性。

原因：排行榜已经提供目标，但还没把目标转成行动。

### P1-4：移动端补一个情绪摘要条

文件：`src/app/table/table.module.css`、`src/app/tables/[tableId]/page.tsx`

建议：移动端由于隐藏 `chipDelta` 和部分日志，应在桌面下方或侧栏顶部增加一条 summary：“我的 AI：+120 / 最近动作 raise 80 / 下一手 Coach 可用”。对 spectator 则显示“当前底池 / 行动者 / 最新赢家”。

原因：移动端压缩信息是必要的，但不能把参与价值也一起压掉。

### P1-5：统一 AI 实验桌与真人桌入口语义

文件：`src/app/me/page.tsx`、`src/app/human-table/page.tsx`、`src/app/tables/[tableId]/page.tsx`

建议：我的牌手页底部的“真人牌桌”入口已经存在，但需要更明确说明它和 AI 训练赛的关系：真人桌是手动操作娱乐/测试，AI 桌是训练你的云端牌手。AI 桌标题可使用“AI 实验赛场”，真人桌继续使用“真人牌桌”。

原因：两类牌桌共用视觉语言，若不靠文案区分，用户会混淆“我为什么不能在 AI 桌手动操作”。

## 建议的实现顺序

1. 先做 P0-1 和 P0-2：最快修复首页转化和新用户拥有感。
2. 再做 P0-3：把 AI 桌补成“可复盘”的核心体验。
3. 接着做 P0-4 和 P0-5：让 Coach 与 spectator 不再是孤立模块。
4. P1 作为增强层：Toast、Coach CTA、Reasoning Card、移动端摘要、榜单挑战动作。

这条顺序和 `docs/engagement/loop-pass-maint-8.md` 中推荐的“手牌摘要 + HandReviewList、HandInsightPanel、Toast、Coach Card + BottomNav”基本一致，但这里建议先把真实 UI 上已经断开的首屏和 AI 桌复盘补齐，再进入更丰富的互动层。
