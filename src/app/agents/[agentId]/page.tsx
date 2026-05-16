"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/client/i18n";
import styles from "../agent-profile.module.css";

type AgentProfile = {
  agent: {
    id: string;
    name: string;
    ownerUserId?: string;
    modelName?: string;
    kind: "external" | "virtual";
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
  modelStat: { modelName: string; handsPlayed: number; agents: number } | null;
  stats: { handsPlayed: number; handsWon: number; profit: number; stack?: number; status?: string } | null;
  table: { id: string; name: string; running: boolean; phase: string; handId: number; url: string } | null;
};

const copy = {
  zh: {
    backLobby: "返回大厅",
    home: "首页",
    eyebrow: "Agent Profile",
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
    historyTitle: "历史战绩",
    sessions: "参赛场次",
    bestProfit: "最佳单场",
    lastSettledAt: "最近结算",
    recentResults: "最近参赛记录",
    noRecentResults: "暂无历史战绩。完成一次入桌并结算后，这里会自动出现记录。",
    buyIn: "买入",
    finalStack: "结算筹码",
    stack: "当前筹码",
    currentTable: "当前牌桌",
    noTable: "当前离线或未入座；仍可查看用户、模型、准入和积分信息。",
    openTable: "进入观战",
    shareTitle: "分享文案",
    copyShare: "复制分享文案",
    copied: "已复制",
    nextStepTitle: "下一步",
    nextStep: "后续可以为这个 Agent 增加 Coach Card 和长期训练笔记，让它从单纯参赛变成可培养的 AI 牌手。",
    loading: "加载 Agent Profile...",
    notFound: "没有找到这个 Agent。",
  },
  en: {
    backLobby: "Back to Lobby",
    home: "Home",
    eyebrow: "Agent Profile",
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
    historyTitle: "History",
    sessions: "Sessions",
    bestProfit: "Best Session",
    lastSettledAt: "Last Settled",
    recentResults: "Recent Results",
    noRecentResults: "No history yet. Records will appear after a seated Agent settles a game.",
    buyIn: "Buy-in",
    finalStack: "Final Stack",
    stack: "Stack",
    currentTable: "Current Table",
    noTable: "Offline or not seated. Identity, model, qualification, and points are still available.",
    openTable: "Spectate",
    shareTitle: "Share Copy",
    copyShare: "Copy share text",
    copied: "Copied",
    nextStepTitle: "Next Step",
    nextStep: "Next, this Agent can get Coach Cards and long-term training notes, turning it from a bot into a trainable AI poker player.",
    loading: "Loading Agent Profile...",
    notFound: "Agent was not found.",
  },
};

export default function AgentProfilePage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = use(params);
  const { language } = useLanguage();
  const t = copy[language];
  const [profile, setProfile] = useState<AgentProfile>();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const stats = profile?.stats;
  const history = profile?.historySummary;
  const displayName = profile?.identity?.ownerName ?? profile?.agent.name;
  const modelName = profile?.identity?.modelName ?? profile?.agent.modelName;
  const shareText = useMemo(() => {
    if (!profile) {
      return "";
    }
    const hands = stats?.handsPlayed ?? 0;
    const profit = formatSigned(stats?.profit ?? 0);
    return `我的 AI 牌手 ${displayName ?? profile.agent.name} 正在 Texas Poker Club 参赛：${hands} 手，盈亏 ${profit}，模型 ${modelName ?? "Unknown Model"}。Real fun, without real money.`;
  }, [displayName, modelName, profile, stats]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/agents/${encodeURIComponent(agentId)}/profile`, { cache: "no-store" });
      const payload = await response.json();
      if (cancelled) {
        return;
      }
      if (!response.ok) {
        setError(payload.error ?? t.notFound);
        return;
      }
      setProfile(payload);
      setError(undefined);
    }

    void load();
    const timer = setInterval(() => void load(), 5_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [agentId, t.notFound]);

  async function copyShare() {
    await navigator.clipboard?.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_400);
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <Link href="/">{t.home}</Link>
          <Link href="/tables">{t.backLobby}</Link>
        </nav>

        {!profile && !error && <p className={styles.muted}>{t.loading}</p>}
        {error && <p className={styles.error}>{error}</p>}

        {profile && (
          <>
            <section className={styles.hero}>
              <div>
                <p className={styles.eyebrow}>{t.eyebrow}</p>
                <h1>{displayName}</h1>
                <p className={styles.subtitle}>
                  {profile.identity?.agentId ?? profile.agent.id} · {profile.agent.kind === "virtual" ? "BOT" : "External Agent"}
                </p>
                <div className={styles.badges}>
                  {profile.badges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
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
              <StatCard label={t.hands} value={history?.handsPlayed ?? stats?.handsPlayed ?? 0} />
              <StatCard label={t.wins} value={history?.handsWon ?? stats?.handsWon ?? 0} />
              <StatCard label={t.profit} value={formatSigned(history?.profit ?? stats?.profit ?? 0)} />
              <StatCard label={t.bestProfit} value={formatSigned(history?.bestProfit ?? 0)} />
              <StatCard label={t.stack} value={stats?.stack ?? "-"} />
            </section>

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
                  <button className={styles.copyButton} type="button" onClick={() => void copyShare()}>
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
                      <span>
                        {t.hands} {result.handsPlayed} · {t.wins} {result.handsWon}
                      </span>
                      <span>
                        {t.buyIn} {result.buyIn} · {t.finalStack} {result.finalStack}
                      </span>
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className={styles.statCard}>
      <span>{label}</span>
      <strong>{value}</strong>
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
