import { withBasePath } from "@/lib/client/basePath";
import { pushEngagementToast } from "@/lib/client/engagementToast";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import type { Language } from "@/lib/client/i18n";
import { getCurrentStorageUserId } from "@/lib/client/userScopedStorage";

export type QuestBonusBreakdownEntry = {
  amount: number;
  reason: string;
};

export type QuestBonusSummary = {
  breakdown: QuestBonusBreakdownEntry[];
  grantedToday: number;
};

export type ScopedQuestBonusSummaryResult = {
  userId: string | null;
  summary: QuestBonusSummary | null;
};

export type QuestBonusDisplayState = {
  bonusToday: number | null;
  bonusBreakdown: QuestBonusBreakdownEntry[];
};

export async function claimQuestCoreBonus(language: Language) {
  const claimUserId = getCurrentStorageUserId();
  if (claimUserId === null) {
    return null;
  }
  const response = await fetch(withBasePath("/api/users/me/quest-bonus"), {
    body: JSON.stringify({ reason: "quest_core" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { granted?: number };
  if (!payload.granted) {
    return null;
  }
  if (getCurrentStorageUserId() !== claimUserId) {
    return null;
  }
  trackEngagement({
    at: new Date().toISOString(),
    granted: payload.granted,
    name: "engagement.quest.bonus_granted",
    reason: "quest_core",
  });
  pushEngagementToast({
    expiresMs: 4800,
    kind: "points",
    message: language === "zh" ? `核心任务奖励 +${payload.granted} 积分` : `Core quest bonus +${payload.granted} pts`,
  });
  return payload.granted;
}

export async function fetchQuestBonusSummary(): Promise<QuestBonusSummary | null> {
  const response = await fetch(withBasePath("/api/users/me/quest-bonus"), { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as QuestBonusSummary;
}

export async function fetchScopedQuestBonusSummary(): Promise<ScopedQuestBonusSummaryResult> {
  const userId = getCurrentStorageUserId();
  if (userId === null) {
    return { userId, summary: null };
  }
  const summary = await fetchQuestBonusSummary();
  return { userId, summary };
}

export function resolveScopedQuestBonusDisplay(
  result: ScopedQuestBonusSummaryResult,
  currentUserId: string | null,
): QuestBonusDisplayState | undefined {
  if (result.userId !== currentUserId) {
    return undefined;
  }
  if (!result.summary || result.summary.grantedToday === 0) {
    return { bonusBreakdown: [], bonusToday: null };
  }
  return {
    bonusBreakdown: result.summary.breakdown ?? [],
    bonusToday: result.summary.grantedToday,
  };
}
