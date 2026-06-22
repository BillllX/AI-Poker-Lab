import { todayDayKey } from "@/lib/client/dailyCheckIn";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import type { QuestEntry, QuestId } from "@/lib/client/questCatalog";

const notifiedKeys = new Set<string>();

function completionKey(questId: QuestId) {
  return `${todayDayKey()}:${questId}`;
}

export function syncQuestCompletionTelemetry(entries: QuestEntry[]) {
  for (const entry of entries) {
    if (!entry.complete) {
      continue;
    }
    const key = completionKey(entry.id);
    if (notifiedKeys.has(key)) {
      continue;
    }
    notifiedKeys.add(key);
    trackEngagement({
      at: new Date().toISOString(),
      kind: entry.kind,
      name: "engagement.quest.complete",
      questId: entry.id,
    });
  }
}

/** Test-only reset. */
export function resetQuestCompletionTelemetryForTests() {
  notifiedKeys.clear();
}
