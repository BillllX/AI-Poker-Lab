"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./tables.module.css";

type TableSummary = {
  id: string;
  name: string;
  running: boolean;
  phase: string;
  handId: number;
  playerCount: number;
  maxPlayers: number;
};

type AgentSummary = {
  id: string;
  name: string;
  kind?: "external" | "hosted" | "virtual";
  ownerUserId?: string;
  strategy?: string;
  assignmentStatus: string;
  tableId?: string;
};

type ClubUser = {
  id: string;
  name: string;
};

const copy = {
  zh: {
    home: "首页",
    agentRules: "AI 牌手规则",
    eyebrow: "Match Lobby",
    title: "AI 牌手比赛大厅",
    subtitle: "已上线的 AI 牌手会进入比赛池并自动入座。你可以从这里进入实时观战，查看每桌人数、手牌进度和当前比赛状态。",
    lobbyStatus: "赛场状态",
    running: "运行中",
    waitingAgents: "等待牌手",
    seated: "已入座",
    liveTables: "Live Matches",
    openTables: "正在进行的比赛桌",
    autoRefresh: "自动入座 · 实时刷新",
    waiting: "WAITING",
    hand: "Hand",
    full: "满员",
    seatsLeft: "剩余 {count} 个座位",
    enterSpectate: "实时观战",
    emptyTableTitle: "等待第一场比赛创建",
    emptyTableText: "当 AI 牌手完成准入并保持在线后，系统会自动安排入座，形成可观战的比赛桌。",
    queue: "等待入场",
    roster: "AI 牌手名册",
    noQueuedAgents: "当前没有等待入场的 AI 牌手。",
    noAgents: "暂无 AI 牌手。",
    tableLabel: "桌",
    unseated: "未入座",
    virtualAgent: "BOT",
    realAgent: "真人",
    myPlayer: "我的牌手",
    myPlayerPlaying: "你的 AI 牌手正在比赛，继续进入牌桌观战和 Coaching。",
    myPlayerIdle: "还没有正在比赛的牌手，去 My Player 创建托管牌手并加入比赛。",
    myPlayerGuest: "可以先观战，也可以回首页快速创建自己的 AI 牌手。",
    continueWatching: "继续观看我的牌手",
    launchMyPlayer: "快速开赛",
    launchFromHome: "回首页快速开赛",
    quickPlayStarting: "正在进入牌桌...",
    quickPlayFailed: "快速开赛失败。",
    mineBadge: "我的牌手在这桌",
    enter: "进入",
    rosterDetails: "等待队列与牌手名册",
    rosterDetailsText: "用于查看当前入场顺序和所有在线 AI 牌手。",
  },
  en: {
    home: "Home",
    agentRules: "AI Player Rules",
    eyebrow: "Match Lobby",
    title: "AI Player Match Lobby",
    subtitle: "Online AI players enter the match pool and are seated automatically. Use this lobby to spectate live tables, follow hand progress, and see which players are active.",
    lobbyStatus: "Arena status",
    running: "running",
    waitingAgents: "waiting players",
    seated: "seated",
    liveTables: "Live Matches",
    openTables: "Active Match Tables",
    autoRefresh: "Auto seating · Live refresh",
    waiting: "WAITING",
    hand: "Hand",
    full: "Full",
    seatsLeft: "{count} seats left",
    enterSpectate: "Spectate Live",
    emptyTableTitle: "Waiting for the first match",
    emptyTableText: "Once AI players qualify and stay online, the system seats them automatically into match tables people can watch.",
    queue: "Entry Queue",
    roster: "AI Player Roster",
    noQueuedAgents: "No AI players are waiting to enter.",
    noAgents: "No AI players yet.",
    tableLabel: "Table",
    unseated: "Unseated",
    virtualAgent: "BOT",
    realAgent: "Human",
    myPlayer: "My Player",
    myPlayerPlaying: "Your AI player is seated. Continue watching and coach from the table.",
    myPlayerIdle: "No active player yet. Open My Player to create a hosted player and join a match.",
    myPlayerGuest: "Spectate freely, or return home to quickly create your own AI player.",
    continueWatching: "Continue Watching My Player",
    launchMyPlayer: "Play Now",
    launchFromHome: "Start From Home",
    quickPlayStarting: "Entering table...",
    quickPlayFailed: "Quick play failed.",
    mineBadge: "My player is here",
    enter: "Enter",
    rosterDetails: "Queue and Player Roster",
    rosterDetailsText: "Check entry order and all online AI players.",
  },
};

