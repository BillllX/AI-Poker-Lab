"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { SoundToggle } from "@/components/SoundToggle";
import { withBasePath } from "@/lib/client/basePath";
import { useLanguage } from "@/lib/client/i18n";
import { useTableSounds } from "@/lib/client/tableSoundEvents";
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
    recentActions: "最近动作",
    noActions: "还没有行动。",
    virtualAgent: "BOT",
    currentBet: "当前注额",
    chipChange: "筹码变化",
    players: "玩家",
    profit: "盈亏",
    position: "位置",
    myPlayer: "我的牌手",
    loginToView: "登录后，如果你的牌手在本桌，会显示当前状态和离桌控制。",
    joinTable: "坐上这张桌",
    joiningTable: "正在上桌...",
    joinTableHint: "你已登录，可以让自己的托管牌手加入这张桌，从下一手开始参与。",
    joinTableFailed: "上桌失败。",
    joinTableQueued: "已加入这张桌，等待下一手入局。",
    leaveTable: "Leave",
    leaveFailed: "离开牌桌失败。",
    leaving: "离开中...",
    loadingLogin: "正在读取登录状态...",
    leaveSettled: "已离开牌桌并结算。",
    leaveNoPlayer: "当前没有需要离开的牌手。",
    hostedAgent: "托管 Agent",
    externalAgent: "本地 Agent",
    spectatorMode: "观战模式",
    thinking: "正在思考",
    preparingHand: "准备发牌",
    handWinners: "本局赢家",
    wonChips: "赢得筹码",
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
    recentActions: "Recent Actions",
    noActions: "No actions yet.",
    virtualAgent: "BOT",
    currentBet: "Current bet",
    chipChange: "Chip Changes",
    players: "Players",
    profit: "P&L",
    position: "Position",
    myPlayer: "My Player",
    loginToView: "Log in to see current status and leave controls when your player is seated here.",
    joinTable: "Join This Table",
    joiningTable: "Joining...",
    joinTableHint: "You are logged in. Seat your hosted player at this table and it will join from the next hand.",
    joinTableFailed: "Failed to join this table.",
    joinTableQueued: "Joined this table. Your player will enter on the next hand.",
    leaveTable: "Leave",
    leaveFailed: "Failed to leave table.",
    leaving: "Leaving...",
    loadingLogin: "Reading login status...",
    leaveSettled: "Left table and settled.",
    leaveNoPlayer: "No player needs to leave right now.",
    hostedAgent: "Hosted Agent",
    externalAgent: "Local Agent",
    spectatorMode: "Spectator mode",
    thinking: "Thinking",
    preparingHand: "Preparing cards",
    handWinners: "Hand Winners",
    wonChips: "Won chips",
  },
};

const initialStack = 1_000;

