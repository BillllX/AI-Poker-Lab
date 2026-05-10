"use client";

import Link from "next/link";
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
  },
};

const initialStack = 1_000;

export default function TableDetailPage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = use(params);
  const { language } = useLanguage();
  const t = copy[language];
  const [state, setState] = useState<GameSnapshot>();
  const players = state?.players ?? [];

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
                    <strong>
                      {player.name}
                      {player.kind === "virtual" && <small>{t.virtualAgent}</small>}
                    </strong>
                    <span>{player.status}</span>
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
                <article className={styles.seat} key={`empty-${index}`} style={seatStyle(index, 6)}>
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
          <section className={styles.panel}>
            <h2>{t.chipChange}</h2>
            <div className={styles.chipBoard}>
              {players.map((player) => {
                const delta = player.stack - initialStack;
                return (
                  <article className={styles.chipRow} key={player.id}>
                    <div>
                      <strong>{player.name}</strong>
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
