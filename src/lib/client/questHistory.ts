import { todayDayKey } from "@/lib/client/dailyCheckIn";
import type { QuestEntry, QuestId } from "@/lib/client/questCatalog";
import { countQuestStars } from "@/lib/client/questCatalog";

const STORAGE_KEY = "texas-poker:quest-history";
const MAX_DAYS = 7;
export const QUEST_HISTORY_CHANGE_EVENT = "texas-poker-quest-history-change";

export type QuestDayHistory = {
  completedIds: QuestId[];
  dayKey: string;
  stars: number;
  updatedAt: string;
};

/** Cached snapshot — useSyncExternalStore requires referential stability. */
let cachedRaw: string | null | undefined;
let cachedHistory: QuestDayHistory[] = [];

function parseHistory(raw: string): QuestDayHistory[] {
  try {
    const parsed = JSON.parse(raw) as QuestDayHistory[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry) =>
        typeof entry.dayKey === "string" &&
        typeof entry.stars === "number" &&
        Array.isArray(entry.completedIds),
    );
  } catch {
    return [];
  }
}

function commitHistoryCache(raw: string | null, entries: QuestDayHistory[]) {
  cachedRaw = raw;
  cachedHistory = entries;
}

function writeHistory(entries: QuestDayHistory[]) {
  if (typeof localStorage === "undefined") {
    commitHistoryCache(null, entries.slice(0, MAX_DAYS));
    return;
  }
  const next = entries.slice(0, MAX_DAYS);
  const raw = JSON.stringify(next);
  localStorage.setItem(STORAGE_KEY, raw);
  commitHistoryCache(raw, next);
  window.dispatchEvent(new Event(QUEST_HISTORY_CHANGE_EVENT));
}

export function upsertTodayQuestHistory(board: QuestEntry[]) {
  const dayKey = todayDayKey();
  const next: QuestDayHistory = {
    completedIds: board.filter((entry) => entry.complete).map((entry) => entry.id),
    dayKey,
    stars: countQuestStars(board),
    updatedAt: new Date().toISOString(),
  };
  const history = readQuestHistory().filter((entry) => entry.dayKey !== dayKey);
  history.unshift(next);
  writeHistory(history);
}

export function readQuestHistory(): QuestDayHistory[] {
  if (typeof localStorage === "undefined") {
    return cachedHistory;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedHistory;
    }

    if (!raw) {
      commitHistoryCache(null, []);
      return cachedHistory;
    }

    const next = parseHistory(raw);
    commitHistoryCache(raw, next);
    return cachedHistory;
  } catch {
    commitHistoryCache(null, []);
    return cachedHistory;
  }
}

export function getServerQuestHistorySnapshot() {
  return cachedHistory;
}

export function subscribeQuestHistory(onStoreChange: () => void) {
  window.addEventListener(QUEST_HISTORY_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(QUEST_HISTORY_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
