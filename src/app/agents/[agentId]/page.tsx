"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/lib/client/i18n";
import styles from "../agent-profile.module.css";

type AgentProfile = {
  agent: {
    id: string;
    name: string;
    ownerUserId?: string;
    modelName?: string;
    kind: "external" | "hosted" | "virtual";
    strategy?: string;
    registeredAt: string;
    lastSeenAt?: string;
    tableId?: string;
    assignmentStatus: string;
  };
  badges: string[];
  identity?: {
    profileId: string;
    agentId: string;
    agentName: string;
    ownerUserId?: string;
    ownerName?: string;
    modelName?: string;
    protocolVersion?: string;
    qualifiedAt?: string;
    userCreatedAt?: string;
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
    agentId: string;
    modelName?: string;
    tableId: string;
    gameSessionId?: string;
    buyIn: number;
    finalStack: number;
    profit: number;
    handsPlayed: number;
    handsWon: number;
    settledReason: string;
    settledAt: string;
  }>;
  profileHtml: {
    source: "default" | "custom";
    updatedAt?: string;
    html: string;
  };
  modelStat: { modelName: string; handsPlayed: number; agents: number } | null;
  stats: { handsPlayed: number; handsWon: number; profit: number; stack?: number; status?: string } | null;
  table: { id: string; name: string; running: boolean; phase: string; handId: number; url: string } | null;
};

const copy = {
  zh: {
    backLobby: "返回比赛大厅",
    home: "首页",
    eyebrow: "AI 牌手主页",
    status: "状态",
    liveStatus: "在线状态",
    model: "模型",
    owner: "所属用户",
    registered: "注册时间",
    qualifiedAt: "最近准入",
    points: "可用积分",
    frozen: "冻结积分",
    hands: "参与手数",
    wins: "胜场",
    profit: "盈亏",
    playerCard: "AI 牌手卡",
    defaultCard: "默认模板",
    customCard: "自定义 HTML",
    historyTitle: "牌手战绩",
    sessions: "参赛场次",
    bestProfit: "最佳单场",
    lastSettledAt: "最近结算",
    recentResults: "最近比赛记录",
    noRecentResults: "暂无比赛记录。完成一次入桌并结算后，这里会自动沉淀可复盘的战绩。",
    buyIn: "买入",
    finalStack: "结算筹码",
    stack: "当前筹码",
    currentTable: "当前牌桌",
    noTable: "当前离线或未入座；仍可查看身份、模型、战绩和积分信息。",
    openTable: "进入观战",
    shareTitle: "分享这名 AI 牌手",
    copyShare: "复制分享内容",
    copied: "已复制",
    refreshing: "正在刷新",
    lastUpdated: "最近更新",
    winRate: "胜率",
    performance: "牌手亮点",
    netProfit: "累计盈亏",
    liveNow: "实时在线",
    offline: "离线",
    nextStepTitle: "如何继续参与",
    nextStep: "下一步会把 Coach Card、关键手牌和赛后复盘接入这里，让用户不只是看结果，还能理解它为什么输赢，并为下一场给出策略建议。",
    loading: "加载 AI 牌手主页...",
    notFound: "没有找到这名 AI 牌手。",
  },
  en: {
    backLobby: "Back to Match Lobby",
    home: "Home",
    eyebrow: "AI Player Profile",
    status: "Status",
    liveStatus: "Live Status",
    model: "Model",
    owner: "Owner",
    registered: "Registered",
    qualifiedAt: "Last Qualified",
    points: "Available Points",
    frozen: "Frozen Points",
    hands: "Hands",
    wins: "Wins",
    profit: "P&L",
    playerCard: "AI Player Card",
    defaultCard: "Default Template",
    customCard: "Custom HTML",
    historyTitle: "Player History",
    sessions: "Sessions",
    bestProfit: "Best Session",
    lastSettledAt: "Last Settled",
    recentResults: "Recent Matches",
    noRecentResults: "No match history yet. Reviewable records will appear after this player settles a seated game.",
    buyIn: "Buy-in",
    finalStack: "Final Stack",
    stack: "Stack",
    currentTable: "Current Table",
    noTable: "Offline or not seated. Identity, model, history, and points are still available.",
    openTable: "Spectate",
    shareTitle: "Share This AI Player",
    copyShare: "Copy share copy",
    copied: "Copied",
    refreshing: "Refreshing",
    lastUpdated: "Last Updated",
    winRate: "Win Rate",
    performance: "Player Highlights",
    netProfit: "Net Profit",
    liveNow: "Live Now",
    offline: "Offline",
    nextStepTitle: "How to Stay Involved",
    nextStep: "Next, Coach Cards, key hands, and post-game reviews can live here so users understand why the player won or lost and can give better advice before the next match.",
    loading: "Loading AI player profile...",
    notFound: "AI player was not found.",
  },
};

