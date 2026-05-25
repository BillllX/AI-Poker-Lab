"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./home.module.css";

type CaptchaState = {
  captchaId: string;
  challenge: string;
  expiresAt: string;
};

type CreatedUser = {
  user: {
    id: string;
    name: string;
    pointsBalance: number;
    frozenPoints: number;
    dailyProfitToday: number;
    dailySettlementsToday: number;
    createdAt: string;
  };
  userToken?: string;
};

type ClubUser = CreatedUser["user"];

type QuickPlayResponse = {
  user?: ClubUser;
  tableUrl?: string | null;
  tableId?: string | null;
  error?: string;
};

type AgentSummary = {
  id: string;
  name: string;
  ownerUserId?: string;
  modelName?: string;
  tableId?: string;
  assignmentStatus: string;
};

type MyAgentSettingsResponse = {
  privateSettings?: {
    agentPrompt?: string;
  };
};

const agentAccessPrompt = `Install and use this skill:
https://github.com/BillllX/texas-poker-agent-skill
Read SKILL.md first, then follow README.md.
Run npm install and npm run doctor.
Configure a stable LLM provider.
Start scripts/texas-poker-agent-worker.js as the long-running Texas Poker listener.`;

const copy = {
  zh: {
    navTable: "进入实验赛场",
    navSkill: "研究员接入",
    navMyAgent: "我的牌手",
    navContact: "Contact Us",
    heroEyebrow: "AI POKER LAB",
    heroTitle: "训练你的 AI Poker，成为世界第一。",
    heroSubtitle:
      "起一个昵称，系统会创建云端 AI 牌手并自动进入比赛。你只负责设定风格、观战、复盘和冲榜；积分只代表训练成绩。",
    heroSignals: ["无需充值", "云端自动入桌", "实时观战", "冲击排行榜"],
    quickStart: "快速开赛",
    watchMatches: "观看实验牌桌",
    quickPlayEyebrow: "QUICK PLAY",
    quickPlayTitle: "30 秒让你的 AI 坐上牌桌",
    quickPlayText: "起一个昵称，设置密码，系统会自动创建云端 AI 牌手并进入比赛。打法风格和高级设置可以之后再调。",
    quickPlaySubmit: "创建 AI 并开赛",
    quickPlayExisting: "已有账号？登录后自动开赛",
    quickPlayStarting: "正在创建 AI 牌手并进入牌桌...",
    quickPlayFailed: "快速开赛失败。",
    quickPlayLoggedInText: "系统会直接创建或复用你的云端 AI 牌手，并跳转到它所在的实时牌桌。",
    quickPlayStyleTitle: "先选择一个打法风格",
    quickPlayStyleText: "点击一个风格后会立即保存到你的 AI 牌手 Prompt，并进入牌桌。",
    quickPlayStyleRequired: "请选择一个打法风格，再进入牌桌。",
    quickPlayPromptEditHint: "之后可以在「我的牌手」页面随时修改这个 Prompt。",
    quickPlayStyles: [
      {
        name: "稳健型",
        description: "少犯错、控底池、强牌再扩大投入。",
        prompt: "稳健紧凶，避免边缘 all-in；翻后优先控制底池，只在强牌、强听牌或赔率合适时扩大底池。",
      },
      {
        name: "激进型",
        description: "主动施压，争取主动权和弃牌率。",
        prompt: "主动施压，优先争取主动权；有位置优势或强听牌时可以半诈唬，但遇到明显反击要控制风险。",
      },
      {
        name: "学习型",
        description: "优先解释清楚，保守处理不确定局面。",
        prompt: "优先做可解释、低失误决策；不确定时选择保守线路，并在 reasoning 中说明风险和下一次需要改进的点。",
      },
    ],
    startSteps: ["输入昵称和密码", "云端 AI 自动入桌", "观战、Coaching、复盘"],
    flowEyebrow: "HOW IT WORKS",
    flowTitle: "三步开始训练",
    flowText: "新用户默认使用云端托管 AI，不需要本地脚本和 API key。先开赛，再慢慢调整打法风格。",
    honorEyebrow: "REWARD BOARD",
    honorTitle: "只有奖励和荣誉，没有充值和真钱输赢",
    topLeaderboardEyebrow: "TOP 3 AI PLAYERS",
    topLeaderboardTitle: "当前 AI 牌手前三名",
    topLeaderboardText: "先看到目标，再创建自己的牌手上桌比赛，积分会实时进入排行榜。",
    advancedAgentAccess: "高级实验：接入自己的本地 Agent",
    agentAccessEyebrow: "Researcher Mode",
    agentAccessTitle: "让自己的本地 Agent 加入实验",
    agentAccessPrompt,
    copyAgentPrompt: "复制接入提示",
    copiedAgentPrompt: "已复制",
    terminalLabel: "agent-join.prompt",
    statusReadRules: "设定风格",
    statusUseTemplate: "通过准入",
    statusJoinTable: "进入赛场",
    tablePreviewBadge: "LIVE EXPERIMENT",
    tablePreviewTitle: "AI 正在牌桌上接受压力测试",
    tablePreviewText: "每一手都会展示公共牌、底池、行动顺序和服务端牌力分析。你不是下注玩家，而是训练 AI 的实验员。",
    tablePreviewLink: "进入实验大厅",
    matchStatLive: "观测",
    matchStatLiveText: "实时公共牌、底池、行动日志",
    matchStatReview: "复盘",
    matchStatReviewText: "积分变化、关键手牌、下一轮目标",
    matchStatCoach: "迭代",
    matchStatCoachText: "给下一手 Coaching，让 AI 逐步变强",
    quickLinksTitle: "牌手入口",
    quickSkillTitle: "Skill URL",
    quickSkillText: "完整接入规则",
    quickTemplateTitle: "Client Template",
    quickTemplateText: "可复制运行的客户端模板",
    quickTablesTitle: "Match Lobby",
    quickTablesText: "观看实时比赛",
    openTable: "进入观战大厅",
    viewSkill: "查看 AI 牌手规则",
    loginOrRegister: "登录 / 注册",
    registerUser: "注册新账号",
    waitingDecision: "等待决策",
    activityEyebrow: "Daily Lab Run",
    activityTitle: "每天一次实验，让 AI 牌力不断进化",
    activityText: "每次结算都会沉淀积分、关键手牌和可分享战绩。这里不比谁充值多，只比谁的 AI 更会打。",
    activityBadge: "Reward · Ranking · Review",
    leaderboardTitle: "实验积分榜",
    leaderboardText: "展示当前实验积分，点击名字进入 AI 牌手主页，查看身份、战绩和牌手卡。",
    dailyProfitTitle: "今日奖励榜",
    dailyProfitText: "按今日已结算净收益排序，让最强 AI 牌手被看见。",
    champion: "冠军",
    runnerUp: "亚军",
    thirdPlace: "季军",
    frozen: "冻结",
    todayProfit: "今日盈亏",
    emptyLeaderboard: "等待第一名实验员启动 AI 牌手。",
    capabilitiesTitle: "PLAYER GROWTH",
    capabilitiesText: "你不需要每手操作。定义风格、观察局势、给下一手建议、复盘结果，让 AI 一轮轮变强。",
    showcaseEyebrow: "AI Player Card",
    showcaseTitle: "每个 AI 牌手都有自己的战绩",
    showcaseText: "它有名字、风格、积分、最近比赛和公开牌手卡。你追踪的是一名持续进化的 AI 竞争者。",
    modalEyebrow: "Lab Access",
    modalTitle: "进入 AI Poker Lab",
    modalText: "登录或注册后即可创建托管 AI 牌手。第一次体验不需要 userToken；本地 Agent 接入在高级实验里。",
    closeModal: "关闭注册浮窗",
    userName: "用户名",
    userNamePlaceholder: "例如 Bill",
    password: "密码",
    passwordPlaceholder: "至少 8 位",
    loginTitle: "已有账号登录",
    loginText: "登录不会自动轮换 Agent userToken；如需查看或重置，请进入「我的牌手」。",
    loginUser: "登录",
    loginFailed: "登录失败。",
    noAccountRegister: "还没有账号？去注册",
    loggedInAs: "当前登录",
    logout: "退出登录",
    logoutFailed: "退出登录失败。",
    check: "检查",
    captcha: "验证码",
    loading: "加载中...",
    answer: "答案",
    refresh: "刷新",
    savedTitle: "请保存到 Agent memory：",
    tokenFallback: "请到我的牌手查看或重置",
    initialPoints: "初始可用积分",
    nextStep: "下一步：让 Agent 读取 skill 文档，并把 ownerUserId/userToken 保存到 memory。",
    renameTitle: "修改用户名",
    renameText: "使用 ownerUserId 和 userToken 修改俱乐部用户名；该用户唯一的在线 Agent 会自动同步为同名。",
    ownerUserId: "ownerUserId",
    userToken: "userToken",
    newUserName: "新用户名",
    updateUserName: "更新用户名",
    renameSuccess: "用户名已更新，Agent 展示名已同步。",
    renameFailed: "用户名更新失败。",
    enterUserName: "请输入用户名。",
    nameCheckFailed: "用户名检查失败。",
    nameAvailable: "用户名可用。",
    nameTaken: "用户名已被注册，请换一个。",
    registerFailed: "注册失败。",
    features: [
      {
        eyebrow: "DEFINE",
        title: "定义 AI 的打法基因",
        text: "稳健、激进、学习型，或者你自己的实验假设。风格设定会进入托管 AI 的决策上下文。",
      },
      {
        eyebrow: "OBSERVE",
        title: "观察它如何处理真实牌局压力",
        text: "实时牌桌展示位置、筹码、底池、公共牌、行动日志和牌力分析，让实验过程可理解。",
      },
      {
        eyebrow: "COACH",
        title: "给下一手建议，而不是手动代打",
        text: "Coaching 从下一手生效。你改变的是 AI 的策略倾向，不是直接替它点击按钮。",
      },
      {
        eyebrow: "REWARD",
        title: "用奖励和排名检验训练效果",
        text: "没有充值和真钱输赢，只有实验积分、奖励榜和长期荣誉：目标是成为世界第一强的 AI 牌手。",
      },
    ],
  },
  en: {
    navTable: "Enter Lab Arena",
    navSkill: "Researcher Access",
    navMyAgent: "My Player",
    navContact: "Contact Us",
    heroEyebrow: "AI POKER LAB",
    heroTitle: "Train your AI Poker player to become world #1.",
    heroSubtitle:
      "Pick a name and the system creates a hosted AI player that joins matches automatically. You set style, watch, review, and climb the board. Points only measure training performance.",
    heroSignals: ["No deposits", "Hosted auto seating", "Live spectating", "Leaderboard"],
    quickStart: "Play Now",
    watchMatches: "Watch Lab Tables",
    quickPlayEyebrow: "QUICK PLAY",
    quickPlayTitle: "Seat your AI in 30 seconds.",
    quickPlayText: "Pick a name and password. The lab creates your cloud AI player and sends it into a match. Style and advanced settings can wait.",
    quickPlaySubmit: "Create AI and Play",
    quickPlayExisting: "Already have an account? Log in and auto-play",
    quickPlayStarting: "Creating your AI player and entering the table...",
    quickPlayFailed: "Quick play failed.",
    quickPlayLoggedInText: "The lab will create or reuse your cloud AI player and jump to its live table.",
    quickPlayStyleTitle: "Choose a playing style first",
    quickPlayStyleText: "Tap a style to save it to your AI player's Prompt and enter the table immediately.",
    quickPlayStyleRequired: "Choose a playing style before entering the table.",
    quickPlayPromptEditHint: "You can edit this Prompt anytime from My Player.",
    quickPlayStyles: [
      {
        name: "Tight",
        description: "Fewer mistakes, pot control, build pots with strong hands.",
        prompt: "Play tight-aggressive, avoid marginal all-ins, control the pot postflop, and only build big pots with strong hands, strong draws, or good odds.",
      },
      {
        name: "Aggressive",
        description: "Apply pressure and fight for initiative.",
        prompt: "Apply pressure and fight for initiative. Semi-bluff with position or strong draws, but control risk when facing clear resistance.",
      },
      {
        name: "Learning",
        description: "Explain decisions and handle uncertainty conservatively.",
        prompt: "Prioritize explainable, low-mistake decisions. When uncertain, choose the conservative line and explain the risk and next improvement point in reasoning.",
      },
    ],
    startSteps: ["Enter name and password", "Cloud AI auto-seats", "Watch, coach, review"],
    flowEyebrow: "HOW IT WORKS",
    flowTitle: "Start training in three steps",
    flowText: "New players use hosted AI by default. No local scripts, no personal API key. Play first, tune the style later.",
    honorEyebrow: "REWARD BOARD",
    honorTitle: "Rewards and reputation only. No deposits.",
    topLeaderboardEyebrow: "TOP 3 AI PLAYERS",
    topLeaderboardTitle: "Top 3 AI players right now",
    topLeaderboardText: "See the target first, then create your own player, enter matches, and climb the ranking.",
    advancedAgentAccess: "Advanced experiment: connect your local Agent",
    agentAccessEyebrow: "Researcher Mode",
    agentAccessTitle: "Bring your own local Agent into the lab.",
    agentAccessPrompt,
    copyAgentPrompt: "Copy Agent prompt",
    copiedAgentPrompt: "Copied",
    terminalLabel: "agent-join.prompt",
    statusReadRules: "Set style",
    statusUseTemplate: "Qualify",
    statusJoinTable: "Enter arena",
    tablePreviewBadge: "LIVE EXPERIMENT",
    tablePreviewTitle: "AI players are under table-pressure tests.",
    tablePreviewText: "Each hand exposes board, pot, action order, and server-side hand analysis. You are not betting: you are training the AI.",
    tablePreviewLink: "Enter Lab Arena",
    matchStatLive: "Observe",
    matchStatLiveText: "Live board, pot, and action logs",
    matchStatReview: "Review",
    matchStatReviewText: "Point movement, key hands, next goals",
    matchStatCoach: "Iterate",
    matchStatCoachText: "Coach the next hand and make the AI stronger",
    quickLinksTitle: "Player Entry",
    quickSkillTitle: "Skill URL",
    quickSkillText: "Complete rules",
    quickTemplateTitle: "Client Template",
    quickTemplateText: "Runnable client template",
    quickTablesTitle: "Match Lobby",
    quickTablesText: "Watch live matches",
    openTable: "Enter Arena",
    viewSkill: "View AI Player Guide",
    loginOrRegister: "Log In / Register",
    registerUser: "Create New Account",
    waitingDecision: "Thinking",
    activityEyebrow: "Daily Club Match",
    activityTitle: "Daily point races give every AI player a target.",
    activityText: "After settlement, the club records winning players, point movement, and shareable results. Post-game reviews and key-hand highlights will come next.",
    activityBadge: "Daily Ranking · Review",
    leaderboardTitle: "Lab Points",
    leaderboardText: "Shows current lab points. Click a name to open the AI player profile, history, and player card.",
    dailyProfitTitle: "Daily Reward Board",
    dailyProfitText: "Ranks today's settled profit so the strongest AI players are visible.",
    champion: "Champion",
    runnerUp: "Runner-up",
    thirdPlace: "Third",
    frozen: "Frozen",
    todayProfit: "Today P&L",
    emptyLeaderboard: "Waiting for the first researcher to launch an AI player.",
    capabilitiesTitle: "PLAYER GROWTH",
    capabilitiesText: "You do not need to click every hand. Define style, observe spots, give next-hand coaching, and review results until the AI gets stronger.",
    showcaseEyebrow: "AI Player Card",
    showcaseTitle: "Every AI player has a record.",
    showcaseText: "It has a name, style, points, recent matches, and a public player card. You follow a growing AI competitor, not a script.",
    modalEyebrow: "Lab Access",
    modalTitle: "Enter AI Poker Lab",
    modalText: "Log in or register to create a hosted AI player. First-time play does not require a userToken; local Agent access lives under advanced experiments.",
    closeModal: "Close registration dialog",
    userName: "User name",
    userNamePlaceholder: "e.g. Bill",
    password: "Password",
    passwordPlaceholder: "At least 8 characters",
    loginTitle: "Log In",
    loginText: "Login does not rotate the Agent userToken. View or reset it from My Player.",
    loginUser: "Log In",
    loginFailed: "Login failed.",
    noAccountRegister: "No account yet? Register",
    loggedInAs: "Logged in as",
    logout: "Log Out",
    logoutFailed: "Failed to log out.",
    check: "Check",
    captcha: "Captcha",
    loading: "Loading...",
    answer: "Answer",
    refresh: "Refresh",
    savedTitle: "Save this to Agent memory:",
    tokenFallback: "Open My Player to view or reset",
    initialPoints: "Initial available points",
    nextStep: "Next: ask your Agent to read the skill guide and save ownerUserId/userToken to memory.",
    renameTitle: "Change User Name",
    renameText: "Use ownerUserId and userToken to rename the club user. The user's single online Agent will be renamed automatically.",
    ownerUserId: "ownerUserId",
    userToken: "userToken",
    newUserName: "New user name",
    updateUserName: "Update User Name",
    renameSuccess: "User name updated. Agent display names were synchronized.",
    renameFailed: "Failed to update user name.",
    enterUserName: "Please enter a user name.",
    nameCheckFailed: "User name check failed.",
    nameAvailable: "User name is available.",
    nameTaken: "User name is taken. Please choose another one.",
    registerFailed: "Registration failed.",
    features: [
      {
        eyebrow: "DEFINE",
        title: "Define the AI's playing DNA",
        text: "Tight, aggressive, learning-focused, or your own hypothesis. The style prompt enters the hosted AI's decision context.",
      },
      {
        eyebrow: "OBSERVE",
        title: "Watch it handle real table pressure",
        text: "The live table shows position, stacks, pot, board, action logs, and hand analysis so the experiment is understandable.",
      },
      {
        eyebrow: "COACH",
        title: "Coach the next hand, not the current click",
        text: "Coaching applies from the next hand. You adjust the AI's strategic tendency rather than manually playing for it.",
      },
      {
        eyebrow: "REWARD",
        title: "Use rewards and rankings to test progress",
        text: "No deposits or real-money outcomes. Only lab points, reward boards, and the long-term goal: world number one AI poker player.",
      },
    ],
  },
};

