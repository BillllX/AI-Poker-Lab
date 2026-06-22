"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  DAILY_COACHING_TARGET,
  DAILY_SPECTATE_HANDS_TARGET,
  DAILY_TASKS_COMPLETE_COPY,
  getDailyTasksProgress,
  getDailyTasksSnapshot,
  getServerDailyTasksSnapshot,
  subscribeDailyTasks,
} from "@/lib/client/dailyTasks";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./DailyTasksStrip.module.css";

const HIDDEN_PREFIXES = ["/login"];

const copy = {
  en: {
    coachCta: "Open Coach",
    complete: DAILY_TASKS_COMPLETE_COPY.en,
    eyebrow: "Daily goals",
    progress: (spectate: number, coaching: number) =>
      `Watch ${spectate}/${DAILY_SPECTATE_HANDS_TARGET} hands · Coach ${coaching}/${DAILY_COACHING_TARGET}`,
    watchCta: "Watch tables",
  },
  zh: {
    coachCta: "去 Coaching",
    complete: DAILY_TASKS_COMPLETE_COPY.zh,
    eyebrow: "每日任务",
    progress: (spectate: number, coaching: number) =>
      `观战 ${spectate}/${DAILY_SPECTATE_HANDS_TARGET} 手 · Coaching ${coaching}/${DAILY_COACHING_TARGET}`,
    watchCta: "去观战",
  },
} as const;

export function DailyTasksStrip() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const t = copy[language];
  const state = useSyncExternalStore(subscribeDailyTasks, getDailyTasksSnapshot, getServerDailyTasksSnapshot);
  const progress = getDailyTasksProgress(state);

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <aside
      aria-label={language === "zh" ? "每日任务" : "Daily goals"}
      className={styles.strip}
      role="region"
    >
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <p className={styles.message}>
          {progress.complete
            ? t.complete
            : t.progress(progress.spectateHands, progress.coaching)}
        </p>
      </div>
      {!progress.complete &&
      progress.spectateHands < progress.spectateTarget &&
      !pathname.startsWith("/tables") ? (
        <Link
          className={styles.cta}
          href="/tables"
          onClick={() => {
            trackEngagement({
              action: "watch",
              at: new Date().toISOString(),
              name: "engagement.daily_tasks.cta_click",
            });
          }}
        >
          {t.watchCta}
        </Link>
      ) : !progress.complete &&
        progress.coaching < progress.coachingTarget &&
        /^\/tables\/[^/]+/.test(pathname) ? (
        <a
          className={styles.cta}
          href="#coach-dock"
          onClick={() => {
            trackEngagement({
              action: "coach",
              at: new Date().toISOString(),
              name: "engagement.daily_tasks.cta_click",
            });
          }}
        >
          {t.coachCta}
        </a>
      ) : progress.complete ? (
        <span aria-hidden className={styles.completeMark}>
          ✓
        </span>
      ) : null}
    </aside>
  );
}
