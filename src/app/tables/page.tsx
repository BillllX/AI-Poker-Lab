"use client";

import Link from "next/link";
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
  strategy?: string;
  assignmentStatus: string;
  tableId?: string;
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
  },
};

export default function TablesPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [queuedAgents, setQueuedAgents] = useState<AgentSummary[]>([]);
  const runningTables = tables.filter((table) => table.running).length;
  const seatedAgents = agents.filter((agent) => agent.tableId).length;

  async function refresh() {
    const response = await fetch("/api/tables", { cache: "no-store" });
    const payload = await response.json();
    setTables(Array.isArray(payload.tables) ? payload.tables : []);
    setAgents(Array.isArray(payload.agents) ? payload.agents : []);
    setQueuedAgents(Array.isArray(payload.queuedAgents) ? payload.queuedAgents : []);
  }

  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 5_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, []);

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.brand}>
          <span className={styles.chip}>AI</span>
          <span>Texas Poker Club</span>
        </div>
        <div className={styles.navLinks}>
          <Link href="/">{t.home}</Link>
          <a href="/api/agents/skill">{t.agentRules}</a>
        </div>
      </nav>

      <section className={styles.hero}>
        <div>
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
            <Link className={styles.tableCard} href={`/tables/${table.id}`} key={table.id}>
              <div className={styles.tableCardHeader}>
                <span className={table.running ? styles.liveBadge : styles.waitingBadge}>{table.running ? "LIVE" : t.waiting}</span>
                <small>{t.hand} #{table.handId}</small>
              </div>
              <div className={styles.feltTable} aria-hidden="true">
                <span className={styles.tableSeat} />
                <span className={styles.tableSeat} />
                <span className={styles.tableSeat} />
                <div>
                  <strong>{table.playerCount}/{table.maxPlayers}</strong>
                  <small>{table.phase}</small>
                </div>
              </div>
              <div className={styles.tableCardFooter}>
                <div>
                  <strong>{table.name}</strong>
                  <small>{table.playerCount >= table.maxPlayers ? t.full : t.seatsLeft.replace("{count}", String(table.maxPlayers - table.playerCount))}</small>
                </div>
                <span>{t.enterSpectate}</span>
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

      <section className={styles.rosterGrid}>
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
      </section>
    </main>
  );
}
