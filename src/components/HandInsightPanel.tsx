"use client";

import { memo } from "react";
import type { AgentDecisionHandAnalysis } from "@/lib/poker/types";
import styles from "@/app/table/table.module.css";

type HandInsightPanelCopy = {
  board: string;
  draws: string;
  hand: string;
  handInsightTitle: string;
  madeHand: string;
  none: string;
  reasoning: string;
};

type HandInsightPanelProps = {
  analysis: AgentDecisionHandAnalysis;
  copy: HandInsightPanelCopy;
  handId: number;
  heroName: string;
  reasoning?: string;
  visible: boolean;
};

export const HandInsightPanel = memo(function HandInsightPanel({ analysis, copy, handId, heroName, reasoning, visible }: HandInsightPanelProps) {
  if (!visible) {
    return null;
  }

  const drawText =
    analysis.draws.length > 0 ? analysis.draws.map((draw) => draw.label).join(" · ") : copy.none;

  return (
    <section className={`${styles.panel} ${styles.handInsightPanel}`}>
      <h2>{copy.handInsightTitle}</h2>
      <p className={styles.muted}>
        {heroName} · {copy.hand} #{handId}
      </p>
      <dl className={styles.handInsightList}>
        <div>
          <dt>{copy.madeHand}</dt>
          <dd>{analysis.madeHand.summary}</dd>
        </div>
        <div>
          <dt>{copy.board}</dt>
          <dd>{analysis.boardTexture.summary}</dd>
        </div>
        <div>
          <dt>{copy.draws}</dt>
          <dd>{drawText}</dd>
        </div>
        {reasoning ? (
          <div>
            <dt>{copy.reasoning}</dt>
            <dd>{reasoning}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
});
