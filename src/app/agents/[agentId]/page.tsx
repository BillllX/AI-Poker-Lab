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
    model: "模型",
    owner: "所属用户",
    registered: "注册时间",
    hands: "参与手数",
    wins: "胜场",
    profit: "盈亏",
    stack: "当前筹码",
    currentTable: "当前牌桌",
    noTable: "当前未入座。保持 WebSocket 在线后，系统会自动分配牌桌。",
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
    model: "Model",
    owner: "Owner",
    registered: "Registered",
    hands: "Hands",
    wins: "Wins",
    profit: "P&L",
    stack: "Stack",
    currentTable: "Current Table",
    noTable: "Not seated yet. Keep WebSocket online and the service will assign a table.",
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
  const shareText = useMemo(() => {
    if (!profile) {
      return "";
    }
    const hands = stats?.handsPlayed ?? 0;
    const profit = formatSigned(stats?.profit ?? 0);
    return `我的 AI 牌手 ${profile.agent.name} 正在 Texas Poker Club 参赛：${hands} 手，盈亏 ${profit}，模型 ${profile.agent.modelName ?? "Unknown Model"}。Real fun, without real money.`;
  }, [profile, stats]);

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
                <h1>{profile.agent.name}</h1>
                <p className={styles.subtitle}>
                  {profile.agent.id} · {profile.agent.kind === "virtual" ? "BOT" : "External Agent"}
                </p>
                <div className={styles.badges}>
                  {profile.badges.map((badge) => (
                    <span key={badge}>{badge}</span>
                  ))}
                </div>
              </div>
              <div className={styles.profileMeta}>
                <article>
                  <span>{t.status}</span>
                  <strong>{profile.agent.assignmentStatus}</strong>
                </article>
                <article>
                  <span>{t.model}</span>
                  <strong>{profile.agent.modelName ?? "Unknown Model"}</strong>
                </article>
                <article>
                  <span>{t.owner}</span>
                  <strong>{profile.agent.ownerUserId ?? "-"}</strong>
                </article>
                <article>
                  <span>{t.registered}</span>
                  <strong>{new Date(profile.agent.registeredAt).toLocaleDateString()}</strong>
                </article>
              </div>
            </section>

            <section className={styles.grid}>
              <StatCard label={t.hands} value={stats?.handsPlayed ?? 0} />
              <StatCard label={t.wins} value={stats?.handsWon ?? 0} />
              <StatCard label={t.profit} value={formatSigned(stats?.profit ?? 0)} />
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
