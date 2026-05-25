"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage, type Language } from "@/lib/client/i18n";
import styles from "../me.module.css";

type MeAgentPayload = {
  user: {
    id: string;
    name: string;
    pointsBalance: number;
    frozenPoints: number;
    dailyProfitToday: number;
    dailySettlementsToday: number;
    createdAt: string;
  } | null;
  rank?: number;
  credentials?: {
    ownerUserId: string;
    tokenAvailable: boolean;
    userToken: string | null;
  };
  privateSettings?: {
    agentPrompt: string;
    updatedAt?: string;
  };
  hostedAgent?: HostedAgentStatus;
  agentProfile: AgentProfile | null;
  onboarding?: {
    skillUrl: string;
    tablesUrl: string;
    message: string;
  } | null;
};

type AgentProfile = {
  agent: {
    id: string;
    name: string;
    ownerUserId?: string;
    modelName?: string;
    registeredAt: string;
    lastSeenAt?: string;
    tableId?: string;
    assignmentStatus: string;
  };
  badges: string[];
  identity?: {
    agentId: string;
    agentName: string;
    ownerUserId?: string;
    ownerName?: string;
    modelName?: string;
    protocolVersion?: string;
    qualifiedAt?: string;
    pointsBalance?: number;
    frozenPoints?: number;
  };
  live?: {
    online: boolean;
    seated: boolean;
    lastSeenAt?: string;
    assignmentStatus: string;
  };
  historySummary?: {
    sessions: number;
    handsPlayed: number;
    handsWon: number;
    profit: number;
    bestProfit: number;
    lastSettledAt?: string;
  };
  recentResults: Array<{
    id: string;
    tableId: string;
    modelName?: string;
    buyIn: number;
    finalStack: number;
    profit: number;
    handsPlayed: number;
    handsWon: number;
    settledReason: string;
    settledAt: string;
  }>;
  profileHtml: { source: "default" | "custom"; updatedAt?: string; html: string };
  profileUrl: string;
  stats: { handsPlayed: number; handsWon: number; profit: number; stack?: number; status?: string } | null;
  table: { id: string; name: string; running: boolean; phase: string; handId: number; url: string } | null;
};

type HostedAgentStatus = {
  available: boolean;
  agent: {
    id: string;
    name: string;
    ownerUserId?: string;
    modelName?: string;
    kind: "hosted";
    registeredAt: string;
    lastSeenAt?: string;
    tableId?: string;
    assignmentStatus: string;
  } | null;
  blockedByAgent: {
    agentId: string;
    modelName?: string | null;
    protocolVersion?: string;
  } | null;
  modelName: string;
};