type WinnerReveal = {
  handId: number;
  winners: Array<{ amount: number; name: string; playerId: string }>;
};

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
  const [controlStatus, setControlStatus] = useState<string>();
  const [controlBusy, setControlBusy] = useState<"join" | "leave">();
  const [winnerReveal, setWinnerReveal] = useState<WinnerReveal>();
  const lastWinnerRevealHandIdRef = useRef<number | undefined>(undefined);
  const winnerRevealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const players = state?.players ?? [];
  const myPlayer = me ? players.find((player) => player.ownerUserId === me.id) : undefined;
  const tableIsFull = players.length >= 6;
  const canJoinThisTable = Boolean(me && !myPlayer && !tableIsFull);
  const myPlayerSeatIndex = myPlayer ? players.findIndex((player) => player.id === myPlayer.id) : -1;
  const activePlayer = players.find((player) => player.id === state?.currentPlayerId);
  const waitingForFirstDeal = Boolean(state?.running && state.handId === 0 && players.length >= 2 && players.every((player) => (player.holeCards?.length ?? 0) === 0));
  const streetActions = currentStreetActions(state);
  const handWinners = winnerReveal?.winners ?? [];

  useTableSounds(state);

  function revealWinnersForSnapshot(snapshot: GameSnapshot) {
    if (snapshot.handId === lastWinnerRevealHandIdRef.current) {
      return;
    }

    const winners = handWinnerSummaries(snapshot);
    if (winners.length === 0) {
      return;
    }

    lastWinnerRevealHandIdRef.current = snapshot.handId;
    setWinnerReveal({ handId: snapshot.handId, winners });
    if (winnerRevealTimerRef.current) {
      clearTimeout(winnerRevealTimerRef.current);
    }
    winnerRevealTimerRef.current = setTimeout(() => {
      setWinnerReveal(undefined);
      winnerRevealTimerRef.current = undefined;
    }, 3_000);
  }

  useEffect(() => {
    const events = new EventSource(withBasePath(`/api/tables/${tableId}/events`));
    events.addEventListener("snapshot", (event) => {
      const nextState = JSON.parse((event as MessageEvent<string>).data) as GameSnapshot;
      setState(nextState);
      revealWinnersForSnapshot(nextState);
    });
    events.onerror = async () => {
      const response = await fetch(withBasePath(`/api/tables/${tableId}/state`), { cache: "no-store" });
      if (response.ok) {
        const nextState = (await response.json()) as GameSnapshot;
        setState(nextState);
        revealWinnersForSnapshot(nextState);
      }
    };
    return () => events.close();
  }, [tableId]);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      const response = await fetch(withBasePath("/api/users/me"), { cache: "no-store" });
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

  useEffect(() => {
    return () => {
      if (winnerRevealTimerRef.current) {
        clearTimeout(winnerRevealTimerRef.current);
      }
    };
  }, []);

  async function refreshTableState() {
    const response = await fetch(withBasePath(`/api/tables/${tableId}/state`), { cache: "no-store" });
    if (response.ok) {
      const nextState = (await response.json()) as GameSnapshot;
      setState(nextState);
      revealWinnersForSnapshot(nextState);
    }
  }

  async function leaveMyPlayer() {
    if (!myPlayer || !window.confirm(t.leaveTable)) {
      return;
    }

    setControlBusy("leave");
    setControlStatus(undefined);
    try {
      const response = await fetch(withBasePath("/api/users/me/agent/leave"), {
        body: JSON.stringify({ tableId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        setControlStatus(payload.error ?? t.leaveFailed);
        return;
      }
      setControlStatus(payload.removed ? t.leaveSettled : t.leaveNoPlayer);
      await refreshTableState();
    } finally {
      setControlBusy(undefined);
    }
  }

  async function joinThisTable() {
    setControlBusy("join");
    setControlStatus(undefined);
    try {
      const response = await fetch(withBasePath(`/api/tables/${tableId}/join`), { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setControlStatus(payload.error ?? t.joinTableFailed);
        return;
      }
      setControlStatus(t.joinTableQueued);
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
        <div className={styles.headerActions}>
          {myPlayer ? (
            <button className={styles.navLeaveAction} disabled={controlBusy === "leave"} type="button" onClick={() => void leaveMyPlayer()}>
              {controlBusy === "leave" ? t.leaving : t.leaveTable}
            </button>
          ) : null}
          <SoundToggle />
        </div>
      </section>

      <section className={styles.layout}>
        <div className={styles.tableArea}>
          <div className={styles.table}>
            <div className={styles.tableCenter}>
              <div className={styles.centerStats}>
                <span className={styles.phase}>{state?.phase ?? "preflop"}</span>
                <span className={styles.centerPot}>{t.pot} {state?.pot ?? 0}</span>
              </div>
              <div className={styles.cards}>
                {state?.communityCards.length ? (
                  state.communityCards.map((card, index) => <PlayingCard card={card} key={`${card.rank}${card.suit}${index}`} />)
                ) : (
                  <span className={styles.emptyCards}>{waitingForFirstDeal ? t.preparingHand : t.waitingCommunity}</span>
                )}
              </div>
            </div>

            {Array.from({ length: 6 }, (_, index) => {
              const player = players[index];
              return player ? (
                <article
                  className={`${styles.seat} ${player.id === state?.currentPlayerId ? styles.currentSeat : ""} ${styles[`status_${player.status.replace("-", "_")}`] ?? ""}`}
                  key={player.id}
                  style={seatStyle(visualSeatIndex(index, myPlayerSeatIndex, 6), 6)}
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
                  <div className={styles.streetAction}>{streetActions.get(player.id) ?? (player.id === state?.currentPlayerId ? t.thinking : t.waiting)}</div>
                  <div className={styles.seatMeta}>
                    <span><small>{t.stack}</small><strong>{player.stack}</strong></span>
                  </div>
                  <div className={`${styles.chipDelta} ${deltaClass(player.stack - initialStack)}`}>
                    {t.profit} {formatDelta(player.stack - initialStack)}
                  </div>
                  <div className={styles.holeCards}>
                    {player.holeCards?.map((card, cardIndex) => (
                      <PlayingCard card={card} key={`${player.id}-${card.rank}${card.suit}-${cardIndex}`} small />
                    ))}
                    {(player.holeCards?.length ?? 0) === 0 && player.stack > 0 ? (
                      <>
                        <PlayingCardBack />
                        <PlayingCardBack />
                      </>
                    ) : null}
                  </div>
                </article>
              ) : (
                <article className={`${styles.seat} ${styles.emptySeatCard}`} key={`empty-${index}`} style={seatStyle(visualSeatIndex(index, myPlayerSeatIndex, 6), 6)}>
                  <div className={styles.seatHeader}>
                    <strong>{t.emptySeat}</strong>
                    <span>{t.waitingAssign}</span>
                  </div>
                </article>
              );
            })}
          </div>
          <div className={styles.tableInfoBar}>
            <span>{t.pot} {state?.pot ?? 0}</span>
            <span>{t.hand} #{state?.handId ?? 0}</span>
            <span>{t.currentBet} {state?.currentBet ?? 0}</span>
            <span>{waitingForFirstDeal ? t.preparingHand : activePlayer ? `${activePlayer.name} ${t.thinking}` : t.spectatorMode}</span>
          </div>
        </div>

        <aside className={styles.sidePanel}>
          <section className={`${styles.panel} ${myPlayer ? styles.myPlayerPanel : ""}`}>
            <h2>{t.myPlayer}</h2>
            {myPlayer ? (
              <>
                {controlStatus ? <p className={styles.muted}>{controlStatus}</p> : null}
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
                  <span>{myPlayer.id === state?.currentPlayerId ? t.thinking : myPlayer.status}</span>
                </div>
              </>
            ) : canJoinThisTable ? (
              <>
                <p className={styles.muted}>{t.joinTableHint}</p>
                {controlStatus ? <p className={styles.muted}>{controlStatus}</p> : null}
                <button disabled={controlBusy === "join"} type="button" onClick={() => void joinThisTable()}>
                  {controlBusy === "join" ? t.joiningTable : t.joinTable}
                </button>
              </>
            ) : (
              <p className={styles.muted}>{me === undefined ? t.loadingLogin : t.loginToView}</p>
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
            <h2>{t.recentActions}</h2>
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
      {handWinners.length > 0 ? (
        <section className={styles.winnerOverlay} aria-live="polite">
          <div className={styles.winnerCard}>
            <div className={styles.trophy} aria-hidden="true">🏆</div>
            <p className={styles.eyebrow}>{t.handWinners}</p>
            <h2>{t.hand} #{winnerReveal?.handId ?? state?.handId ?? 0}</h2>
            <div className={styles.winnerList}>
              {handWinners.map((winner) => (
                <article key={winner.playerId}>
                  <strong>{winner.name}</strong>
                  <span>{t.wonChips} +{winner.amount.toLocaleString()}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function seatStyle(index: number, totalSeats: number) {
  const fixedSeats = [
    { left: 50, top: 14 },
    { left: 82, top: 30 },
    { left: 82, top: 70 },
    { left: 50, top: 86 },
    { left: 18, top: 70 },
    { left: 18, top: 30 },
  ];

  if (totalSeats === fixedSeats.length) {
    return {
      left: `${fixedSeats[index]?.left ?? 50}%`,
      top: `${fixedSeats[index]?.top ?? 50}%`,
    };
  }

  const angle = -90 + (360 / totalSeats) * index;
  const radius = 43;
  return {
    left: `${50 + radius * Math.cos((angle * Math.PI) / 180)}%`,
    top: `${50 + radius * Math.sin((angle * Math.PI) / 180)}%`,
  };
}

function visualSeatIndex(logicalIndex: number, ownSeatIndex: number, totalSeats: number) {
  if (ownSeatIndex < 0) {
    return logicalIndex;
  }

  const bottomSeatIndex = Math.floor(totalSeats / 2);
  return (logicalIndex - ownSeatIndex + bottomSeatIndex + totalSeats) % totalSeats;
}

function currentStreetActions(state?: GameSnapshot) {
  const actions = new Map<string, string>();
  if (!state) {
    return actions;
  }

  for (const item of state.actionHistory) {
    if (item.handId !== state.handId || item.round !== state.phase || item.action === "deal" || item.action === "win") {
      continue;
    }
    actions.set(item.playerId, formatStreetAction(item));
  }

  return actions;
}

function handWinnerSummaries(state?: GameSnapshot) {
  if (!state) {
    return [];
  }

  const winners = new Map<string, { amount: number; name: string; playerId: string }>();
  for (const item of state.actionHistory) {
    if (item.handId !== state.handId || item.action !== "win") {
      continue;
    }
    const current = winners.get(item.playerId);
    winners.set(item.playerId, {
      amount: (current?.amount ?? 0) + (item.amount ?? 0),
      name: item.playerName,
      playerId: item.playerId,
    });
  }

  return [...winners.values()].sort((left, right) => right.amount - left.amount);
}

function formatStreetAction(item: GameSnapshot["actionHistory"][number]) {
  if (item.action === "post-blind") {
    return item.amount ? `blind ${item.amount}` : "blind";
  }
  if (item.amount !== undefined && (item.action === "bet" || item.action === "raise" || item.action === "call")) {
    return `${item.action} ${item.amount}`;
  }
  return item.action;
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

function PlayingCardBack() {
  return <span className={`${styles.playingCard} ${styles.smallCard} ${styles.cardBack}`} aria-label="card pending" />;
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
