"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage, type Language } from "@/lib/client/i18n";
import type { Card, GameSnapshot, PublicPlayerState } from "@/lib/poker/types";
import styles from "./table.module.css";

type RegisteredAgent = {
  id: string;
  name: string;
  kind?: "external" | "virtual";
  strategy?: string;
  ownerUserId?: string;
  modelName?: string;
  registeredAt: string;
  lastSeenAt?: string;
};

const copy = {
  zh: {
    eyebrow: "Texas Poker Agent Arena",
    title: "牌桌视图",
    subtitle: "Agent 通过轮询参与游戏，监控台负责开始与停止会话。",
    operationFailed: "操作失败",
    registerFailed: "Agent 注册失败",
    instructionFailed: "追加提示失败",
    start: "开始",
    stop: "停止会话",
    reset: "重置牌局",
    lifecycleRunning: "运行中",
    lifecycleSettled: "已停止 / 已结算",
    lifecycleWaitingAgents: "等待至少 2 个 Agent 入座",
    lifecycleWaitingStart: "等待 Agent 开始轮询后自动开局",
    pot: "底池",
    waitingCommunity: "等待公共牌",
    hand: "手牌",
    currentBet: "当前注额",
    waitingAgents: "等待 Agent 入座",
    actionLog: "行动日志",
    noActions: "还没有行动。",
    stats: "统计",
    modelStats: "模型手数",
    wins: "胜",
    hands: "手",
    agents: "Agent 数",
    profit: "盈亏",
    chipChange: "筹码变化",
    joinTitle: "Agent 入座",
    joinText: "Agent 先完成 qualification 自检取得 token；注册后必须开始轮询，服务端确认轮询后才会落座；至少 2 个已轮询 Agent 会自动开局。",
    displayName: "显示名称",
    modelName: "大模型名称，例如 gpt-4.1 / claude-3.7-sonnet",
    joinTable: "加入牌桌",
    ownerMissing: "Owner 未绑定",
    lastSeen: "最近轮询",
    pollingReady: "已轮询，可入座",
    pollingWaiting: "等待轮询",
    neverSeen: "尚未轮询",
    noAgents: "暂无 Agent。",
    selectAgent: "选择要提醒的 Agent",
    instructionPlaceholder: "运行中提示，例如：下一次决策前必须重新读取 runtime instructions 并调用 LLM",
    addInstruction: "追加提示",
    thinking: "等待决策",
    stack: "筹码",
    bet: "下注",
    action: "动作",
    waiting: "等待",
    virtualAgent: "BOT",
    status: {
      active: "active",
      folded: "folded",
      "all-in": "all-in",
      out: "out",
    },
  },
  en: {
    eyebrow: "Texas Poker Agent Arena",
    title: "Table View",
    subtitle: "Agents play through polling; the table starts automatically after enough polling Agents are ready.",
    operationFailed: "Operation failed",
    registerFailed: "Agent registration failed",
    instructionFailed: "Failed to add instruction",
    start: "Start",
    stop: "Stop Session",
    reset: "Reset Table",
    lifecycleRunning: "Running",
    lifecycleSettled: "Stopped / Settled",
    lifecycleWaitingAgents: "Waiting for at least 2 Agents",
    lifecycleWaitingStart: "Waiting for Agents to poll before auto-start",
    pot: "Pot",
    waitingCommunity: "Waiting for community cards",
    hand: "Hand",
    currentBet: "Current bet",
    waitingAgents: "Waiting for Agents",
    actionLog: "Action Log",
    noActions: "No actions yet.",
    stats: "Stats",
    modelStats: "Model Hands",
    wins: "Wins",
    hands: "Hands",
    agents: "Agents",
    profit: "Profit",
    chipChange: "Chip Δ",
    joinTitle: "Agent Seating",
    joinText: "Agents must pass qualification first. After registration, they must start polling before they are seated; at least two polling Agents auto-start the game.",
    displayName: "Display name",
    modelName: "Model name, e.g. gpt-4.1 / claude-3.7-sonnet",
    joinTable: "Join Table",
    ownerMissing: "Owner missing",
    lastSeen: "Last poll",
    pollingReady: "Polling, seated",
    pollingWaiting: "Waiting for poll",
    neverSeen: "Not seen yet",
    noAgents: "No Agents yet.",
    selectAgent: "Select an Agent to coach",
    instructionPlaceholder: "Runtime note, e.g. reread runtime instructions and call the LLM before the next decision",
    addInstruction: "Add Note",
    thinking: "Thinking",
    stack: "Stack",
    bet: "Bet",
    action: "Action",
    waiting: "Waiting",
    virtualAgent: "BOT",
    status: {
      active: "active",
      folded: "folded",
      "all-in": "all-in",
      out: "out",
    },
  },
};