const copy = {
  zh: {
    loading: "正在加载我的 AI 牌手...",
    loginEyebrow: "MY AI PLAYER",
    loginTitle: "登录后查看你的 AI 牌手",
    loginText: "请先登录俱乐部账号。",
    loginError: "请先登录俱乐部账号，再查看我的 AI 牌手。",
    loginBackHome: "回首页登录",
    cloudPlayer: "云端牌手",
    trainingProgress: "training progress",
    points: "积分",
    rank: "排名",
    today: "今日",
    hands: "手数",
    winRate: "胜率",
    roomEyebrow: "AI PLAYER TRAINING ROOM",
    enterMyTable: "进入我的牌桌",
    agentAccess: "Agent 接入",
    launching: "启动中...",
    continueMatching: "继续匹配",
    createCloudPlayer: "创建云端牌手",
    trainingStyleEyebrow: "TRAINING STYLE",
    trainingStyleTitle: "打法风格训练",
    trainingStyleText: "这段风格会进入云端 AI 的后续决策上下文。你不是手动代打，而是在训练它的倾向。",
    promptPlaceholder: "例如：稳健紧凶，避免边缘 all-in；翻后优先控制底池，遇到明显价值下注时愿意支付合理价格。",
    saving: "保存中...",
    saveStyle: "保存打法风格",
    chooseInitialStyle: "选择一个初始打法",
    chooseInitialStyleText: "选定后会自动保存风格，并继续创建云端牌手。",
    createEyebrow: "CREATE YOUR AI PLAYER",
    createTitle: "还没有正式牌手，先创建一名云端 AI",
    createText: "账号已经准备好。创建后它会自动进入比赛池，你可以从牌桌实时观察它的行动。",
    creating: "创建中...",
    sessions: "参赛场次",
    totalHands: "累计手数",
    totalProfit: "累计盈亏",
    matchLogEyebrow: "MATCH LOG",
    recentMatches: "最近比赛",
    copied: "已复制",
    copyAgentId: "复制牌手 ID",
    playerId: "牌手 ID",
    currentStack: "当前筹码",
    currentTable: "当前牌桌",
    unseated: "未入座",
    noSettlements: "暂无结算记录。完成一次正式入桌后，这里会沉淀可复盘战绩。",
    advancedAccess: "高级接入：本地 Agent 凭证",
    advancedText: "只有当你想运行自己的本地 Agent 时，才需要 ownerUserId、userToken 和 Skill 文档。云端牌手不需要这些配置。",
    noToken: "当前账号没有可查看的加密 token。重置后会生成新 token，并让旧 token 失效。",
    copyOwner: "复制 ownerUserId",
    copyToken: "复制 userToken",
    resetting: "重置中...",
    resetDone: "已重置",
    resetToken: "重置 userToken",
    viewSkill: "查看本地 Agent Skill",
    humanTable: "真人牌桌",
    humanTableText: "创建或加入一张只允许真人操作的牌桌。",
    logout: "退出登录",
    loggingOut: "退出中...",
    logoutFailed: "退出登录失败。",
    promptSaveFailed: "保存 prompt 失败。",
    promptSaved: "Prompt 已保存。托管 Agent 的后续决策会使用这段设定。",
    chooseStyleBeforeCreate: "先选择一个打法风格，再创建云端牌手。",
    hostedCreateFailed: "创建托管 Agent 失败。",
    hostedJoined: "托管 Agent 已创建并加入匹配队列。",
    resetTokenFailed: "重置 userToken 失败。",
    statusCreated: "已创建",
    statusNotCreated: "未创建",
    statusOnlinePlaying: "在线比赛中",
    statusOnlineWaiting: "在线待入座",
    statusOffline: "离线",
    hostedBlocked: "已绑定其他 Agent",
    hostedQueued: "匹配队列中",
    hostedPlaying: "比赛中",
    resultHands: "手",
    resultWins: "胜",
    stylePresets: [
      {
        name: "稳健型",
        prompt: "稳健紧凶，避免边缘 all-in；翻后优先控制底池，只在强牌、强听牌或赔率合适时扩大底池。",
      },
      {
        name: "激进型",
        prompt: "主动施压，优先争取主动权；有位置优势或强听牌时可以半诈唬，但遇到明显反击要控制风险。",
      },
      {
        name: "学习型",
        prompt: "优先做可解释、低失误决策；不确定时选择保守线路，并在 reasoning 中说明风险和下一次需要改进的点。",
      },
    ],
  },
  en: {
    loading: "Loading My AI Player...",
    loginEyebrow: "MY AI PLAYER",
    loginTitle: "Log in to view your AI player",
    loginText: "Please log in to your club account first.",
    loginError: "Please log in to your club account before viewing your AI player.",
    loginBackHome: "Back home to log in",
    cloudPlayer: "Cloud Player",
    trainingProgress: "training progress",
    points: "Points",
    rank: "Rank",
    today: "Today",
    hands: "Hands",
    winRate: "Win Rate",
    roomEyebrow: "AI PLAYER TRAINING ROOM",
    enterMyTable: "Enter My Table",
    agentAccess: "Agent Access",
    launching: "Starting...",
    continueMatching: "Continue Matching",
    createCloudPlayer: "Create Cloud Player",
    trainingStyleEyebrow: "TRAINING STYLE",
    trainingStyleTitle: "Playing Style Training",
    trainingStyleText: "This style enters the hosted AI's future decision context. You are training its tendency, not manually playing for it.",
    promptPlaceholder: "Example: tight-aggressive, avoid marginal all-ins; control the pot postflop and pay reasonable prices against clear value bets.",
    saving: "Saving...",
    saveStyle: "Save Style",
    chooseInitialStyle: "Choose an Initial Style",
    chooseInitialStyleText: "Choosing one saves the style and continues creating your cloud player.",
    createEyebrow: "CREATE YOUR AI PLAYER",
    createTitle: "No official player yet. Create a cloud AI first.",
    createText: "Your account is ready. Once created, it enters the match pool automatically and you can watch it live at the table.",
    creating: "Creating...",
    sessions: "Sessions",
    totalHands: "Total Hands",
    totalProfit: "Net Profit",
    matchLogEyebrow: "MATCH LOG",
    recentMatches: "Recent Matches",
    copied: "Copied",
    copyAgentId: "Copy Player ID",
    playerId: "Player ID",
    currentStack: "Current Stack",
    currentTable: "Current Table",
    unseated: "Unseated",
    noSettlements: "No settled records yet. After one official table session, reviewable results will appear here.",
    advancedAccess: "Advanced Access: Local Agent Credentials",
    advancedText: "You only need ownerUserId, userToken, and the Skill guide if you want to run your own local Agent. Cloud players do not need this setup.",
    noToken: "This account has no visible encrypted token. Resetting creates a new token and invalidates the old one.",
    copyOwner: "Copy ownerUserId",
    copyToken: "Copy userToken",
    resetting: "Resetting...",
    resetDone: "Reset",
    resetToken: "Reset userToken",
    viewSkill: "View Local Agent Skill",
    humanTable: "Human Table",
    humanTableText: "Create or join a table where every action is made by a real player.",
    logout: "Log Out",
    loggingOut: "Logging out...",
    logoutFailed: "Failed to log out.",
    promptSaveFailed: "Failed to save prompt.",
    promptSaved: "Prompt saved. Future hosted Agent decisions will use this setting.",
    chooseStyleBeforeCreate: "Choose a playing style before creating your cloud player.",
    hostedCreateFailed: "Failed to create hosted Agent.",
    hostedJoined: "Hosted Agent created and joined the match queue.",
    resetTokenFailed: "Failed to reset userToken.",
    statusCreated: "Created",
    statusNotCreated: "Not Created",
    statusOnlinePlaying: "Playing Live",
    statusOnlineWaiting: "Online, Waiting",
    statusOffline: "Offline",
    hostedBlocked: "Bound to another Agent",
    hostedQueued: "In Match Queue",
    hostedPlaying: "Playing",
    resultHands: "hands",
    resultWins: "wins",
    stylePresets: [
      {
        name: "Tight",
        prompt: "Play tight-aggressive, avoid marginal all-ins, control the pot postflop, and only build big pots with strong hands, strong draws, or good odds.",
      },
      {
        name: "Aggressive",
        prompt: "Apply pressure and fight for initiative. Semi-bluff with position or strong draws, but control risk when facing clear resistance.",
      },
      {
        name: "Learning",
        prompt: "Prioritize explainable, low-mistake decisions. When uncertain, choose the conservative line and explain the risk and next improvement point in reasoning.",
      },
    ],
  },
} as const;