export default function AgentProfilePage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params);
  const { language } = useLanguage();
  const t = copy[language];
  const [profile, setProfile] = useState<AgentProfile>();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>();
  const [profileFrameHeight, setProfileFrameHeight] = useState(520);
  const loadingRef = useRef(false);
  const profileFrameRef = useRef<HTMLIFrameElement>(null);
  const stats = profile?.stats;
  const history = profile?.historySummary;
  const displayName = profile?.identity?.ownerName ?? profile?.agent.name;
  const modelName = profile?.identity?.modelName ?? profile?.agent.modelName;
  const totalHands = history?.handsPlayed ?? stats?.handsPlayed ?? 0;
  const totalWins = history?.handsWon ?? stats?.handsWon ?? 0;
  const winRate = totalHands > 0 ? Math.round((totalWins / totalHands) * 100) : 0;
  const profitValue = history?.profit ?? stats?.profit ?? 0;
  const isOnline = profile?.live?.online ?? false;
  const shareText = useMemo(() => {
    if (!profile) {
      return "";
    }
    const hands = history?.handsPlayed ?? stats?.handsPlayed ?? 0;
    const profit = formatSigned(history?.profit ?? stats?.profit ?? 0);
    return `我的 AI 牌手 ${displayName ?? profile.agent.name} 正在 Texas Poker Club 参赛：${hands} 手，累计盈亏 ${profit}，模型 ${modelName ?? "Unknown Model"}。围观、复盘、继续调教它：Real fun, without real money.`;
  }, [displayName, history, modelName, profile, stats]);

  const loadProfile = useCallback(
    async ({ signal, silent = false }: { signal?: AbortSignal; silent?: boolean } = {}) => {
      if (loadingRef.current) {
        return;
      }
      loadingRef.current = true;
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(undefined);
        setProfile(undefined);
      }

      try {
        const response = await fetch(`/api/agents/${encodeURIComponent(agentId)}/profile`, { cache: "no-store", signal });
        const payload = await response.json();
        if (signal?.aborted) {
          return;
        }
        if (!response.ok) {
          setError(payload.error ?? t.notFound);
          setProfile(undefined);
          return;
        }
        setProfile(payload);
        setError(undefined);
        setLastUpdatedAt(new Date().toISOString());
      } catch (fetchError) {
        if (signal?.aborted) {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : t.notFound);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
        loadingRef.current = false;
      }
    },
    [agentId, t.notFound],
  );

  const resizeProfileFrame = useCallback(() => {
    const frame = profileFrameRef.current;
    const frameDocument = frame?.contentDocument;
    if (!frameDocument) {
      return;
    }

    const nextHeight = Math.max(
      460,
      frameDocument.documentElement.scrollHeight,
      frameDocument.body.scrollHeight,
      frameDocument.documentElement.offsetHeight,
      frameDocument.body.offsetHeight,
    );
    setProfileFrameHeight(nextHeight + 2);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadProfile({ signal: controller.signal }));
    const timer = setInterval(() => void loadProfile({ signal: controller.signal, silent: true }), 15_000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [loadProfile]);

  async function copyShare() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1_400);
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        {loading && !profile && !error && <p className={styles.loading}>{t.loading}</p>}
        {error && <p className={styles.error}>{error}</p>}

        {profile && (
          <>
            <section className={styles.hero}>
              <div>
                <div className={styles.heroTopline}>
                  <p className={styles.eyebrow}>{t.eyebrow}</p>
                  <span className={isOnline ? styles.onlinePill : styles.offlinePill}>
                    {isOnline ? t.liveNow : t.offline}
                  </span>
                </div>
                <h1>{displayName}</h1>
                <p className={styles.subtitle}>
                  {profile.identity?.agentId ?? profile.agent.id} · {profile.agent.kind === "virtual" ? "BOT" : "External Agent"}
                </p>
                <div className={styles.badges}>
                  {profile.badges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
                <p className={styles.refreshMeta}>
                  {refreshing ? t.refreshing : `${t.lastUpdated}: ${formatDateTime(lastUpdatedAt)}`}
                </p>
              </div>
              <div className={styles.profileMeta}>
                <article>
                  <span>{t.liveStatus}</span>
                  <strong>{profile.live?.assignmentStatus ?? profile.agent.assignmentStatus}</strong>
                </article>
                <article>
                  <span>{t.model}</span>
                  <strong>{modelName ?? "Unknown Model"}</strong>
                </article>
                <article>
                  <span>{t.owner}</span>
                  <strong>{profile.identity?.ownerName ?? profile.identity?.ownerUserId ?? profile.agent.ownerUserId ?? "-"}</strong>
                </article>
                <article>
                  <span>{profile.identity?.qualifiedAt ? t.qualifiedAt : t.registered}</span>
                  <strong>{formatDate(profile.identity?.qualifiedAt ?? profile.agent.registeredAt)}</strong>
                </article>
              </div>
            </section>

            <section className={styles.grid}>
              <StatCard label={t.points} value={formatOptionalNumber(profile.identity?.pointsBalance)} />
              <StatCard label={t.frozen} value={formatOptionalNumber(profile.identity?.frozenPoints)} />
              <StatCard label={t.sessions} value={history?.sessions ?? 0} />
              <StatCard label={t.hands} value={totalHands} />
              <StatCard label={t.wins} value={totalWins} />
              <StatCard label={t.winRate} value={`${winRate}%`} />
              <StatCard label={t.profit} value={formatSigned(profitValue)} tone={profitValue < 0 ? "negative" : "positive"} />
              <StatCard label={t.bestProfit} value={formatSigned(history?.bestProfit ?? 0)} />
            </section>

            <section className={styles.performanceCard}>
              <div>
                <span>{t.performance}</span>
                <strong>{totalHands > 0 ? `${totalWins}/${totalHands}` : "-"}</strong>
                <small>{t.wins} / {t.hands}</small>
              </div>
              <div>
                <span>{t.netProfit}</span>
                <strong className={profitValue < 0 ? styles.negative : styles.positive}>{formatSigned(profitValue)}</strong>
                <small>{t.bestProfit}: {formatSigned(history?.bestProfit ?? 0)}</small>
              </div>
              <div>
                <span>{t.stack}</span>
                <strong>{stats?.stack ?? "-"}</strong>
                <small>{stats?.status ?? profile.live?.assignmentStatus ?? profile.agent.assignmentStatus}</small>
              </div>
            </section>

            <article className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>{t.playerCard}</h2>
                  <p className={styles.muted}>
                    {profile.profileHtml.source === "custom" ? t.customCard : t.defaultCard}
                    {profile.profileHtml.updatedAt ? ` · ${formatDateTime(profile.profileHtml.updatedAt)}` : ""}
                  </p>
                </div>
              </div>
              <iframe
                ref={profileFrameRef}
                className={styles.profileFrame}
                onLoad={() => {
                  resizeProfileFrame();
                  window.setTimeout(resizeProfileFrame, 80);
                }}
                sandbox="allow-same-origin"
                scrolling="no"
                srcDoc={profile.profileHtml.html}
                style={{ height: profileFrameHeight }}
                title={`${displayName} profile card`}
              />
            </article>

            <section className={styles.contentGrid}>
              <article className={styles.card}>
                <h2>{t.currentTable}</h2>
                {profile.table ? (
                  <Link className={styles.tableLink} href={`/tables/${profile.table.id}`}>
                    <span>
                      {profile.table.name} · {profile.table.phase} · Hand #{profile.table.handId}
                    </span>
                    <strong>{t.openTable}</strong>
                  </Link>
                ) : (
                  <p className={styles.muted}>{t.noTable}</p>
                )}
              </article>

              <article className={styles.card}>
                <h2>{t.shareTitle}</h2>
                <div className={styles.shareBox}>
                  <p className={styles.shareText}>{shareText}</p>
                  <button className={styles.copyButton} type="button" disabled={!shareText} onClick={() => void copyShare()}>
                    {copied ? t.copied : t.copyShare}
                  </button>
                </div>
              </article>
            </section>

            <article className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>{t.historyTitle}</h2>
                  <p className={styles.muted}>
                    {t.lastSettledAt}: {formatDateTime(history?.lastSettledAt)}
                  </p>
                </div>
              </div>
              <h3 className={styles.subheading}>{t.recentResults}</h3>
              <div className={styles.resultList}>
                {profile.recentResults.length > 0 ? (
                  profile.recentResults.map((result) => (
                    <article className={styles.resultRow} key={result.id}>
                      <div>
                        <strong>{formatDateTime(result.settledAt)}</strong>
                        <small>
                          {result.agentId} · {result.modelName ?? "Unknown Model"} · {result.settledReason}
                        </small>
                      </div>
                      <span>{t.hands} {result.handsPlayed} · {t.wins} {result.handsWon}</span>
                      <span>{t.buyIn} {result.buyIn} · {t.finalStack} {result.finalStack}</span>
                      <em className={result.profit < 0 ? styles.negative : styles.positive}>{formatSigned(result.profit)}</em>
                    </article>
                  ))
                ) : (
                  <p className={styles.muted}>{t.noRecentResults}</p>
                )}
              </div>
            </article>

            <article className={styles.card}>
              <h2>{t.nextStepTitle}</h2>
              <p className={styles.muted}>{t.nextStep}</p>
            </article>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, tone, value }: { label: string; tone?: "positive" | "negative"; value: string | number }) {
  return (
    <article className={styles.statCard}>
      <span>{label}</span>
      <strong className={tone === "negative" ? styles.negative : undefined}>{value}</strong>
    </article>
  );
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
}

function formatOptionalNumber(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "-";
}

function formatDate(value: string | undefined) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function formatDateTime(value: string | undefined) {
  return value ? new Date(value).toLocaleString() : "-";
}
