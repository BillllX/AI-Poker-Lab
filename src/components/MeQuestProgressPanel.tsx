"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { EMPTY_CHECK_IN_STATE, readCheckInState } from "@/lib/client/dailyCheckIn";
import {
  getDailyTasksSnapshot,
  getServerDailyTasksSnapshot,
  subscribeDailyTasks,
} from "@/lib/client/dailyTasks";
import { useLanguage } from "@/lib/client/i18n";
import {
  getQuestOptionalSnapshot,
  getServerQuestOptionalSnapshot,
  subscribeQuestOptional,
} from "@/lib/client/questOptionalProgress";
import { buildQuestBoard, countQuestStars, questRewardHint } from "@/lib/client/questCatalog";
import { readQuestHistory, getServerQuestHistorySnapshot, subscribeQuestHistory } from "@/lib/client/questHistory";
import { fetchQuestBonusSummary } from "@/lib/client/questBonusClient";
import styles from "../app/me.module.css";

const CHECK_IN_EVENT = "daily-check-in-change";

function subscribeCheckIn(onStoreChange: () => void) {
  window.addEventListener(CHECK_IN_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CHECK_IN_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

const copy = {
  zh: {
    historyTitle: "近 7 日任务星数",
    stars: (n: number) => `${n}⭐`,
    tasksDone: (done: number, total: number) => `${done}/${total} 完成`,
    title: "今日任务进度",
    todayEmpty: "今日尚未开始任务",
    bonusToday: (n: number) => `今日实验奖励 +${n} 积分`,
    bonusBreakdownTitle: "奖励明细",
  },
  en: {
    historyTitle: "Quest stars · last 7 days",
    stars: (n: number) => `${n}★`,
    tasksDone: (done: number, total: number) => `${done}/${total} done`,
    title: "Today's quest progress",
    todayEmpty: "No quests started today",
    bonusToday: (n: number) => `Lab bonus today +${n} pts`,
    bonusBreakdownTitle: "Bonus breakdown",
  },
} as const;

export function MeQuestProgressPanel() {
  const { language } = useLanguage();
  const t = copy[language];
  const dailySnapshot = useSyncExternalStore(
    subscribeDailyTasks,
    getDailyTasksSnapshot,
    getServerDailyTasksSnapshot,
  );
  const optionalSnapshot = useSyncExternalStore(
    subscribeQuestOptional,
    getQuestOptionalSnapshot,
    getServerQuestOptionalSnapshot,
  );
  const checkInState = useSyncExternalStore(
    subscribeCheckIn,
    readCheckInState,
    () => EMPTY_CHECK_IN_STATE,
  );
  const history = useSyncExternalStore(
    subscribeQuestHistory,
    readQuestHistory,
    getServerQuestHistorySnapshot,
  );

  const questBoardKey = [
    language,
    dailySnapshot.dayKey,
    dailySnapshot.coachingCount,
    dailySnapshot.seenHands.join(","),
    checkInState.lastDayKey,
    optionalSnapshot.practice,
    optionalSnapshot.quickPlay,
    optionalSnapshot.share,
  ].join("|");

  const board = useMemo(() => {
    void questBoardKey;
    return buildQuestBoard(language);
  }, [language, questBoardKey]);

  const stars = countQuestStars(board);
  const doneCount = board.filter((entry) => entry.complete).length;
  const [bonusToday, setBonusToday] = useState<number | null>(null);
  const [bonusBreakdown, setBonusBreakdown] = useState<Array<{ amount: number; reason: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchQuestBonusSummary().then((summary) => {
      if (cancelled || !summary) {
        return;
      }
      if (summary.grantedToday > 0) {
        setBonusToday(summary.grantedToday);
      }
      setBonusBreakdown(summary.breakdown ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [questBoardKey]);

  if (board.length === 0) {
    return null;
  }

  return (
    <section className={styles.questProgressPanel}>
      <header className={styles.questProgressHeader}>
        <h2>{t.title}</h2>
        <div className={styles.questProgressHeaderMeta}>
          <span className={styles.questProgressStars}>{t.stars(stars)}</span>
          {bonusToday && bonusToday > 0 ? (
            <span className={styles.questBonusToday}>{t.bonusToday(bonusToday)}</span>
          ) : null}
        </div>
      </header>
      {stars === 0 && doneCount === 0 ? (
        <p className={styles.questProgressMuted}>{t.todayEmpty}</p>
      ) : (
        <ul className={styles.questProgressList}>
          {board.map((entry) => {
            const ratio = entry.target > 0 ? Math.min(entry.progress / entry.target, 1) : 0;
            const hint = questRewardHint(language, entry);
            return (
              <li className={styles.questProgressItem} key={entry.id}>
                <div className={styles.questProgressRow}>
                  <strong>{entry.title}</strong>
                  <span>{entry.complete ? "✓" : `${entry.progress}/${entry.target}`}</span>
                </div>
                <div aria-hidden className={styles.questProgressTrack}>
                  <span className={styles.questProgressFill} style={{ width: `${ratio * 100}%` }} />
                </div>
                <p className={styles.questProgressMeta}>+1⭐ · {hint}</p>
              </li>
            );
          })}
        </ul>
      )}

      {bonusBreakdown.length > 0 ? (
        <>
          <h3 className={styles.questHistoryTitle}>{t.bonusBreakdownTitle}</h3>
          <ul className={styles.questHistoryList}>
            {bonusBreakdown.map((entry) => (
              <li className={styles.questHistoryItem} key={entry.reason}>
                <span>{entry.reason}</span>
                <span>+{entry.amount}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {history.length > 0 ? (
        <>
          <h3 className={styles.questHistoryTitle}>{t.historyTitle}</h3>
          <ul className={styles.questHistoryList}>
            {history.map((entry) => (
              <li className={styles.questHistoryItem} key={entry.dayKey}>
                <span>{entry.dayKey}</span>
                <span>{t.stars(entry.stars)}</span>
                <span>{t.tasksDone(entry.completedIds.length, board.length)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
