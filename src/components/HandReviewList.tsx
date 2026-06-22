"use client";

import { memo } from "react";
import { handHighlightLabels } from "@/lib/poker/handHighlight";
import type { AgentHandSummary, Card } from "@/lib/poker/types";
import styles from "@/app/table/table.module.css";

type HandReviewListCopy = {
  hand: string;
  handReview: string;
  noCommunity: string;
  noHandSummaries: string;
};

type HandReviewListProps = {
  copy: HandReviewListCopy;
  language: "en" | "zh";
  myPlayerId?: string;
  summaries: AgentHandSummary[];
};

export const HandReviewList = memo(function HandReviewList({ copy, language, myPlayerId, summaries }: HandReviewListProps) {
  return (
    <section className={styles.panel}>
      <h2>{copy.handReview}</h2>
      <div className={styles.handSummaryList}>
        {summaries.slice(0, 5).map((summary) => (
          <article className={`${styles.handSummaryCard} ${summary.highlight ? styles.handSummaryHighlight : ""}`} key={summary.id}>
            <div className={styles.handSummaryHeader}>
              <strong>
                {summary.highlight ? <span className={styles.handSummaryBadge} aria-hidden="true">🔥</span> : null}
                {copy.hand} #{summary.handId}
              </strong>
              <span>{summary.totalAwarded.toLocaleString()}</span>
            </div>
            {summary.highlightTags && summary.highlightTags.length > 0 ? (
              <div className={styles.handSummaryTags}>
                {summary.highlightTags.map((tag) => (
                  <span className={styles.handSummaryTag} key={`${summary.handId}-${tag}`}>
                    {handHighlightLabels[tag][language]}
                  </span>
                ))}
              </div>
            ) : null}
            <div className={styles.handSummaryCards}>
              {summary.communityCards.length > 0 ? (
                summary.communityCards.map((card, index) => (
                  <PlayingCard card={card} key={`${summary.handId}-${card.rank}${card.suit}-${index}`} small />
                ))
              ) : (
                <small>{copy.noCommunity}</small>
              )}
            </div>
            <div className={styles.handSummaryWinners}>
              {summary.winners.map((winner) => (
                <span key={`${summary.handId}-${winner.playerId}`}>
                  {winner.name} +{winner.amount.toLocaleString()}
                  {winner.handLabel ? <small>{formatWinReason(winner.handLabel, language)}</small> : null}
                </span>
              ))}
            </div>
            <div className={styles.handSummaryPlayers}>
              {summary.players.map((player) => (
                <span
                  className={myPlayerId === player.playerId ? styles.handSummaryHero : undefined}
                  key={`${summary.handId}-${player.playerId}`}
                >
                  {player.name}
                  <em className={deltaClass(player.netChips)}>{formatDelta(player.netChips)}</em>
                </span>
              ))}
            </div>
          </article>
        ))}
        {summaries.length === 0 ? <p className={styles.muted}>{copy.noHandSummaries}</p> : null}
      </div>
    </section>
  );
});

function formatWinReason(reason: string | undefined, language: "en" | "zh") {
  if (!reason) {
    return language === "zh" ? "未摊牌获胜" : "won without showdown";
  }
  const zh: Record<string, string> = {
    flush: "同花",
    "four of a kind": "四条",
    "full house": "葫芦",
    "high card": "高牌",
    pair: "一对",
    "straight flush": "同花顺",
    straight: "顺子",
    "three of a kind": "三条",
    "two pair": "两对",
    "all opponents folded": "其他玩家弃牌",
  };
  return language === "zh" ? (zh[reason] ?? reason) : reason;
}

function PlayingCard({ card, small = false }: { card: Card; small?: boolean }) {
  const red = card.suit === "h" || card.suit === "d";
  const suit = { s: "♠", h: "♥", d: "♦", c: "♣" }[card.suit];
  return (
    <span className={`${styles.playingCard} ${small ? styles.smallCard : ""} ${red ? styles.redCard : ""}`}>{`${card.rank}${suit}`}</span>
  );
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