const initialStack = 1_000;

export default function TablePage() {
  const { language, setLanguage } = useLanguage();
  const t = copy[language];
  const [state, setState] = useState<GameSnapshot>();
  const [agents, setAgents] = useState<RegisteredAgent[]>([]);
  const [pollingAgentIds, setPollingAgentIds] = useState<Set<string>>(new Set());
  const [busyAction, setBusyAction] = useState<string>();
  const [agentId, setAgentId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [modelName, setModelName] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [userToken, setUserToken] = useState("");
  const [qualificationToken, setQualificationToken] = useState("");
  const [instructionAgentId, setInstructionAgentId] = useState("");
  const [instructionMessage, setInstructionMessage] = useState("");
  const [error, setError] = useState<string>();

  const players = useMemo(() => state?.players ?? [], [state]);
  const currentPlayerId = state?.currentPlayerId;

  async function refreshState() {
    const gameResponse = await fetch("/api/game/state", { cache: "no-store" });
    setState(await gameResponse.json());
  }

  async function refreshRoster() {
    const rosterResponse = await fetch("/api/agents/roster", { cache: "no-store" });
    const rosterPayload = await rosterResponse.json();
    setAgents(rosterPayload.agents);
    setPollingAgentIds(new Set((rosterPayload.pollingAgents as RegisteredAgent[] | undefined)?.map((agent) => agent.id) ?? []));
    setInstructionAgentId((current) => current || rosterPayload.agents[0]?.id || "");
  }

  async function refresh() {
    await Promise.all([refreshState(), refreshRoster()]);
  }

  async function command(action: "start" | "stop" | "reset") {
    setBusyAction(action);
    setError(undefined);
    try {
      const response = await fetch(`/api/game/${action}`, {
        method: "POST",
        headers: action === "start" ? { "x-dashboard-action": "start-game" } : undefined,
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? t.operationFailed);
        return;
      }

      setState(payload);
      await refresh();
    } finally {
      setBusyAction(undefined);
    }
  }

  async function registerAgent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("register");
    setError(undefined);
    try {
      const response = await fetch("/api/agents/roster", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: agentId, name: agentName, modelName, ownerUserId, userToken, qualificationToken }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? t.registerFailed);
        return;
      }

      setAgentId("");
      setAgentName("");
      setModelName("");
      setOwnerUserId("");
      setUserToken("");
      setQualificationToken("");
      await refresh();
    } finally {
      setBusyAction(undefined);
    }
  }

  async function addRuntimeInstruction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction("runtime-instruction");
    setError(undefined);

    try {
      const response = await fetch("/api/agents/runtime-instructions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: instructionAgentId, message: instructionMessage }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? t.instructionFailed);
        return;
      }

      setInstructionMessage("");
    } finally {
      setBusyAction(undefined);
    }
  }

  useEffect(() => {
    const initial = setTimeout(() => {
      void refreshRoster();
    }, 0);
    const events = new EventSource("/api/game/events");
    events.addEventListener("snapshot", (event) => {
      setState(JSON.parse((event as MessageEvent<string>).data) as GameSnapshot);
    });
    events.onerror = () => {
      void refreshState();
    };
    const timer = setInterval(() => {
      void refreshRoster();
    }, 5_000);

    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      events.close();
    };
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
          <p className={styles.lifecycleStatus}>{lifecycleStatus(state, pollingAgentIds.size, t)}</p>
          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.controls}>
          <div aria-label="Language" className={styles.languageTabs}>
            <button className={language === "zh" ? styles.activeLanguage : ""} type="button" onClick={() => setLanguage("zh")}>
              中文
            </button>
            <button className={language === "en" ? styles.activeLanguage : ""} type="button" onClick={() => setLanguage("en")}>
              EN
            </button>
          </div>
          <button disabled={busyAction === "start" || pollingAgentIds.size < 2} onClick={() => command("start")}>
            {t.start}
          </button>
          <button className="secondary" disabled={busyAction === "stop"} onClick={() => command("stop")}>
            {t.stop}
          </button>
          <button className="danger" disabled={busyAction === "reset"} onClick={() => command("reset")}>
            {t.reset}
          </button>
        </div>
      </section>

      <section className={styles.layout}>
        <div className={styles.tableArea}>
          <div className={styles.table}>
            <div className={styles.tableCenter}>
              <div className={styles.phase}>{state?.phase ?? "preflop"}</div>
              <div className={styles.pot}>
                {t.pot} {state?.pot ?? 0}
              </div>
              <div className={styles.cards}>
                {state?.communityCards.length ? (
                  state.communityCards.map((card, index) => <PlayingCard card={card} key={`${card.rank}${card.suit}${index}`} />)
                ) : (
                  <span className={styles.emptyCards}>{t.waitingCommunity}</span>
                )}
              </div>
              <div className={styles.meta}>
                {t.hand} #{state?.handId ?? 0} · {t.currentBet} {state?.currentBet ?? 0}
              </div>
            </div>

            {players.length === 0 && <div className={styles.emptyTable}>{t.waitingAgents}</div>}
            {players.map((player, index) => (
              <SeatCard
                current={player.id === currentPlayerId}
                key={player.id}
                player={player}
                seatIndex={index}
                text={t}
                totalSeats={Math.max(players.length, 2)}
              />
            ))}
          </div>
        </div>

        <aside className={styles.sidePanel}>
          <section className={styles.panel}>
            <h2>{t.actionLog}</h2>
            <div className={styles.logList}>
              {state?.logs.length ? (
                state.logs.map((log) => (
                  <article className={styles.logItem} key={log.id}>
                    <time>{new Date(log.createdAt).toLocaleTimeString()}</time>
                    <span>{log.message}</span>
                  </article>
                ))
              ) : (
                <p className={styles.muted}>{t.noActions}</p>
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <h2>{t.stats}</h2>
            <div className={styles.stats}>
              {state?.stats.map((stat) => {
                const player = state.players.find((item) => item.id === stat.playerId);
                return (
                  <div className={styles.statRow} key={stat.playerId}>
                    <strong>{player?.name ?? stat.playerId}</strong>
                    <span>
                      {t.wins} {stat.handsWon}
                    </span>
                    <span className={stat.profit >= 0 ? styles.positive : styles.negative}>
                      {t.profit} {stat.profit}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.panel}>
            <h2>{t.modelStats}</h2>
            <div className={styles.stats}>
              {state?.modelStats.map((stat) => (
                <div className={styles.statRow} key={stat.modelName}>
                  <strong>{stat.modelName}</strong>
                  <span>
                    {t.hands} {stat.handsPlayed}
                  </span>
                  <span>
                    {t.agents} {stat.agents}
                  </span>
                </div>
              ))}
              {!state?.modelStats.length && <p className={styles.muted}>{t.noAgents}</p>}
            </div>
          </section>
        </aside>
      </section>

      <section className={styles.joinPanel}>
        <div>
          <h2>{t.joinTitle}</h2>
          <p className={styles.muted}>{t.joinText}</p>
        </div>

        <form className={styles.joinForm} onSubmit={registerAgent}>
          <input onChange={(event) => setAgentId(event.target.value)} placeholder="agent-id" required value={agentId} />
          <input onChange={(event) => setAgentName(event.target.value)} placeholder={t.displayName} value={agentName} />
          <input onChange={(event) => setModelName(event.target.value)} placeholder={t.modelName} required value={modelName} />
          <input onChange={(event) => setOwnerUserId(event.target.value)} placeholder="ownerUserId" required value={ownerUserId} />
          <input onChange={(event) => setUserToken(event.target.value)} placeholder="userToken" required type="password" value={userToken} />
          <input
            onChange={(event) => setQualificationToken(event.target.value)}
            placeholder="qualificationToken"
            required
            value={qualificationToken}
          />
          <button disabled={busyAction === "register"} type="submit">
            {t.joinTable}
          </button>
        </form>

        <div className={styles.roster}>
          {agents.map((agent) => (
            <div className={styles.rosterItem} key={agent.id}>
              <strong>{agent.name}</strong>
              <span>{agent.id}</span>
              <small>{agent.modelName}</small>
              <small>{agent.kind === "virtual" ? `${t.virtualAgent} · ${agent.strategy ?? "virtual"}` : agent.ownerUserId ? `Owner ${agent.ownerUserId}` : t.ownerMissing}</small>
              <small>{pollingAgentIds.has(agent.id) ? t.pollingReady : t.pollingWaiting}</small>
              <small>{agent.lastSeenAt ? `${t.lastSeen} ${new Date(agent.lastSeenAt).toLocaleTimeString()}` : t.neverSeen}</small>
            </div>
          ))}
          {agents.length === 0 && <span className={styles.muted}>{t.noAgents}</span>}
        </div>

        <form className={styles.instructionForm} onSubmit={addRuntimeInstruction}>
          <select
            onChange={(event) => setInstructionAgentId(event.target.value)}
            required
            value={instructionAgentId}
          >
            <option value="">{t.selectAgent}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.id})
              </option>
            ))}
          </select>
          <input
            onChange={(event) => setInstructionMessage(event.target.value)}
            placeholder={t.instructionPlaceholder}
            required
            value={instructionMessage}
          />
          <button disabled={busyAction === "runtime-instruction" || agents.length === 0} type="submit">
            {t.addInstruction}
          </button>
        </form>
      </section>
    </main>
  );
}

