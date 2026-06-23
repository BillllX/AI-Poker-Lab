import { todayDayKey } from "@/lib/client/dailyCheckIn";
import type { QuestEntry, QuestId } from "@/lib/client/questCatalog";
import { countQuestStars } from "@/lib/client/questCatalog";
import {
  getCurrentStorageUserId,
  getUserScopedStorageKey,
  USER_STORAGE_SCOPE_CHANGE_EVENT,
} from "@/lib/client/userScopedStorage";

const STORAGE_KEY_BASE = "texas-poker:quest-history";
const MAX_DAYS = 7;
export const QUEST_HISTORY_CHANGE_EVENT = "texas-poker-quest-history-change";

export type QuestDayHistory = {
  completedIds: QuestId[];
  dayKey: string;
  stars: number;
  updatedAt: string;
};

/** Cached snapshot — useSyncExternalStore requires referential stability. */
let cachedStorageKey: string | null | undefined;
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

function resolveStorageKey() {
  return getUserScopedStorageKey(STORAGE_KEY_BASE);
}

function commitHistoryCache(storageKey: string | null, raw: string | null, entries: QuestDayHistory[]) {
  cachedStorageKey = storageKey;
  cachedRaw = raw;
  cachedHistory = entries;
}

function writeHistory(entries: QuestDayHistory[]) {
  if (typeof localStorage === "undefined") {
    commitHistoryCache(null, null, entries.slice(0, MAX_DAYS));
    return;
  }
  const next = entries.slice(0, MAX_DAYS);
  const raw = JSON.stringify(next);
  const storageKey = resolveStorageKey();
  localStorage.setItem(storageKey, raw);
  commitHistoryCache(storageKey, raw, next);
  window.dispatchEvent(new Event(QUEST_HISTORY_CHANGE_EVENT));
}

export function upsertTodayQuestHistory(board: QuestEntry[]) {
  if (getCurrentStorageUserId() === null) {
    return;
  }
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
    const storageKey = resolveStorageKey();
    const raw = localStorage.getItem(storageKey);
    if (storageKey === cachedStorageKey && raw === cachedRaw) {
      return cachedHistory;
    }

    if (!raw) {
      commitHistoryCache(storageKey, null, []);
      return cachedHistory;
    }

    const next = parseHistory(raw);
    commitHistoryCache(storageKey, raw, next);
    return cachedHistory;
  } catch {
    commitHistoryCache(null, null, []);
    return cachedHistory;
  }
}

export function getServerQuestHistorySnapshot() {
  return cachedHistory;
}

export function subscribeQuestHistory(onStoreChange: () => void) {
  window.addEventListener(QUEST_HISTORY_CHANGE_EVENT, onStoreChange);
  window.addEventListener(USER_STORAGE_SCOPE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(QUEST_HISTORY_CHANGE_EVENT, onStoreChange);
    window.removeEventListener(USER_STORAGE_SCOPE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
