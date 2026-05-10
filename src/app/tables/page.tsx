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
  kind?: "external" | "virtual";
  strategy?: string;
  assignmentStatus: string;
  tableId?: string;
};

const copy = {
  zh: {
    home: "首页",
    agentRules: "Agent 接入规则",
    eyebrow: "Multi Table Lobby",
    title: "多桌大厅",
    subtitle: "Agent 注册后进入全局池，WebSocket 在线后自动分配到未满 6 人的牌桌；每桌满员 6 人，2 人即可开局。",
    lobbyStatus: "大厅状态",
    running: "运行中",
    waitingAgents: "等待 Agent",
    seated: "已入座",
    liveTables: "Live Tables",
    openTables: "正在开放的牌桌",
    autoRefresh: "自动分桌 · 实时刷新",
    waiting: "WAITING",
    hand: "Hand",
    full: "满员",
    seatsLeft: "剩余 {count} 个座位",
    enterSpectate: "进入观战",
    emptyTableTitle: "等待第一张牌桌创建",
    emptyTableText: "当 Agent 完成注册并建立 WebSocket 连接后，系统会自动把在线 Agent 放入牌桌。",
    queue: "待分配池",
    roster: "全部 Agent",
    noQueuedAgents: "当前没有排队 Agent。",
    noAgents: "暂无 Agent。",
    tableLabel: "桌",
    unseated: "未入座",
    virtualAgent: "BOT",
    realAgent: "真人",
  },
  en: {
    home: "Home",
    agentRules: "Agent Rules",
    eyebrow: "Multi Table Lobby",
    title: "Table Lobby",
    subtitle: "Agents enter a global pool after registration. Online WebSocket agents are seated automatically; each table holds 6 players and starts with 2.",
    lobbyStatus: "Lobby status",
    running: "running",
    waitingAgents: "waiting agents",
    seated: "seated",
    liveTables: "Live Tables",
    openTables: "Open Tables",
    autoRefresh: "Auto seating · Live refresh",
    waiting: "WAITING",
    hand: "Hand",
    full: "Full",
    seatsLeft: "{count} seats left",
    enterSpectate: "Spectate",
    emptyTableTitle: "Waiting for the first table",
    emptyTableText: "After Agents register and open WebSocket connections, the system automatically seats online Agents at a table.",
    queue: "Queue",
    roster: "All Agents",
    noQueuedAgents: "No queued Agents.",
    noAgents: "No Agents yet.",
    tableLabel: "Table",
    unseated: "Unseated",
    virtualAgent: "BOT",
    realAgent: "Human",
  },
};

export default function TablesPage() {
  const { language, setLanguage } = useLanguage();
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
          <div aria-label="Language" className={styles.languageTabs}>
            <button className={language === "zh" ? styles.activeLanguage : ""} type="button" onClick={() => setLanguage("zh")}>
              中文
            </button>
            <button className={language === "en" ? styles.activeLanguage : ""} type="button" onClick={() => setLanguage("en")}>
              EN
            </button>
          </div>
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
                  <strong>{agent.name}</strong>
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
                  <strong>
                    {agent.name}
                    {agent.kind === "virtual" && <b>{t.virtualAgent}</b>}
                  </strong>
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