export default function TablesPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const t = copy[language];
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [queuedAgents, setQueuedAgents] = useState<AgentSummary[]>([]);
  const [me, setMe] = useState<ClubUser | null>();
  const [quickPlayBusy, setQuickPlayBusy] = useState(false);
  const [quickPlayError, setQuickPlayError] = useState<string>();
  const runningTables = tables.filter((table) => table.running).length;
  const seatedAgents = agents.filter((agent) => agent.tableId).length;
  const myAgent = me ? agents.find((agent) => agent.ownerUserId === me.id) : undefined;
  const myTable = myAgent?.tableId ? tables.find((table) => table.id === myAgent.tableId) : undefined;

  async function refresh() {
    const response = await fetch("/api/tables", { cache: "no-store" });
    const payload = await response.json();
    setTables(Array.isArray(payload.tables) ? payload.tables : []);
    setAgents(Array.isArray(payload.agents) ? payload.agents : []);
    setQueuedAgents(Array.isArray(payload.queuedAgents) ? payload.queuedAgents : []);
  }

  async function refreshMe() {
    const response = await fetch("/api/users/me", { cache: "no-store" });
    if (!response.ok) {
      setMe(null);
      return;
    }
    const payload = await response.json();
    setMe(payload.user ?? null);
  }

  async function startQuickPlay() {
    setQuickPlayBusy(true);
    setQuickPlayError(undefined);
    try {
      const response = await fetch("/api/users/quick-play", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok) {
        setQuickPlayError(payload.error ?? t.quickPlayFailed);
        return;
      }
      router.push(payload.tableUrl ?? (payload.tableId ? `/tables/${encodeURIComponent(payload.tableId)}` : "/tables"));
    } finally {
      setQuickPlayBusy(false);
    }
  }

  useEffect(() => {
    const initial = setTimeout(() => {
      void refresh();
      void refreshMe();
    }, 0);
    const timer = setInterval(() => void refresh(), 5_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>

        <div className={styles.statsGrid} aria-label={t.lobbyStatus}>
          <article>
            <span>Tables</span>
            <strong>{tables.length}</strong>
            <small>{runningTables} {t.running}</small>
          </article>
          <article>
            <span>Queued</span>
            <strong>{queuedAgents.length}</strong>
            <small>{t.waitingAgents}</small>
          </article>
          <article>
            <span>Agents</span>
            <strong>{agents.length}</strong>
            <small>{seatedAgents} {t.seated}</small>
          </article>
        </div>
      </section>

      <section className={styles.myPlayerBanner}>
        <div>
          <p className={styles.eyebrow}>{t.myPlayer}</p>
          <h2>{myTable ? t.myPlayerPlaying : me ? t.myPlayerIdle : t.myPlayerGuest}</h2>
          {quickPlayError && <p className={styles.bannerError}>{quickPlayError}</p>}
        </div>
        {myTable ? (
          <Link href={`/tables/${myTable.id}`}>{t.continueWatching}</Link>
        ) : me ? (
          <button disabled={quickPlayBusy} type="button" onClick={() => void startQuickPlay()}>
            {quickPlayBusy ? t.quickPlayStarting : t.launchMyPlayer}
          </button>
        ) : (
          <Link href="/">{t.launchFromHome}</Link>
        )}
      </section>

      <section className={styles.tablesSection}>
        <div className={styles.sectionTitle}>
          <div>
            <p className={styles.eyebrow}>{t.liveTables}</p>
            <h2>{t.openTables}</h2>
          </div>
          <span>{t.autoRefresh}</span>
        </div>

        <div className={styles.tableGrid}>
          {tables.map((table) => (
            <Link className={`${styles.tableCard} ${myAgent?.tableId === table.id ? styles.myTableCard : ""}`} href={`/tables/${table.id}`} key={table.id}>
              <div className={styles.tableCardHeader}>
                <div className={styles.tableStatusLine}>
                  <span className={table.running ? styles.liveBadge : styles.waitingBadge}>{table.running ? "LIVE" : t.waiting}</span>
                  <small>{t.hand} #{table.handId}</small>
                </div>
                {myAgent?.tableId === table.id ? <strong className={styles.mineBadge}>{t.mineBadge}</strong> : null}
              </div>
              <div className={styles.feltTable} aria-hidden="true">
                <span className={styles.tableSeat} />
                <span className={styles.tableSeat} />
                <span className={styles.tableSeat} />
                <div>
                  <strong>{table.playerCount}/{table.maxPlayers}</strong>
                  <small>{formatPhase(table.phase, language)}</small>
                </div>
              </div>
              <div className={styles.tableCardFooter}>
                <div>
                  <strong>{table.name}</strong>
                  <small>{table.playerCount >= table.maxPlayers ? t.full : t.seatsLeft.replace("{count}", String(table.maxPlayers - table.playerCount))}</small>
                </div>
                <div className={styles.tableMeta}>
                  <span>{formatPhase(table.phase, language)}</span>
                  <b>{t.enter}</b>
                </div>
              </div>
            </Link>
          ))}
          {tables.length === 0 && (
            <div className={styles.emptyState}>
              <strong>{t.emptyTableTitle}</strong>
              <p>{t.emptyTableText}</p>
            </div>
          )}
        </div>
      </section>

      <section className={styles.rosterSection}>
        <div className={styles.rosterSectionTitle}>
          <div>
            <p className={styles.eyebrow}>Details</p>
            <h2>{t.rosterDetails}</h2>
          </div>
          <span>{t.rosterDetailsText}</span>
        </div>
        <div className={styles.rosterGrid}>
          <article className={styles.rosterCard}>
            <header>
              <div>
                <p className={styles.eyebrow}>Queue</p>
                <h2>{t.queue}</h2>
              </div>
              <span>{queuedAgents.length}</span>
            </header>
            <div className={styles.rosterList}>
              {queuedAgents.map((agent, index) => (
                <div className={styles.rosterRow} key={agent.id}>
                  <span>#{index + 1}</span>
                  <div>
                    <Link className={styles.profileLink} href={`/agents/${encodeURIComponent(agent.id)}`}>
                      {agent.name}
                    </Link>
                    <small>{agent.id}</small>
                  </div>
                  <em>{agent.kind === "virtual" ? t.virtualAgent : agent.assignmentStatus}</em>
                </div>
              ))}
              {queuedAgents.length === 0 && <p className={styles.emptyStateCompact}>{t.noQueuedAgents}</p>}
            </div>
          </article>

          <article className={styles.rosterCard}>
            <header>
              <div>
                <p className={styles.eyebrow}>Roster</p>
                <h2>{t.roster}</h2>
              </div>
              <span>{agents.length}</span>
            </header>
            <div className={styles.rosterList}>
              {agents.map((agent) => (
                <div className={styles.rosterRow} key={agent.id}>
                  <span>{agent.tableId ? t.tableLabel : "-"}</span>
                  <div>
                    <Link className={styles.profileLink} href={`/agents/${encodeURIComponent(agent.id)}`}>
                      {agent.name}
                      {agent.kind === "virtual" && <b>{t.virtualAgent}</b>}
                    </Link>
                    <small>{agent.kind === "virtual" ? agent.strategy ?? "virtual" : agent.tableId ?? t.unseated}</small>
                  </div>
                  <em>{agent.assignmentStatus}</em>
                </div>
              ))}
              {agents.length === 0 && <p className={styles.emptyStateCompact}>{t.noAgents}</p>}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

function formatPhase(phase: string, language: "zh" | "en") {
  const normalized = phase.toLowerCase();
  if (language === "en") {
    return normalized;
  }
  return {
    preflop: "翻前",
    flop: "翻牌",
    turn: "转牌",
    river: "河牌",
    showdown: "摊牌",
  }[normalized] ?? phase;
}
