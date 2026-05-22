"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { use, useEffect, useState } from "react";
import { useLanguage } from "@/lib/client/i18n";
import type { Card, GameSnapshot } from "@/lib/poker/types";
import styles from "../../table/table.module.css";

const copy = {
  zh: {
    eyebrow: "Texas Poker Table",
    running: "运行中",
    waitingStart: "等待开局",
    seats: "seats",
    hand: "hand",
    home: "首页",
    backLobby: "返回大厅",
    pot: "底池",
    waitingCommunity: "等待公共牌",
    emptySeat: "空位",
    waitingAssign: "等待分配",
    stack: "筹码",
    bet: "下注",
    action: "动作",
    waiting: "等待",
    actionLog: "行动日志",
    noActions: "还没有行动。",
    virtualAgent: "BOT",
    currentBet: "当前注额",
    chipChange: "筹码变化",
    players: "玩家",
    profit: "盈亏",
    position: "位置",
    myPlayer: "我的牌手",
    loginToCoach: "登录后，如果你的牌手在本桌，会显示 Coaching 和离桌控制。",
    coaching: "现场 Coaching",
    coachingPlaceholder: "例如：下一手不要 bluff，优先控制底池；强牌再加注。",
    sendCoaching: "发送 Coaching",
    coachingSent: "Coaching 已发送，将从下一手开始生效。",
    coachingFailed: "Coaching 发送失败。",
    leaveTable: "离开牌桌并结算",
    leaveFailed: "离开牌桌失败。",
    leaving: "离开中...",
    hostedAgent: "托管 Agent",
    externalAgent: "本地 Agent",
    coachingHint: "Coaching 只从下一手开始生效，不会改变当前手已经开始的决策。托管 Agent 会由服务器模型读取；本地 Agent 需要保持连接并读取 runtime instructions。",
  },
  en: {
    eyebrow: "Texas Poker Table",
    running: "Running",
    waitingStart: "Waiting to start",
    seats: "seats",
    hand: "hand",
    home: "Home",
    backLobby: "Back to Lobby",
    pot: "Pot",
    waitingCommunity: "Waiting for community cards",
    emptySeat: "Empty Seat",
    waitingAssign: "Waiting for assignment",
    stack: "Stack",
    bet: "Bet",
    action: "Action",
    waiting: "Waiting",
    actionLog: "Action Log",
    noActions: "No actions yet.",
    virtualAgent: "BOT",
    currentBet: "Current bet",
    chipChange: "Chip Changes",
    players: "Players",
    profit: "P&L",
    position: "Position",
    myPlayer: "My Player",
    loginToCoach: "Log in to see coaching and leave controls when your player is seated here.",
    coaching: "Live Coaching",
    coachingPlaceholder: "e.g. Starting next hand, avoid bluffing and control the pot unless clearly strong.",
    sendCoaching: "Send Coaching",
    coachingSent: "Coaching sent. It will apply starting next hand.",
    coachingFailed: "Failed to send coaching.",
    leaveTable: "Leave table and settle",
    leaveFailed: "Failed to leave table.",
    leaving: "Leaving...",
    hostedAgent: "Hosted Agent",
    externalAgent: "Local Agent",
    coachingHint: "Coaching applies from the next hand only. Hosted Agents read it on the server. Local Agents must stay connected and read runtime instructions.",
  },
};

const initialStack = 1_000;

type ClubUser = {
  id: string;
  name: string;
};

