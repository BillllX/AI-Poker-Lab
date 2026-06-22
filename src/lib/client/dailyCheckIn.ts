const STORAGE_KEY = "texas-poker:daily-check-in";

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
let cachedRaw: string | null | undefined;
let cachedState: DailyCheckInState = EMPTY_CHECK_IN_STATE;

function parseStoredState(raw: string): DailyCheckInState {
  const parsed = JSON.parse(raw) as Partial<DailyCheckInState>;
  return {
    lastDayKey: typeof parsed.lastDayKey === "string" ? parsed.lastDayKey : "",
    streak: typeof parsed.streak === "number" && parsed.streak > 0 ? parsed.streak : 0,
    totalCheckIns:
      typeof parsed.totalCheckIns === "number" && parsed.totalCheckIns >= 0 ? parsed.totalCheckIns : 0,
  };
}

function commitCachedState(raw: string | null, state: DailyCheckInState) {
  cachedRaw = raw;
  cachedState = state;
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedState;
    }

    if (!raw) {
      commitCachedState(null, EMPTY_CHECK_IN_STATE);
      return EMPTY_CHECK_IN_STATE;
    }

    const next = parseStoredState(raw);
    commitCachedState(raw, next);
    return next;
  } catch {
    commitCachedState(null, EMPTY_CHECK_IN_STATE);
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
    const raw = JSON.stringify(next);
    localStorage.setItem(STORAGE_KEY, raw);
    commitCachedState(raw, next);
  }

  return next;
}
