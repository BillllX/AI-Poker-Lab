"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  checkInToday,
  EMPTY_CHECK_IN_STATE,
  getStreakBadgeTier,
  isCheckedInToday,
  readCheckInState,
  subscribeCheckIn,
} from "@/lib/client/dailyCheckIn";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./DailyCheckInStrip.module.css";

function getSnapshot() {
  return readCheckInState();
}

function getServerSnapshot() {
  return EMPTY_CHECK_IN_STATE;
}

const copy = {
  zh: {
    eyebrow: "每日签到",
    prompt: "签到记录连续来访天数，实验 streak 徽章（仅本机）。",
    checked: "今日已签到",
    checkIn: "签到",
    streak: (days: number) => `连续 ${days} 天`,
    badgeWarm: "3 日徽章",
    badgeHot: "7 日徽章",
  },
  en: {
    eyebrow: "Daily check-in",
    prompt: "Track visit streaks locally — lightweight experiment, no server points.",
    checked: "Checked in today",
    checkIn: "Check in",
    streak: (days: number) => `${days}-day streak`,
    badgeWarm: "3-day badge",
    badgeHot: "7-day badge",
  },
} as const;

type DailyCheckInStripProps = {
  className?: string;
};

export function DailyCheckInStrip({ className }: DailyCheckInStripProps) {
  const { language } = useLanguage();
  const t = copy[language];
  const state = useSyncExternalStore(subscribeCheckIn, getSnapshot, getServerSnapshot);
  const checkedIn = isCheckedInToday(state);
  const badgeTier = getStreakBadgeTier(state.streak);

  const handleCheckIn = useCallback(() => {
    const next = checkInToday();
    trackEngagement({
      at: new Date().toISOString(),
      name: "engagement.checkin.complete",
      streak: next.streak,
    });
  }, []);

  return (
    <aside
      aria-label={language === "zh" ? "每日签到" : "Daily check-in"}
      className={[styles.strip, className].filter(Boolean).join(" ")}
      role="region"
    >
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <p className={styles.message}>{checkedIn && state.streak > 0 ? t.streak(state.streak) : t.prompt}</p>
      </div>
      <div className={styles.actions}>
        {state.streak >= 3 ? (
          <span
            className={`${styles.streakBadge} ${badgeTier === "hot" ? styles.streakBadgeHot : ""}`}
          >
            {state.streak >= 7 ? t.badgeHot : t.badgeWarm}
          </span>
        ) : null}
        {checkedIn ? (
          <span className={styles.checkedLabel} aria-live="polite">
            ✓ {t.checked}
          </span>
        ) : (
          <button className={styles.checkInButton} type="button" onClick={handleCheckIn}>
            {t.checkIn}
          </button>
        )}
      </div>
    </aside>
  );
}