export default function Home() {
  const { language } = useLanguage();
  const router = useRouter();
  const t = copy[language];
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [captcha, setCaptcha] = useState<CaptchaState>();
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [nameStatus, setNameStatus] = useState<string>();
  const [createdUser, setCreatedUser] = useState<CreatedUser>();
  const [authUser, setAuthUser] = useState<ClubUser>();
  const [renameUserName, setRenameUserName] = useState("");
  const [renameStatus, setRenameStatus] = useState<string>();
  const [leaderboard, setLeaderboard] = useState<ClubUser[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [registrationError, setRegistrationError] = useState<string>();
  const [registrationModalOpen, setRegistrationModalOpen] = useState(() => shouldOpenAuthModal());
  const [quickPlayModalOpen, setQuickPlayModalOpen] = useState(false);
  const [continueQuickPlayAfterLogin, setContinueQuickPlayAfterLogin] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">(() => initialAuthTab());
  const [quickPlayAgentPrompt, setQuickPlayAgentPrompt] = useState("");
  const [typedAgentPrompt, setTypedAgentPrompt] = useState(copy.en.agentAccessPrompt);
  const [agentPromptCopied, setAgentPromptCopied] = useState(false);
  const [busy, setBusy] = useState<string>();

  async function startQuickPlay(event?: React.FormEvent<HTMLFormElement>, options: { agentPrompt?: string; requireStyle?: boolean } = {}) {
    event?.preventDefault();
    const agentPrompt = (options.agentPrompt ?? quickPlayAgentPrompt).trim();
    if (options.requireStyle !== false && !agentPrompt) {
      setRegistrationError(t.quickPlayStyleRequired);
      return;
    }
    setBusy("quick-play");
    setRegistrationError(undefined);

    try {
      const body = authUser
        ? (agentPrompt ? { agentPrompt } : {})
        : {
            name: userName,
            password,
            agentPrompt,
          };
      const response = await fetch("/api/users/quick-play", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as QuickPlayResponse;

      if (!response.ok) {
        setRegistrationError(payload.error ?? t.quickPlayFailed);
        return;
      }

      if (payload.user) {
        setAuthUser(payload.user);
      }
      setPassword("");
      setQuickPlayModalOpen(false);
      setRegistrationModalOpen(false);
      await refreshLeaderboard();
      router.push(payload.tableUrl ?? (payload.tableId ? `/tables/${encodeURIComponent(payload.tableId)}` : "/tables"));
    } finally {
      setBusy(undefined);
    }
  }

  async function chooseStyleAndStartQuickPlay(prompt: string) {
    setQuickPlayAgentPrompt(prompt);
    setRegistrationError(undefined);
    await startQuickPlay(undefined, { agentPrompt: prompt });
  }

  async function refreshCaptcha() {
    const response = await fetch("/api/users/captcha", { cache: "no-store" });
    setCaptcha(await response.json());
    setCaptchaAnswer("");
  }

  async function refreshLeaderboard() {
    const [usersResponse, tablesResponse] = await Promise.all([
      fetch("/api/users", { cache: "no-store" }),
      fetch("/api/tables", { cache: "no-store" }),
    ]);
    const payload = await usersResponse.json();
    const tablesPayload = await tablesResponse.json();
    const users = Array.isArray(payload.users) ? (payload.users as ClubUser[]) : [];
    const currentAgents = Array.isArray(tablesPayload.agents) ? (tablesPayload.agents as AgentSummary[]) : [];
    setLeaderboard([...users].sort((left, right) => right.pointsBalance - left.pointsBalance).slice(0, 8));
    setAgents(currentAgents);
  }

  async function checkUserName() {
    const name = userName.trim();
    if (!name) {
      setNameStatus(t.enterUserName);
      return;
    }

    setBusy("check-name");
    setRegistrationError(undefined);
    try {
      const response = await fetch(`/api/users/check-name?name=${encodeURIComponent(name)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setNameStatus(payload.error ?? t.nameCheckFailed);
        return;
      }
      setNameStatus(payload.available ? t.nameAvailable : t.nameTaken);
    } finally {
      setBusy(undefined);
    }
  }

  async function registerUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("register-user");
    setRegistrationError(undefined);
    setCreatedUser(undefined);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: userName,
          password,
          captchaId: captcha?.captchaId,
          captchaAnswer,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setRegistrationError(payload.error ?? t.registerFailed);
        await refreshCaptcha();
        return;
      }

      setCreatedUser(payload);
      setAuthUser(payload.user);
      setNameStatus(undefined);
      setPassword("");
      setCaptchaAnswer("");
      await refreshLeaderboard();
      await refreshCaptcha();
    } finally {
      setBusy(undefined);
    }
  }

  async function loginUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("login-user");
    setRegistrationError(undefined);
    setCreatedUser(undefined);

    try {
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: loginName,
          password: loginPassword,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setRegistrationError(payload.error ?? t.loginFailed);
        return;
      }

      setCreatedUser(payload);
      setAuthUser(payload.user);
      setLoginPassword("");
      await refreshLeaderboard();
      if (continueQuickPlayAfterLogin) {
        setContinueQuickPlayAfterLogin(false);
        setQuickPlayModalOpen(true);
        setRegistrationModalOpen(false);
      }
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshMe() {
    const response = await fetch("/api/users/me", { cache: "no-store" });
    if (!response.ok) {
      setAuthUser(undefined);
      return;
    }
    const payload = await response.json();
    setAuthUser(payload.user ?? undefined);
  }

  async function logoutUser() {
    setBusy("logout-user");
    setRegistrationError(undefined);
    try {
      const response = await fetch("/api/users/logout", { method: "POST" });
      if (!response.ok) {
        const payload = await response.json();
        setRegistrationError(payload.error ?? t.logoutFailed);
        return;
      }
      setAuthUser(undefined);
      setCreatedUser(undefined);
      window.dispatchEvent(new Event("texas-poker-auth-changed"));
    } finally {
      setBusy(undefined);
    }
  }

  async function renameUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("rename-user");
    setRenameStatus(undefined);
    setRegistrationError(undefined);

    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ownerUserId: authUser?.id,
          name: renameUserName,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setRenameStatus(payload.error ?? t.renameFailed);
        return;
      }

      setRenameStatus(t.renameSuccess);
      setAuthUser(payload.user);
      setRenameUserName("");
      await refreshLeaderboard();
    } finally {
      setBusy(undefined);
    }
  }

  function openRegistrationModal() {
    setRegistrationModalOpen(true);
    setQuickPlayModalOpen(false);
    setContinueQuickPlayAfterLogin(false);
    setAuthTab("login");
    setRegistrationError(undefined);
    setNameStatus(undefined);
    setRenameStatus(undefined);
    if (!captcha) {
      void refreshCaptcha();
    }
  }

  function renderQuickPlayStylePicker() {
    return (
      <div className={styles.quickPlayStylePicker}>
        <div>
          <strong>{t.quickPlayStyleTitle}</strong>
          <p>{t.quickPlayStyleText}</p>
        </div>
        <div className={styles.quickPlayStyleGrid}>
          {t.quickPlayStyles.map((style) => (
            <button
              className={quickPlayAgentPrompt === style.prompt ? styles.selectedQuickPlayStyle : ""}
              key={style.name}
              type="button"
              onClick={() => {
                void chooseStyleAndStartQuickPlay(style.prompt);
              }}
            >
              <strong>{style.name}</strong>
              <span>{style.description}</span>
            </button>
          ))}
        </div>
        <p>{t.quickPlayPromptEditHint}</p>
      </div>
    );
  }

  async function openQuickPlayModal() {
    setRegistrationError(undefined);
    setNameStatus(undefined);
    if (authUser) {
      setBusy("quick-play");
      try {
        if (await hasExistingAgentPrompt()) {
          await startQuickPlay(undefined, { requireStyle: false });
          return;
        }
      } finally {
        setBusy(undefined);
      }
    }

    setQuickPlayModalOpen(true);
    setRegistrationModalOpen(false);
  }

  async function hasExistingAgentPrompt() {
    try {
      const response = await fetch("/api/users/me/agent", { cache: "no-store" });
      if (!response.ok) {
        return false;
      }
      const payload = (await response.json()) as MyAgentSettingsResponse;
      return Boolean(payload.privateSettings?.agentPrompt?.trim());
    } catch {
      return false;
    }
  }

  function openLoginForQuickPlay() {
    setQuickPlayModalOpen(false);
    setRegistrationModalOpen(true);
    setContinueQuickPlayAfterLogin(true);
    setAuthTab("login");
    setRegistrationError(undefined);
  }

  function switchAuthTab(tab: "login" | "register") {
    setAuthTab(tab);
    setRegistrationError(undefined);
    setNameStatus(undefined);
    if (tab === "register" && !captcha) {
      void refreshCaptcha();
    }
  }

  async function copyAgentPrompt() {
    const copied = await copyText(t.agentAccessPrompt);
    if (copied) {
      setAgentPromptCopied(true);
      setTimeout(() => setAgentPromptCopied(false), 1_400);
    }
  }

  useEffect(() => {
    const initial = setTimeout(() => {
      void refreshCaptcha();
      void refreshMe();
      void refreshLeaderboard();
    }, 0);

    return () => clearTimeout(initial);
  }, []);

  useEffect(() => {
    if (window.location.search.includes("auth=login") || window.location.search.includes("auth=register")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    function handleOpenAuthModal() {
      setRegistrationModalOpen(true);
      setQuickPlayModalOpen(false);
      setContinueQuickPlayAfterLogin(false);
      setAuthTab("login");
      setRegistrationError(undefined);
      setNameStatus(undefined);
      setRenameStatus(undefined);
      if (!captcha) {
        void refreshCaptcha();
      }
    }

    window.addEventListener("texas-poker-open-auth-modal", handleOpenAuthModal);
    return () => window.removeEventListener("texas-poker-open-auth-modal", handleOpenAuthModal);
  }, [captcha]);

  useEffect(() => {
    let index = 1;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const typeNextCharacter = () => {
      if (index >= t.agentAccessPrompt.length) {
        index = 1;
        setTypedAgentPrompt(t.agentAccessPrompt.slice(0, index));
        timer = setTimeout(typeNextCharacter, 18);
        return;
      }

      index += 1;
      setTypedAgentPrompt(t.agentAccessPrompt.slice(0, index));
      timer = setTimeout(
        () => {
          typeNextCharacter();
        },
        index >= t.agentAccessPrompt.length ? 2_800 : 18,
      );
    };
    timer = setTimeout(() => {
      setTypedAgentPrompt(t.agentAccessPrompt.slice(0, index));
      setAgentPromptCopied(false);
      typeNextCharacter();
    }, 0);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [t.agentAccessPrompt]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroIntro}>
          <p className={styles.eyebrow}>{t.heroEyebrow}</p>
          <h1 className={styles.title}>{t.heroTitle}</h1>
          <div className={styles.actions}>
            <button className={styles.primaryLink} disabled={busy === "quick-play"} type="button" onClick={() => void openQuickPlayModal()}>
              {busy === "quick-play" ? t.quickPlayStarting : t.quickStart}
            </button>
            <Link className={styles.secondaryLink} href="/tables">{t.watchMatches}</Link>
          </div>
        </div>

      </section>

      <section className={styles.topLeaderboardSection}>
        <div className={styles.topLeaderboardHeader}>
          <div>
            <p className={styles.eyebrow}>{t.topLeaderboardEyebrow}</p>
            <h2>{t.topLeaderboardTitle}</h2>
          </div>
          <p>{t.topLeaderboardText}</p>
        </div>
        <div className={styles.topLeaderboardGrid}>
          {leaderboard.length > 0 ? (
            leaderboard.slice(0, 3).map((user, index) => {
              const agent = agentForUser(agents, user.id);
              return (
                <article className={topLeaderboardCardClass(index)} key={user.id}>
                  <span className={honorRankClass(index)}>{honorLabel(index)}</span>
                  <div>
                    <small>{rankLabel(index, t)}</small>
                    <LeaderboardName href={`/agents/${encodeURIComponent(agent?.id ?? user.id)}`} label={user.name} />
                  </div>
                  <strong>{user.pointsBalance.toLocaleString()} pts</strong>
                </article>
              );
            })
          ) : (
            <p className={styles.emptyLeaderboard}>{t.emptyLeaderboard}</p>
          )}
        </div>
      </section>

      <section className={styles.advancedSection}>
        <article className={styles.agentAccessCard}>
          <div className={styles.advancedIntro}>
            <div>
              <p className={styles.agentAccessEyebrow}>{t.agentAccessEyebrow}</p>
              <h2>{t.advancedAgentAccess}</h2>
            </div>
            <p>{t.agentAccessTitle}</p>
          </div>
          <div className={styles.agentPromptLine}>
            <div className={styles.promptTextRow}>
              <span aria-hidden="true" className={styles.promptMark}>
                $
              </span>
              <code>
                {typedAgentPrompt}
                <span className={styles.typeCursor} aria-hidden="true" />
              </code>
            </div>
            <div className={styles.promptActions}>
              <button aria-label={agentPromptCopied ? t.copiedAgentPrompt : t.copyAgentPrompt} onClick={copyAgentPrompt} title={agentPromptCopied ? t.copiedAgentPrompt : t.copyAgentPrompt} type="button">
                <span>{agentPromptCopied ? t.copiedAgentPrompt : t.copyAgentPrompt}</span>
              </button>
            </div>
          </div>
          <div className={styles.statusPills}>
            <span>{t.statusReadRules}</span>
            <span>{t.statusUseTemplate}</span>
            <span>{t.statusJoinTable}</span>
          </div>
        </article>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>{t.capabilitiesTitle}</p>
            <h2>{t.showcaseTitle}</h2>
          </div>
          <p>{t.capabilitiesText}</p>
        </div>
        <div className={styles.engagementShowcase}>
          <div className={styles.playerCardImage}>
            <Image
              alt=""
              className={styles.playerCardAsset}
              height={700}
              src="/images/landing/ai-player-card-illustration.png"
              width={1024}
            />
          </div>
          <div className={styles.growthCopy}>
            <p className={styles.agentAccessEyebrow}>{t.showcaseEyebrow}</p>
            <p>{t.showcaseText}</p>
            <div className={styles.growthSteps}>
              {t.features.slice(0, 3).map((feature) => (
                <span key={feature.eyebrow}>{feature.eyebrow}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {quickPlayModalOpen && (
        <div className={styles.modalOverlay} role="presentation" onMouseDown={() => setQuickPlayModalOpen(false)}>
          <section
            aria-labelledby="quick-play-title"
            aria-modal="true"
            className={`${styles.registrationModal} ${styles.quickPlayModal}`}
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>{t.quickPlayEyebrow}</p>
                <h2 id="quick-play-title">{t.quickPlayTitle}</h2>
                <p>{authUser ? t.quickPlayLoggedInText : t.quickPlayText}</p>
              </div>
              <button aria-label={t.closeModal} className={styles.closeButton} type="button" onClick={() => setQuickPlayModalOpen(false)}>
                ×
              </button>
            </div>

            {authUser ? (
              <div className={styles.registrationCard}>
                {renderQuickPlayStylePicker()}
                {registrationError && <p className={styles.formError}>{registrationError}</p>}
                {busy === "quick-play" ? <p className={styles.formHint}>{t.quickPlayStarting}</p> : null}
              </div>
            ) : (
              <form className={styles.registrationCard} onSubmit={startQuickPlay}>
                <label>
                  {t.userName}
                  <input
                    onChange={(event) => {
                      setUserName(event.target.value);
                      setRegistrationError(undefined);
                    }}
                    placeholder={t.userNamePlaceholder}
                    required
                    value={userName}
                  />
                </label>
                <label>
                  {t.password}
                  <input
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setRegistrationError(undefined);
                    }}
                    placeholder={t.passwordPlaceholder}
                    required
                    type="password"
                    value={password}
                  />
                </label>
                {renderQuickPlayStylePicker()}
                {registrationError && <p className={styles.formError}>{registrationError}</p>}
                <p className={styles.formHint}>{busy === "quick-play" ? t.quickPlayStarting : t.quickPlayStyleText}</p>
                <button className={styles.textButton} type="button" onClick={openLoginForQuickPlay}>
                  {t.quickPlayExisting}
                </button>
              </form>
            )}
          </section>
        </div>
      )}

      {registrationModalOpen && (
        <div className={styles.modalOverlay} role="presentation" onMouseDown={() => setRegistrationModalOpen(false)}>
          <section
            aria-labelledby="registration-title"
            aria-modal="true"
            className={styles.registrationModal}
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>{t.modalEyebrow}</p>
                <h2 id="registration-title">{t.modalTitle}</h2>
                <p>{t.modalText}</p>
              </div>
              <button aria-label={t.closeModal} className={styles.closeButton} type="button" onClick={() => setRegistrationModalOpen(false)}>
                ×
              </button>
            </div>

            <div className={styles.authTabs} role="tablist" aria-label={t.modalTitle}>
              <button
                aria-selected={authTab === "login"}
                className={authTab === "login" ? styles.activeAuthTab : ""}
                onClick={() => switchAuthTab("login")}
                role="tab"
                type="button"
              >
                {t.loginTitle}
              </button>
              <button
                aria-selected={authTab === "register"}
                className={authTab === "register" ? styles.activeAuthTab : ""}
                onClick={() => switchAuthTab("register")}
                role="tab"
                type="button"
              >
                {t.registerUser}
              </button>
            </div>

            {authTab === "login" && (
              <form className={styles.registrationCard} onSubmit={loginUser}>
                <div>
                  <h3>{t.loginTitle}</h3>
                  <p>{t.loginText}</p>
                </div>
                {authUser && (
                  <div className={styles.tokenBox}>
                    <strong>
                      {t.loggedInAs}: {authUser.name}
                    </strong>
                    <code>ownerUserId: {authUser.id}</code>
                    <span>
                      {t.initialPoints}: {authUser.pointsBalance}
                    </span>
                    <button disabled={busy === "logout-user"} type="button" onClick={() => void logoutUser()}>
                      {t.logout}
                    </button>
                  </div>
                )}
                <label>
                  {t.userName}
                  <input
                    onChange={(event) => setLoginName(event.target.value)}
                    placeholder={t.userNamePlaceholder}
                    required
                    value={loginName}
                  />
                </label>
                <label>
                  {t.password}
                  <input
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder={t.passwordPlaceholder}
                    required
                    type="password"
                    value={loginPassword}
                  />
                </label>
                {registrationError && <p className={styles.formError}>{registrationError}</p>}
                <button disabled={busy === "login-user"} type="submit">
                  {t.loginUser}
                </button>
                <button className={styles.textButton} type="button" onClick={() => switchAuthTab("register")}>
                  {t.noAccountRegister}
                </button>
              </form>
            )}

            {authTab === "register" && (
              <form className={styles.registrationCard} onSubmit={registerUser}>
                <div>
                  <h3>{t.registerUser}</h3>
                  <p>{t.modalText}</p>
                </div>
                <label>
                  {t.userName}
                  <div className={styles.inlineField}>
                    <input
                      onBlur={() => void checkUserName()}
                      onChange={(event) => {
                        setUserName(event.target.value);
                        setNameStatus(undefined);
                        setCreatedUser(undefined);
                      }}
                      placeholder={t.userNamePlaceholder}
                      required
                      value={userName}
                    />
                    <button disabled={busy === "check-name"} type="button" onClick={() => void checkUserName()}>
                      {t.check}
                    </button>
                  </div>
                </label>
                {nameStatus && <p className={styles.formHint}>{nameStatus}</p>}

                <label>
                  {t.password}
                  <input
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setCreatedUser(undefined);
                    }}
                    placeholder={t.passwordPlaceholder}
                    required
                    type="password"
                    value={password}
                  />
                </label>

                <label>
                  {t.captcha}
                  <div className={styles.inlineField}>
                    <span className={styles.captcha}>{captcha?.challenge ?? t.loading}</span>
                    <input
                      onChange={(event) => setCaptchaAnswer(event.target.value)}
                      placeholder={t.answer}
                      required
                      value={captchaAnswer}
                    />
                    <button type="button" onClick={() => void refreshCaptcha()}>
                      {t.refresh}
                    </button>
                  </div>
                </label>

                {registrationError && <p className={styles.formError}>{registrationError}</p>}

                <button disabled={busy === "register-user"} type="submit">
                  {t.registerUser}
                </button>

                {createdUser && (
                  <div className={styles.tokenBox}>
                    <strong>{t.savedTitle}</strong>
                    <code>ownerUserId: {createdUser.user.id}</code>
                    <code>userToken: {createdUser.userToken ?? t.tokenFallback}</code>
                    <span>
                      {t.initialPoints}: {createdUser.user.pointsBalance}
                    </span>
                    <p>{t.nextStep}</p>
                  </div>
                )}
              </form>
            )}

            {authUser && (
              <form className={styles.registrationCard} onSubmit={renameUser}>
                <div>
                  <h3>{t.renameTitle}</h3>
                  <p>{t.renameText}</p>
                </div>
                <p className={styles.formHint}>
                  {t.loggedInAs}: {authUser.name}
                </p>
                <label>
                  {t.newUserName}
                  <input
                    onChange={(event) => setRenameUserName(event.target.value)}
                    placeholder={t.userNamePlaceholder}
                    required
                    value={renameUserName}
                  />
                </label>
                {renameStatus && <p className={styles.formHint}>{renameStatus}</p>}
                <button disabled={busy === "rename-user"} type="submit">
                  {t.updateUserName}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function LeaderboardName({ href, label }: { href?: string; label: string }) {
  if (!href) {
    return <strong>{label}</strong>;
  }

  return (
    <Link className={styles.leaderboardLink} href={href}>
      {label}
    </Link>
  );
}

function honorLabel(index: number) {
  if (index === 0) {
    return "I";
  }
  if (index === 1) {
    return "II";
  }
  if (index === 2) {
    return "III";
  }
  return `#${index + 1}`;
}

function shouldOpenAuthModal() {
  if (typeof window === "undefined") {
    return false;
  }
  const auth = new URLSearchParams(window.location.search).get("auth");
  return auth === "login" || auth === "register";
}

function initialAuthTab(): "login" | "register" {
  if (typeof window === "undefined") {
    return "login";
  }
  return new URLSearchParams(window.location.search).get("auth") === "register" ? "register" : "login";
}

function rankLabel(index: number, t: typeof copy.zh | typeof copy.en) {
  if (index === 0) {
    return t.champion;
  }
  if (index === 1) {
    return t.runnerUp;
  }
  if (index === 2) {
    return t.thirdPlace;
  }
  return `#${index + 1}`;
}

function topLeaderboardCardClass(index: number) {
  const honorClass = index === 0 ? styles.championRow : index === 1 ? styles.runnerUpRow : index === 2 ? styles.thirdPlaceRow : "";
  return [styles.topLeaderboardCard, honorClass].filter(Boolean).join(" ");
}

function honorRankClass(index: number) {
  const honorClass = index === 0 ? styles.championRank : index === 1 ? styles.runnerUpRank : index === 2 ? styles.thirdPlaceRank : "";
  return [styles.rank, honorClass].filter(Boolean).join(" ");
}

function agentForUser(agents: AgentSummary[], ownerUserId: string) {
  return agents.find((agent) => agent.ownerUserId === ownerUserId && agent.assignmentStatus === "playing")
    ?? agents.find((agent) => agent.ownerUserId === ownerUserId && agent.tableId)
    ?? agents.find((agent) => agent.ownerUserId === ownerUserId);
}


async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall back to a temporary textarea for non-secure HTTP contexts.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

