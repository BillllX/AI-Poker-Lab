import {
  getUserScopedStorageKey,
  USER_STORAGE_SCOPE_CHANGE_EVENT,
} from "@/lib/client/userScopedStorage";

const STORAGE_KEY_BASE = "texas-poker:daily-check-in";
export const DAILY_CHECK_IN_CHANGE_EVENT = "texas-poker-daily-check-in-change";

export type DailyCheckInState = {
  lastDayKey: string;
  streak: number;
  totalCheckIns: number;
};

export type StreakBadgeTier = "none" | "warm" | "hot";

export const EMPTY_CHECK_IN_STATE: DailyCheckInState = {
  lastDayKey: "",
  streak: 0,
  totalCheckIns: 0,
};

/** Cached snapshot so useSyncExternalStore getSnapshot stays referentially stable. */
let cachedStorageKey: string | null | undefined;
let cachedRaw: string | null | undefined;
let cachedState: DailyCheckInState = EMPTY_CHECK_IN_STATE;

function resolveStorageKey(): string {
  return getUserScopedStorageKey(STORAGE_KEY_BASE);
}

function commitCache(storageKey: string | null, raw: string | null, state: DailyCheckInState) {
  cachedStorageKey = storageKey;
  cachedRaw = raw;
  cachedState = state;
}

function parseStoredState(raw: string): DailyCheckInState {
  const parsed = JSON.parse(raw) as Partial<DailyCheckInState>;
  return {
    lastDayKey: typeof parsed.lastDayKey === "string" ? parsed.lastDayKey : "",
    streak: typeof parsed.streak === "number" && parsed.streak > 0 ? parsed.streak : 0,
    totalCheckIns:
      typeof parsed.totalCheckIns === "number" && parsed.totalCheckIns >= 0 ? parsed.totalCheckIns : 0,
  };
}

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DAILY_CHECK_IN_CHANGE_EVENT));
  }
}

export function formatDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDayKey(): string {
  return formatDayKey(new Date());
}

function parseDayKey(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isYesterday(dayKey: string, today = todayDayKey()): boolean {
  const previous = parseDayKey(today);
  previous.setDate(previous.getDate() - 1);
  return formatDayKey(previous) === dayKey;
}

export function readCheckInState(): DailyCheckInState {
  if (typeof localStorage === "undefined") {
    return EMPTY_CHECK_IN_STATE;
  }

  try {
    const storageKey = resolveStorageKey();
    const raw = localStorage.getItem(storageKey);
    if (storageKey === cachedStorageKey && raw === cachedRaw) {
      return cachedState;
    }

    if (!raw) {
      commitCache(storageKey, null, EMPTY_CHECK_IN_STATE);
      return EMPTY_CHECK_IN_STATE;
    }

    const next = parseStoredState(raw);
    commitCache(storageKey, raw, next);
    return next;
  } catch {
    commitCache(null, null, EMPTY_CHECK_IN_STATE);
    return EMPTY_CHECK_IN_STATE;
  }
}

export function isCheckedInToday(state = readCheckInState()): boolean {
  return state.lastDayKey === todayDayKey();
}

export function getStreakBadgeTier(streak: number): StreakBadgeTier {
  if (streak >= 7) {
    return "hot";
  }
  if (streak >= 3) {
    return "warm";
  }
  return "none";
}

export function checkInToday(): DailyCheckInState {
  const today = todayDayKey();
  const current = readCheckInState();

  if (current.lastDayKey === today) {
    return current;
  }

  const streak =
    current.lastDayKey && isYesterday(current.lastDayKey, today) ? current.streak + 1 : 1;

  const next: DailyCheckInState = {
    lastDayKey: today,
    streak,
    totalCheckIns: current.totalCheckIns + 1,
  };

  if (typeof localStorage !== "undefined") {
    const storageKey = resolveStorageKey();
    const raw = JSON.stringify(next);
    localStorage.setItem(storageKey, raw);
    commitCache(storageKey, raw, next);
    emitChange();
  }

  return next;
}

export function subscribeCheckIn(onStoreChange: () => void) {
  window.addEventListener(DAILY_CHECK_IN_CHANGE_EVENT, onStoreChange);
  window.addEventListener(USER_STORAGE_SCOPE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(DAILY_CHECK_IN_CHANGE_EVENT, onStoreChange);
    window.removeEventListener(USER_STORAGE_SCOPE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
