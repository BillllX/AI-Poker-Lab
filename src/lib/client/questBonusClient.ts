import { withBasePath } from "@/lib/client/basePath";
import { pushEngagementToast } from "@/lib/client/engagementToast";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import type { Language } from "@/lib/client/i18n";

export async function claimQuestCoreBonus(language: Language) {
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

export async function fetchQuestBonusSummary(): Promise<{
  breakdown: Array<{ amount: number; reason: string }>;
  grantedToday: number;
} | null> {
  const response = await fetch(withBasePath("/api/users/me/quest-bonus"), { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as {
    breakdown: Array<{ amount: number; reason: string }>;
    grantedToday: number;
  };
}
