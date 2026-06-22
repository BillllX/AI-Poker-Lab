import { todayDayKey } from "@/lib/client/dailyCheckIn";
import { pushEngagementToast } from "@/lib/client/engagementToast";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import type { Language } from "@/lib/client/i18n";

const STORAGE_KEY = "texas-poker:quest-active-celebrated";

export function maybeCelebrateQuestActiveToday(stars: number, language: Language) {
  if (typeof window === "undefined" || stars < 3) {
    return false;
  }

  const dayKey = todayDayKey();
  if (sessionStorage.getItem(STORAGE_KEY) === dayKey) {
    return false;
  }

  sessionStorage.setItem(STORAGE_KEY, dayKey);
  pushEngagementToast({
    expiresMs: 5200,
    kind: "rank",
    message: language === "zh" ? "今日活跃达成 — 3⭐+" : "Active today unlocked — 3★+",
  });
  trackEngagement({
    at: new Date().toISOString(),
    name: "engagement.quest.active_today",
    stars,
  });
  return true;
}

/** Test-only reset. */
export function resetQuestActiveCelebrationForTests() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