export default function TableDetailPage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = use(params);
  const { language } = useLanguage();
  const t = copy[language];
  const [state, setState] = useState<GameSnapshot>();
  const [me, setMe] = useState<ClubUser | null>();
  const [coachingMessage, setCoachingMessage] = useState("");
  const [controlStatus, setControlStatus] = useState<string>();
  const [controlBusy, setControlBusy] = useState<"coaching" | "leave">();
  const players = state?.players ?? [];
  const myPlayer = me ? players.find((player) => player.ownerUserId === me.id) : undefined;

  useEffect(() => {
    const events = new EventSource(`/api/tables/${tableId}/events`);
    events.addEventListener("snapshot", (event) => {
      setState(JSON.parse((event as MessageEvent<string>).data) as GameSnapshot);
    });
    events.onerror = async () => {
      const response = await fetch(`/api/tables/${tableId}/state`, { cache: "no-store" });
      if (response.ok) {
        setState(await response.json());
      }
    };
    return () => events.close();
  }, [tableId]);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      const response = await fetch("/api/users/me", { cache: "no-store" });
      if (cancelled) {
        return;
      }
      if (!response.ok) {
        setMe(null);
        return;
      }
      const payload = await response.json();
      setMe(payload.user ?? null);
    }

    void loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshTableState() {
    const response = await fetch(`/api/tables/${tableId}/state`, { cache: "no-store" });
    if (response.ok) {
      setState(await response.json());
    }
  }

  async function submitCoaching(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!myPlayer || !coachingMessage.trim()) {
      return;
    }

    setControlBusy("coaching");
    setControlStatus(undefined);
    try {
      const response = await fetch("/api/users/me/agent/coaching", {
        body: JSON.stringify({ tableId, message: coachingMessage }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        setControlStatus(payload.error ?? t.coachingFailed);
        return;
      }
      setCoachingMessage("");
      setControlStatus(t.coachingSent);
    } finally {
      setControlBusy(undefined);
    }
  }

  async function leaveMyPlayer() {
    if (!myPlayer || !window.confirm(t.leaveTable)) {
      return;
    }

    setControlBusy("leave");
    setControlStatus(undefined);
    try {
      const response = await fetch("/api/users/me/agent/leave", {
        body: JSON.stringify({ tableId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        setControlStatus(payload.error ?? t.leaveFailed);
        return;
      }
      setControlStatus(payload.removed ? "已离开牌桌并结算。" : "当前没有需要离开的牌手。");
      await refreshTableState();
    } finally {
      setControlBusy(undefined);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1>{state?.tableName ?? tableId}</h1>
          <p className={styles.subtitle}>
            {state?.running ? t.running : t.waitingStart} · {players.length}/6 {t.seats} · {t.hand} #{state?.handId ?? 0}
          </p>
        </div>
        <div className={styles.controls}>
          <Link className="secondary" href="/">{t.home}</Link>
          <Link className="secondary" href="/tables">{t.backLobby}</Link>
        </div>
      </section>

      <section className={styles.layout}>
        <div className={styles.tableArea}>
          <div className={styles.table}>
            <div className={styles.tableCenter}>
              <div className={styles.phase}>{state?.phase ?? "preflop"}</div>
              <div className={styles.pot}>{t.pot} {state?.pot ?? 0}</div>
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

            {Array.from({ length: 6 }, (_, index) => {
              const player = players[index];
              return player ? (
                <article
                  className={`${styles.seat} ${player.id === state?.currentPlayerId ? styles.currentSeat : ""} ${styles[`status_${player.status.replace("-", "_")}`] ?? ""}`}
                  key={player.id}
                  style={seatStyle(index, 6)}
                >
                  <div className={styles.seatHeader}>
                    <Link className={styles.playerProfileLink} href={`/agents/${encodeURIComponent(player.id)}`}>
                      {player.name}
                      {player.kind === "virtual" && <small>{t.virtualAgent}</small>}
                    </Link>
                    <div className={styles.seatBadges}>
                      <span>{positionLabel(index, state?.dealerIndex ?? 0, players.length)}</span>
                      <span>{player.status}</span>
                    </div>
                  </div>
                  <div className={styles.seatMeta}>
                    <span>{t.stack} {player.stack}</span>
                    <span>{t.bet} {player.currentBet}</span>
                  </div>
                  <div className={`${styles.chipDelta} ${deltaClass(player.stack - initialStack)}`}>
                    {t.profit} {formatDelta(player.stack - initialStack)}
                  </div>
                  <div className={styles.holeCards}>
                    {player.holeCards?.map((card, cardIndex) => (
                      <PlayingCard card={card} key={`${player.id}-${card.rank}${card.suit}-${cardIndex}`} small />
                    ))}
                  </div>
                  <p>{t.action}: {player.lastAction ?? t.waiting}</p>
                </article>
              ) : (
                <article className={`${styles.seat} ${styles.emptySeatCard}`} key={`empty-${index}`} style={seatStyle(index, 6)}>
                  <div className={styles.seatHeader}>
                    <strong>{t.emptySeat}</strong>
                    <span>{t.waitingAssign}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className={styles.sidePanel}>
          <section className={`${styles.panel} ${myPlayer ? styles.myPlayerPanel : ""}`}>
            <h2>{t.myPlayer}</h2>
            {myPlayer ? (
              <>
                <div className={styles.myPlayerSummary}>
                  <div>
                    <strong>{myPlayer.name}</strong>
                    <span>{myPlayer.kind === "hosted" ? t.hostedAgent : t.externalAgent}</span>
                  </div>
                  <em className={deltaClass(myPlayer.stack - initialStack)}>{formatDelta(myPlayer.stack - initialStack)}</em>
                </div>
                <div className={styles.myPlayerStats}>
                  <span>{t.stack} {myPlayer.stack}</span>
                  <span>{t.bet} {myPlayer.currentBet}</span>
                  <span>{t.action} {myPlayer.lastAction ?? t.waiting}</span>
                  <span>{myPlayer.id === state?.currentPlayerId ? t.waiting : myPlayer.status}</span>
                </div>
                <form className={styles.coachingForm} onSubmit={submitCoaching}>
                  <label>
                    {t.coaching}
                    <textarea
                      onChange={(event) => setCoachingMessage(event.target.value)}
                      placeholder={t.coachingPlaceholder}
                      value={coachingMessage}
                    />
                  </label>
                  <button disabled={controlBusy === "coaching" || !coachingMessage.trim()} type="submit">
                    {controlBusy === "coaching" ? "发送中..." : t.sendCoaching}
                  </button>
                </form>
                <p className={styles.muted}>{t.coachingHint}</p>
                <button className={styles.dangerAction} disabled={controlBusy === "leave"} type="button" onClick={() => void leaveMyPlayer()}>
                  {controlBusy === "leave" ? t.leaving : t.leaveTable}
                </button>
                {controlStatus ? <p className={styles.muted}>{controlStatus}</p> : null}
              </>
            ) : (
              <p className={styles.muted}>{me === undefined ? "正在读取登录状态..." : t.loginToCoach}</p>
            )}
          </section>

          <section className={styles.panel}>
            <h2>{t.chipChange}</h2>
            <div className={styles.chipBoard}>
              {players.map((player) => {
                const delta = player.stack - initialStack;
                return (
                  <article className={styles.chipRow} key={player.id}>
                    <div>
                      <Link className={styles.playerProfileLink} href={`/agents/${encodeURIComponent(player.id)}`}>
                        {player.name}
                      </Link>
                      <small>{player.kind === "virtual" ? t.virtualAgent : player.status}</small>
                    </div>
                    <span>{player.stack}</span>
                    <em className={deltaClass(delta)}>{formatDelta(delta)}</em>
                  </article>
                );
              })}
              {players.length === 0 && <p className={styles.muted}>{t.noActions}</p>}
            </div>
          </section>

          <section className={styles.panel}>
            <h2>{t.actionLog}</h2>
            <div className={styles.logList}>
              {state?.logs.map((log) => (
                <article className={styles.logItem} key={log.id}>
                  <time>{new Date(log.createdAt).toLocaleTimeString()}</time>
                  <span>{log.message}</span>
                </article>
              ))}
              {!state?.logs.length && <p className={styles.muted}>{t.noActions}</p>}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function seatStyle(index: number, totalSeats: number) {
  const angle = -90 + (360 / totalSeats) * index;
  const radius = 43;
  return {
    left: `${50 + radius * Math.cos((angle * Math.PI) / 180)}%`,
    top: `${50 + radius * Math.sin((angle * Math.PI) / 180)}%`,
  };
}

function positionLabel(index: number, dealerIndex: number, playerCount: number) {
  if (playerCount <= 0) {
    return "Seat";
  }

  const distance = (index - dealerIndex + playerCount) % playerCount;
  if (playerCount === 2) {
    return distance === 0 ? "BTN/SB" : "BB";
  }

  const labels = ["BTN", "SB", "BB", "UTG", "HJ", "CO"];
  return labels[Math.min(distance, labels.length - 1)] ?? `P${distance + 1}`;
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