function lifecycleStatus(state: GameSnapshot | undefined, pollingAgentCount: number, text: (typeof copy)[Language]) {
  if (pollingAgentCount < 2) {
    return text.lifecycleWaitingAgents;
  }

  if (state?.running) {
    return `${text.lifecycleRunning} · ${pollingAgentCount} ${text.pollingReady}`;
  }

  return state && state.handId > 0 ? text.lifecycleSettled : text.lifecycleWaitingStart;
}

function SeatCard({
  current,
  player,
  seatIndex,
  text,
  totalSeats,
}: {
  current: boolean;
  player: PublicPlayerState;
  seatIndex: number;
  text: (typeof copy)[Language];
  totalSeats: number;
}) {
  const angle = -90 + (360 / totalSeats) * seatIndex;
  const radius = 43;
  const left = 50 + radius * Math.cos((angle * Math.PI) / 180);
  const top = 50 + radius * Math.sin((angle * Math.PI) / 180);

  return (
    <article
      className={`${styles.seat} ${current ? styles.currentSeat : ""} ${styles[`status_${player.status.replace("-", "_")}`] ?? ""}`}
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <div className={styles.seatHeader}>
        <strong>
          {player.name}
          {player.kind === "virtual" && <small>{text.virtualAgent}</small>}
        </strong>
        <div className={styles.seatBadges}>
          {current && <span className={styles.thinkingBadge}>{text.thinking}</span>}
          <span>{text.status[player.status]}</span>
        </div>
      </div>
      <div className={styles.seatMeta}>
        <span>
          {text.stack} {player.stack}
        </span>
        <span>
          {text.bet} {player.currentBet}
        </span>
      </div>
      <div className={`${styles.chipDelta} ${deltaClass(player.stack - initialStack)}`}>
        {text.chipChange} {formatDelta(player.stack - initialStack)}
      </div>
      <div className={styles.holeCards}>
        {player.holeCards?.map((card, index) => <PlayingCard card={card} key={`${player.id}-${index}`} small />)}
      </div>
      <p>
        {text.action}: {player.lastAction ?? text.waiting}
      </p>
    </article>
  );
}

function PlayingCard({ card, small = false }: { card: Card; small?: boolean }) {
  const red = card.suit === "h" || card.suit === "d";
  const suit = { s: "♠", h: "♥", d: "♦", c: "♣" }[card.suit];

  return <span className={`${styles.playingCard} ${small ? styles.smallCard : ""} ${red ? styles.redCard : ""}`}>{`${card.rank}${suit}`}</span>;
}

function formatDelta(delta: number) {
  return delta > 0 ? `+${delta}` : String(delta);
}

function deltaClass(delta: number) {
  if (delta > 0) {
    return styles.positive;
  }

  if (delta < 0) {
    return styles.negative;
  }

  return styles.neutral;
}