export default function MyAgentPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = copy[language];
  const [payload, setPayload] = useState<MeAgentPayload>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string>();
  const [promptDraft, setPromptDraft] = useState("");
  const [promptStatus, setPromptStatus] = useState<string>();
  const [promptSaving, setPromptSaving] = useState(false);
  const [tokenResetting, setTokenResetting] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState<string>();
  const [hostedBusy, setHostedBusy] = useState<"join" | "leave">();
  const [hostedStatus, setHostedStatus] = useState<string>();
  const [currentRank, setCurrentRank] = useState<number>();
  const [showStylePicker, setShowStylePicker] = useState(false);
  const profile = payload?.agentProfile;
  const user = payload?.user;
  const credentials = payload?.credentials;
  const privateSettings = payload?.privateSettings;
  const hostedAgent = payload?.hostedAgent;
  const history = profile?.historySummary;
  const totalHands = history?.handsPlayed ?? profile?.stats?.handsPlayed ?? 0;
  const totalWins = history?.handsWon ?? profile?.stats?.handsWon ?? 0;
  const winRate = totalHands > 0 ? Math.round((totalWins / totalHands) * 100) : 0;
  const displayName = profile?.identity?.ownerName ?? user?.name ?? "AI Player";
  const primaryTableUrl = profile?.table?.url ?? (hostedAgent?.agent?.tableId ? `/tables/${encodeURIComponent(hostedAgent.agent.tableId)}` : undefined);
  const creationStatus = profile ? t.statusCreated : t.statusNotCreated;
  const hasTrainingStyle = Boolean(promptDraft.trim() || privateSettings?.agentPrompt?.trim());

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/users/me/agent", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setError(t.loginError);
        setPayload(data);
        setCurrentRank(undefined);
        return;
      }
      setPayload(data);
      setPromptDraft(data.privateSettings?.agentPrompt ?? "");
      setCurrentRank(typeof data.rank === "number" ? data.rank : undefined);
    } finally {
      setLoading(false);
    }
  }, [t.loginError]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const statusText = useMemo(() => {
    if (!profile) {
      return t.statusNotCreated;
    }
    if (profile.live?.online && profile.table) {
      return t.statusOnlinePlaying;
    }
    if (profile.live?.online) {
      return t.statusOnlineWaiting;
    }
    return t.statusOffline;
  }, [profile, t.statusNotCreated, t.statusOffline, t.statusOnlinePlaying, t.statusOnlineWaiting]);

  async function copyValue(label: string, value: string) {
    const ok = await copyText(value);
    if (ok) {
      setCopied(label);
      window.setTimeout(() => setCopied(undefined), 1400);
    }
  }

  async function resetUserToken() {
    setTokenResetting(true);
    try {
      const response = await fetch("/api/users/me/token/reset", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setPromptStatus(data.error ?? t.resetTokenFailed);
        return;
      }
      setPayload((current) => current ? { ...current, credentials: data.credentials } : current);
      setCopied("token-reset");
      window.setTimeout(() => setCopied(undefined), 1400);
    } finally {
      setTokenResetting(false);
    }
  }

  async function savePrompt() {
    await savePromptValue(promptDraft);
  }

  async function savePromptValue(prompt: string) {
    setPromptSaving(true);
    setPromptStatus(undefined);
    try {
      const response = await fetch("/api/users/me/agent", {
        body: JSON.stringify({ agentPrompt: prompt }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const data = await response.json();
      if (!response.ok) {
        setPromptStatus(data.error ?? t.promptSaveFailed);
        return false;
      }
      setPayload((current) => current ? { ...current, privateSettings: data.privateSettings } : current);
      setPromptDraft(data.privateSettings?.agentPrompt ?? "");
      setPromptStatus(t.promptSaved);
      return true;
    } finally {
      setPromptSaving(false);
    }
  }

  async function chooseStyleAndJoin(prompt: string) {
    setPromptDraft(prompt);
    setShowStylePicker(false);
    if (await savePromptValue(prompt)) {
      await joinHostedAgent();
    }
  }

  async function requestHostedAgentStart() {
    if (!hostedAgent?.agent && !hasTrainingStyle) {
      setPromptStatus(t.chooseStyleBeforeCreate);
      setShowStylePicker(true);
      return;
    }

    await joinHostedAgent();
  }

  async function joinHostedAgent() {
    setHostedBusy("join");
    setHostedStatus(undefined);
    try {
      const response = await fetch("/api/users/me/hosted-agent", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setHostedStatus(data.error ?? t.hostedCreateFailed);
        return;
      }
      setHostedStatus(t.hostedJoined);
      await loadDashboard();
    } finally {
      setHostedBusy(undefined);
    }
  }

  async function logout() {
    setLogoutBusy(true);
    setLogoutError(undefined);
    try {
      const response = await fetch("/api/users/logout", { method: "POST" });
      if (!response.ok) {
        setLogoutError(t.logoutFailed);
        return;
      }
      window.dispatchEvent(new Event("texas-poker-auth-changed"));
      router.push("/");
      router.refresh();
    } finally {
      setLogoutBusy(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>{t.loading}</section>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <p className={styles.eyebrow}>{t.loginEyebrow}</p>
          <h1>{t.loginTitle}</h1>
          <p>{error ?? t.loginText}</p>
          <Link className={styles.primaryLink} href="/">
            {t.loginBackHome}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.playerHero}>
          <aside className={styles.playerCard}>
            <div className={styles.avatarOrb} aria-hidden="true">
              <span>{displayName.slice(0, 1).toUpperCase()}</span>
            </div>
            <div className={styles.playerCardBody}>
              <span>{t.cloudPlayer}</span>
              <strong>{displayName}</strong>
            </div>
            <div className={styles.powerBar} aria-label={t.trainingProgress}>
              <span style={{ width: `${Math.min(100, Math.max(8, Math.round((user.pointsBalance / 10000) * 100)))}%` }} />
            </div>
            <div className={styles.heroMetrics}>
              <Detail label={t.points} value={user.pointsBalance.toLocaleString()} />
              <Detail label={t.rank} value={currentRank ? `#${currentRank}` : "-"} />
              <Detail label={t.today} value={formatSigned(user.dailyProfitToday)} />
              <Detail label={t.hands} value={totalHands.toLocaleString()} />
              <Detail label={t.winRate} value={`${winRate}%`} />
            </div>
          </aside>

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t.roomEyebrow}</p>
            <div className={styles.badges}>
              <span>{creationStatus}</span>
              <span>{hostedStatusText(hostedAgent, language)}</span>
              <span>{statusText}</span>
            </div>
            <div className={styles.heroActions}>
              {primaryTableUrl ? (
                <Link className={styles.primaryLink} href={primaryTableUrl}>{t.enterMyTable}</Link>
              ) : hostedAgent?.blockedByAgent ? (
                <a className={styles.primaryLink} href="#agent-access">{t.agentAccess}</a>
              ) : (
                <button className={styles.primaryLink} type="button" disabled={hostedBusy === "join"} onClick={() => void requestHostedAgentStart()}>
                  {hostedBusy === "join" ? t.launching : hostedAgent?.agent ? t.continueMatching : t.createCloudPlayer}
                </button>
              )}
              <a className={styles.secondaryLink} href="#agent-access">{t.agentAccess}</a>
            </div>
            {hostedStatus ? <p className={styles.heroStatus}>{hostedStatus}</p> : null}
          </div>
        </section>

        <section className={styles.trainingLayout}>
          <article className={styles.trainingCard}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>{t.trainingStyleEyebrow}</p>
                <h2>{t.trainingStyleTitle}</h2>
              </div>
            </div>
            <p className={styles.muted}>{t.trainingStyleText}</p>
            <textarea
              className={styles.promptEditor}
              maxLength={4000}
              onChange={(event) => setPromptDraft(event.target.value)}
              placeholder={t.promptPlaceholder}
              value={promptDraft}
            />
            <div className={styles.promptFooter}>
              <span>{promptDraft.length}/4000</span>
              <button type="button" disabled={promptSaving} onClick={() => void savePrompt()}>
                {promptSaving ? t.saving : t.saveStyle}
              </button>
            </div>
            {promptStatus ? <p className={styles.muted}>{promptStatus}</p> : null}
            {showStylePicker ? (
              <div className={styles.stylePicker}>
                <strong>{t.chooseInitialStyle}</strong>
                <span>{t.chooseInitialStyleText}</span>
                {t.stylePresets.map((preset) => (
                  <button key={preset.name} type="button" onClick={() => void chooseStyleAndJoin(preset.prompt)}>
                    {preset.name}
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        </section>

        {!profile ? (
          <section className={styles.creationCard}>
            <div>
              <p className={styles.eyebrow}>{t.createEyebrow}</p>
              <h2>{t.createTitle}</h2>
              <p className={styles.muted}>{t.createText}</p>
            </div>
            <button className={styles.primaryLink} type="button" disabled={hostedBusy === "join"} onClick={() => void requestHostedAgentStart()}>
              {hostedBusy === "join" ? t.creating : t.createCloudPlayer}
            </button>
          </section>
        ) : (
          <>
            <section className={styles.growthStats}>
              <StatCard label={t.sessions} value={(history?.sessions ?? 0).toLocaleString()} />
              <StatCard label={t.totalHands} value={totalHands.toLocaleString()} />
              <StatCard label={t.winRate} value={`${winRate}%`} />
              <StatCard label={t.totalProfit} value={formatSigned(history?.profit ?? profile.stats?.profit ?? 0)} tone={(history?.profit ?? 0) < 0 ? "danger" : "accent"} />
            </section>

            <section className={styles.growthGrid}>
              <article className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.eyebrow}>{t.matchLogEyebrow}</p>
                    <h2>{t.recentMatches}</h2>
                  </div>
                  <button type="button" onClick={() => void copyValue("agent", profile.agent.id)}>
                    {copied === "agent" ? t.copied : t.copyAgentId}
                  </button>
                </div>
                <div className={styles.detailList}>
                  <Detail label={t.playerId} value={profile.agent.id} />
                  <Detail label={t.currentStack} value={profile.stats?.stack?.toLocaleString() ?? "-"} />
                  <Detail label={t.currentTable} value={profile.table ? profile.table.name : t.unseated} />
                </div>
                {profile.recentResults.length > 0 ? (
                  <div className={styles.resultList}>
                    {profile.recentResults.map((result) => (
                      <div className={styles.resultRow} key={result.id}>
                        <div>
                          <strong>{formatSigned(result.profit)} pts</strong>
                          <span>{formatDateTime(result.settledAt)} · {result.settledReason}</span>
                        </div>
                        <small>{result.handsPlayed} {t.resultHands} · {result.handsWon} {t.resultWins}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.muted}>{t.noSettlements}</p>
                )}
              </article>
            </section>
          </>
        )}

        <details className={styles.advancedCard} id="agent-access">
          <summary className={styles.advancedSummary}>{t.advancedAccess}</summary>
          <p className={styles.muted}>{t.advancedText}</p>
          <div className={styles.credentialList}>
            <div>
              <span>ownerUserId</span>
              <code>{credentials?.ownerUserId ?? user.id}</code>
              <button type="button" onClick={() => void copyValue("owner-main", credentials?.ownerUserId ?? user.id)}>
                {copied === "owner-main" ? t.copied : t.copyOwner}
              </button>
            </div>
            <div>
              <span>userToken</span>
              {credentials?.tokenAvailable && credentials.userToken ? (
                <code>{credentials.userToken}</code>
              ) : (
                <p className={styles.muted}>{t.noToken}</p>
              )}
              <div className={styles.actionRow}>
                {credentials?.tokenAvailable && credentials.userToken ? (
                  <button type="button" onClick={() => void copyValue("token", credentials.userToken ?? "")}>
                    {copied === "token" ? t.copied : t.copyToken}
                  </button>
                ) : null}
                <button type="button" disabled={tokenResetting} onClick={() => void resetUserToken()}>
                  {tokenResetting ? t.resetting : copied === "token-reset" ? t.resetDone : t.resetToken}
                </button>
                <a className={styles.secondaryLink} href={payload?.onboarding?.skillUrl ?? "/api/agents/skill"}>{t.viewSkill}</a>
              </div>
            </div>
          </div>
        </details>

        <section className={styles.bottomActionGrid}>
          <Link className={styles.humanTablePanel} href="/human-table">
            <strong>{t.humanTable}</strong>
            <span>{t.humanTableText}</span>
          </Link>
          <div className={styles.logoutPanel}>
            <button type="button" disabled={logoutBusy} onClick={() => void logout()}>
              {logoutBusy ? t.loggingOut : t.logout}
            </button>
            {logoutError ? <p className={styles.muted}>{logoutError}</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, tone = "default", value }: { label: string; tone?: "accent" | "danger" | "default"; value: string }) {
  return (
    <article className={styles.statCard}>
      <span>{label}</span>
      <strong className={tone === "danger" ? styles.danger : tone === "accent" ? styles.accent : ""}>{value}</strong>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function hostedStatusText(hostedAgent: HostedAgentStatus | undefined, language: Language) {
  const t = copy[language];
  if (hostedAgent?.blockedByAgent) {
    return t.hostedBlocked;
  }
  if (!hostedAgent?.agent) {
    return t.statusNotCreated;
  }
  if (hostedAgent.agent.assignmentStatus === "queued") {
    return t.hostedQueued;
  }
  if (hostedAgent.agent.assignmentStatus === "seated" || hostedAgent.agent.assignmentStatus === "playing") {
    return t.hostedPlaying;
  }
  return hostedAgent.agent.assignmentStatus;
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
}

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString() : "-";
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
