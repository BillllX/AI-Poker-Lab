"use client";

import Link from "next/link";
import { memo, type CSSProperties } from "react";
import type { Card } from "@/lib/poker/types";
import styles from "@/app/table/table.module.css";

export type TableSeatPlayer = {
  holeCards?: Card[];
  id: string;
  kind?: string;
  lastReasoning?: string;
  name: string;
  ownerUserId?: string;
  stack: number;
  status: string;
};

export type TablePlayerSeatCopy = {
  profit: string;
  stack: string;
  virtualAgent?: string;
  winBadge: string;
};

type TablePlayerSeatProps = {
  copy: TablePlayerSeatCopy;
  isCurrent: boolean;
  isMine?: boolean;
  isWinning: boolean;
  player: TableSeatPlayer;
  position: string;
  profitDelta: number;
  seatStyle: CSSProperties;
  showProfileLink?: boolean;
  showReasoning?: boolean;
  streetAction: string;
};

type TableEmptySeatProps = {
  seatStyle: CSSProperties;
  subtitle: string;
  title: string;
};

const suitGlyph = { s: "♠", h: "♥", d: "♦", c: "♣" } as const;

export const TablePlayerSeat = memo(function TablePlayerSeat({
  copy,
  isCurrent,
  isMine = false,
  isWinning,
  player,
  position,
  profitDelta,
  seatStyle,
  showProfileLink = false,
  showReasoning = false,
  streetAction,
}: TablePlayerSeatProps) {
  const statusClass = styles[`status_${player.status.replace("-", "_")}` as keyof typeof styles] ?? "";

  return (
    <article
      className={[
        styles.seat,
        isCurrent ? styles.currentSeat : "",
        isWinning ? styles.winningSeat : "",
        isMine ? styles.myAgentSeat : "",
        statusClass,
      ]
        .filter(Boolean)
        .join(" ")}
      style={seatStyle}
    >
      <div className={styles.seatHeader}>
        {showProfileLink ? (
          <Link className={styles.playerProfileLink} href={`/agents/${encodeURIComponent(player.id)}`}>
            {player.name}
            {player.kind === "virtual" && copy.virtualAgent ? <small>{copy.virtualAgent}</small> : null}
          </Link>
        ) : (
          <strong>{player.name}</strong>
        )}
        <div className={styles.seatBadges}>
          <span>{position}</span>
          <span>{player.status}</span>
        </div>
      </div>
      <div className={styles.streetAction}>{streetAction}</div>
      {isWinning ? <div className={styles.winBadge}>{copy.winBadge}</div> : null}
      {showReasoning && player.lastReasoning ? <p className={styles.reasoningSnippet}>{player.lastReasoning}</p> : null}
      <div className={styles.seatMeta}>
        <span>
          <small>{copy.stack}</small>
          <strong>{player.stack}</strong>
        </span>
      </div>
      <div className={`${styles.chipDelta} ${seatDeltaClassName(profitDelta)}`}>
        {copy.profit} {formatSeatDelta(profitDelta)}
      </div>
      <div className={styles.holeCards}>
        {player.holeCards?.map((card, cardIndex) => (
          <SeatPlayingCard card={card} key={`${player.id}-${card.rank}${card.suit}-${cardIndex}`} small />
        ))}
        {(player.holeCards?.length ?? 0) === 0 && player.stack > 0 ? (
          <>
            <SeatPlayingCardBack />
            <SeatPlayingCardBack />
          </>
        ) : null}
      </div>
    </article>
  );
}, arePlayerSeatPropsEqual);

export const TableEmptySeat = memo(function TableEmptySeat({ seatStyle, subtitle, title }: TableEmptySeatProps) {
  return (
    <article className={`${styles.seat} ${styles.emptySeatCard}`} style={seatStyle}>
      <div className={styles.seatHeader}>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </article>
  );
});

const SeatPlayingCard = memo(function SeatPlayingCard({ card, small = false }: { card: Card; small?: boolean }) {
  const red = card.suit === "h" || card.suit === "d";
  const suit = suitGlyph[card.suit];
  return (
    <span className={`${styles.playingCard} ${small ? styles.smallCard : ""} ${red ? styles.redCard : ""}`}>
      {`${card.rank}${suit}`}
    </span>
  );
});

function SeatPlayingCardBack() {
  return <span className={`${styles.playingCard} ${styles.smallCard} ${styles.cardBack}`} aria-label="card pending" />;
}

function arePlayerSeatPropsEqual(previous: TablePlayerSeatProps, next: TablePlayerSeatProps) {
  return (
    previous.isCurrent === next.isCurrent &&
    previous.isMine === next.isMine &&
    previous.isWinning === next.isWinning &&
    previous.position === next.position &&
    previous.profitDelta === next.profitDelta &&
    previous.showProfileLink === next.showProfileLink &&
    previous.showReasoning === next.showReasoning &&
    previous.streetAction === next.streetAction &&
    previous.copy.profit === next.copy.profit &&
    previous.copy.stack === next.copy.stack &&
    previous.copy.winBadge === next.copy.winBadge &&
    previous.copy.virtualAgent === next.copy.virtualAgent &&
    previous.seatStyle.left === next.seatStyle.left &&
    previous.seatStyle.top === next.seatStyle.top &&
    areSeatPlayersEqual(previous.player, next.player)
  );
}

function areSeatPlayersEqual(previous: TableSeatPlayer, next: TableSeatPlayer) {
  if (
    previous.id !== next.id ||
    previous.name !== next.name ||
    previous.stack !== next.stack ||
    previous.status !== next.status ||
    previous.kind !== next.kind ||
    previous.ownerUserId !== next.ownerUserId ||
    previous.lastReasoning !== next.lastReasoning
  ) {
    return false;
  }

  const previousCards = previous.holeCards ?? [];
  const nextCards = next.holeCards ?? [];
  if (previousCards.length !== nextCards.length) {
    return false;
  }

  for (let index = 0; index < previousCards.length; index += 1) {
    const left = previousCards[index]!;
    const right = nextCards[index]!;
    if (left.rank !== right.rank || left.suit !== right.suit) {
      return false;
    }
  }

  return true;
}

export function formatSeatDelta(delta: number) {
  return delta > 0 ? `+${delta}` : String(delta);
}

export function seatDeltaClassName(delta: number) {
  if (delta > 0) {
    return styles.positive;
  }
  if (delta < 0) {
    return styles.negative;
  }
  return styles.neutral;
}

export function tableSeatStyle(index: number, totalSeats: number): CSSProperties {
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

export function visualSeatIndex(logicalIndex: number, ownSeatIndex: number, totalSeats: number) {
  if (ownSeatIndex < 0) {
    return logicalIndex;
  }

  const bottomSeatIndex = Math.floor(totalSeats / 2);
  return (logicalIndex - ownSeatIndex + bottomSeatIndex + totalSeats) % totalSeats;
}

export function seatPositionLabel(index: number, dealerIndex: number, playerCount: number) {
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
