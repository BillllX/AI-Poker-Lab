import { todayDayKey } from "@/lib/client/dailyCheckIn";
import { withBasePath } from "@/lib/client/basePath";
import { pushEngagementToast } from "@/lib/client/engagementToast";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import type { Language } from "@/lib/client/i18n";

const AUTO_REWARD_KEY = "texas-poker:quest-active-reward-auto";

type QuestBonusReason = "quest_star" | "quest_master";

export type QuestActiveRewardResult =
  | { kind: "skipped" }
  | { kind: "login_required" }
  | { kind: "done"; grantedPoints: number; masterBadge: boolean };

function readAutoFlag() {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(AUTO_REWARD_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { dayKey: string };
    return parsed.dayKey === todayDayKey() ? parsed : null;
  } catch {
    return null;
  }
}

function writeAutoFlag() {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(AUTO_REWARD_KEY, JSON.stringify({ dayKey: todayDayKey() }));
}

async function claimQuestMasterBadge() {
  const response = await fetch(withBasePath("/api/users/me/daily-badges"), {
    body: JSON.stringify({ badge: "quest_master", context: "quest_active" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (response.status === 401) {
    return "login_required" as const;
  }
  return response.ok ? ("earned" as const) : ("unavailable" as const);
}

async function claimQuestBonus(reason: QuestBonusReason) {
  const response = await fetch(withBasePath("/api/users/me/quest-bonus"), {
    body: JSON.stringify({ reason }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (response.status === 401) {
    return { kind: "login_required" as const };
  }
  if (response.status === 409) {
    return { kind: "conflict" as const };
  }
  if (!response.ok) {
    return { kind: "error" as const };
  }
  const payload = (await response.json()) as { granted?: number };
  return { kind: "granted" as const, granted: payload.granted ?? 0, reason };
}

export async function tryQuestActiveRewards(
  stars: number,
  language: Language,
): Promise<QuestActiveRewardResult> {
  if (typeof window === "undefined" || stars < 3) {
    return { kind: "skipped" };
  }
  if (readAutoFlag()) {
    return { kind: "skipped" };
  }
  writeAutoFlag();

  const masterResult = await claimQuestMasterBadge();
  if (masterResult === "login_required") {
    return { kind: "login_required" };
  }

  let grantedPoints = 0;
  const starBonus = await claimQuestBonus("quest_star");
  if (starBonus.kind === "login_required") {
    return { kind: "login_required" };
  }
  if (starBonus.kind === "granted") {
    grantedPoints += starBonus.granted;
    trackEngagement({
      at: new Date().toISOString(),
      granted: starBonus.granted,
      name: "engagement.quest.bonus_granted",
      reason: "quest_star",
    });
  }

  if (masterResult === "earned") {
    const masterBonus = await claimQuestBonus("quest_master");
    if (masterBonus.kind === "granted") {
      grantedPoints += masterBonus.granted;
      trackEngagement({
        at: new Date().toISOString(),
        granted: masterBonus.granted,
        name: "engagement.quest.bonus_granted",
        reason: "quest_master",
      });
    }
    pushEngagementToast({
      expiresMs: 5200,
      kind: "rank",
      message: language === "zh" ? "任务大师荣誉已解锁" : "Quest Master honor unlocked",
    });
  }

  if (grantedPoints > 0) {
    pushEngagementToast({
      expiresMs: 5200,
      kind: "points",
      message:
        language === "zh"
          ? `实验奖励 +${grantedPoints} 积分`
          : `Lab bonus +${grantedPoints} points`,
    });
  }

  return {
    kind: "done",
    grantedPoints,
    masterBadge: masterResult === "earned",
  };
}
