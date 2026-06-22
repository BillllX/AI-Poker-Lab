"use client";

import {
  getSeasonEventBadge,
  resolveEventLabel,
  resolveSeasonLabel,
} from "@/lib/client/seasonEventBadge";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./SeasonEventBadge.module.css";

type SeasonEventBadgeProps = {
  className?: string;
  compact?: boolean;
  show?: "both" | "event" | "season";
};

/** Reusable season + event corner badges for lobby, leaderboard, and home promos (F20). */
export function SeasonEventBadge({ className, compact = false, show = "both" }: SeasonEventBadgeProps) {
  const { language } = useLanguage();
  const config = getSeasonEventBadge();

  if (!config) {
    return null;
  }

  const seasonLabel = resolveSeasonLabel(language, config);
  const eventLabel = resolveEventLabel(language, config);
  const showSeason = show === "both" || show === "season";
  const showEvent = (show === "both" || show === "event") && Boolean(eventLabel);

  if (!showSeason && !showEvent) {
    return null;
  }

  return (
    <span
      className={[styles.seasonEventBadge, compact ? styles.compact : "", className].filter(Boolean).join(" ")}
    >
      {showSeason ? <span className={styles.season}>{seasonLabel}</span> : null}
      {showEvent && eventLabel ? <span className={styles.event}>{eventLabel}</span> : null}
    </span>
  );
}
