"use client";

import Link from "next/link";
import type { AgentHandSummary } from "@/lib/poker/types";
import styles from "@/app/agents/agent-profile.module.css";

type CoachCardResult = {
  handsPlayed: number;
  handsWon: number;
  profit: number;
  settledAt: string;
  settledReason: string;
};

type CoachCardCopy = {
  coachingCount: (count: number) => string;
  coachingStats: string;
  finalStack: string;
  hands: string;
  highlightHand: (handId: number, amount: number) => string;
  highlightTitle: string;
  noHighlight: string;
  noRecentResults: string;
  profit: string;
  recentSettlements: string;
  title: string;
  watchTable: string;
  wins: string;
};

type CoachCardProps = {
  coachingCount: number;
  copy: CoachCardCopy;
  highlightHand?: AgentHandSummary | null;
  recentResults: CoachCardResult[];
  tableUrl?: string;
};

export function CoachCard({ coachingCount, copy, highlightHand, recentResults, tableUrl }: CoachCardProps) {
  const settlements = recentResults.slice(0, 3);

  return (
    <section className={styles.coachCard}>
      <div className={styles.cardHeader}>
        <div>
          <h2>{copy.title}</h2>
          <p className={styles.muted}>{copy.coachingCount(coachingCount)}</p>
        </div>
        {tableUrl ? (
          <Link className={styles.tableLink} href={tableUrl}>
            <strong>{copy.watchTable}</strong>
          </Link>
        ) : null}
      </div>
      <div className={styles.coachCardGrid}>
        <article className={styles.coachCardBlock}>
          <h3>{copy.recentSettlements}</h3>
          <div className={styles.resultList}>
            {settlements.length > 0 ? (
              settlements.map((result) => (
                <article className={styles.resultRow} key={result.settledAt}>
                  <div>
                    <strong>{new Date(result.settledAt).toLocaleString()}</strong>
                    <small>{result.settledReason}</small>
                  </div>
                  <span>
                    {copy.hands} {result.handsPlayed} · {copy.wins} {result.handsWon}
                  </span>
                  <em className={result.profit < 0 ? styles.negative : styles.positive}>
                    {formatSigned(result.profit)}
                  </em>
                </article>
              ))
            ) : (
              <p className={styles.muted}>{copy.noRecentResults}</p>
            )}
          </div>
        </article>
        <article className={styles.coachCardBlock}>
          <h3>{copy.coachingStats}</h3>
          <p className={styles.coachCardMetric}>{copy.coachingCount(coachingCount)}</p>
          <p className={styles.muted}>{copy.watchTable}</p>
        </article>
        <article className={styles.coachCardBlock}>
          <h3>{copy.highlightTitle}</h3>
          {highlightHand ? (
            <>
              <p className={styles.coachCardMetric}>
                {copy.highlightHand(highlightHand.handId, highlightHand.totalAwarded)}
              </p>
              <p className={styles.muted}>
                {highlightHand.winners.map((winner) => `${winner.name} +${winner.amount.toLocaleString()}`).join(" · ")}
              </p>
            </>
          ) : (
            <p className={styles.muted}>{copy.noHighlight}</p>
          )}
        </article>
      </div>
    </section>
  );
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
}
