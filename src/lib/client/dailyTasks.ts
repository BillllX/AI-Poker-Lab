import { todayDayKey } from "@/lib/client/dailyCheckIn";

const STORAGE_KEY = "texas-poker:daily-tasks";
export const DAILY_TASKS_CHANGE_EVENT = "texas-poker-daily-tasks-change";
export const DAILY_SPECTATE_HANDS_TARGET = 5;
export const DAILY_COACHING_TARGET = 1;
export const DAILY_TASKS_COMPLETE_COPY = {
  en: "Daily goals complete — nice session!",
  zh: "今日任务已完成 — 继续保持！",
} as const;
const MAX_SEEN_HANDS = 24;

export type DailyTasksState = {
  coachingCount: number;
  dayKey: string;
  seenHands: string[];
};

export const EMPTY_DAILY_TASKS: DailyTasksState = {
  dayKey: "",
  seenHands: [],
  coachingCount: 0,
};

let cachedRaw: string | null | undefined;
let cachedState: DailyTasksState = EMPTY_DAILY_TASKS;

function handKey(tableId: string, handId: number) {
  return `${tableId}:${handId}`;
}

function commitCache(raw: string | null, state: DailyTasksState) {
  cachedRaw = raw;
  cachedState = state;
}

function parseStoredState(raw: string): DailyTasksState {
  const parsed = JSON.parse(raw) as Partial<DailyTasksState>;
  return {
    dayKey: typeof parsed.dayKey === "string" ? parsed.dayKey : "",
    seenHands: Array.isArray(parsed.seenHands)
      ? parsed.seenHands.filter((entry): entry is string => typeof entry === "string")
      : [],
    coachingCount:
      typeof parsed.coachingCount === "number" && parsed.coachingCount >= 0 ? parsed.coachingCount : 0,
  };
}

function createTodayResetState(): DailyTasksState {
  return {
    dayKey: todayDayKey(),
    seenHands: [],
    coachingCount: 0,
  };
}

/** Keep snapshot referentially stable for useSyncExternalStore when the day rolls over. */
function ensureTodayState(state: DailyTasksState): DailyTasksState {
  const today = todayDayKey();
  if (state.dayKey === today) {
    return state;
  }

  const reset = createTodayResetState();
  if (typeof localStorage !== "undefined") {
    const nextRaw = JSON.stringify(reset);
    localStorage.setItem(STORAGE_KEY, nextRaw);
    commitCache(nextRaw, reset);
  } else {
    commitCache(null, reset);
  }
  return reset;
}

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DAILY_TASKS_CHANGE_EVENT));
  }
}

function persistState(state: DailyTasksState) {
  if (typeof localStorage === "undefined") {
    return state;
  }

  const raw = JSON.stringify(state);
  localStorage.setItem(STORAGE_KEY, raw);
  commitCache(raw, state);
  emitChange();
  return state;
}

export function readDailyTasks(): DailyTasksState {
  if (typeof localStorage === "undefined") {
    return EMPTY_DAILY_TASKS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return ensureTodayState(cachedState);
    }

    if (!raw) {
      const next = ensureTodayState(EMPTY_DAILY_TASKS);
      commitCache(typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null, next);
      return next;
    }

    const parsed = ensureTodayState(parseStoredState(raw));
    commitCache(typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null, parsed);
    return parsed;
  } catch {
    commitCache(null, EMPTY_DAILY_TASKS);
    return EMPTY_DAILY_TASKS;
  }
}

export function getDailyTasksProgress(state = readDailyTasks()) {
  const spectateHands = Math.min(state.seenHands.length, DAILY_SPECTATE_HANDS_TARGET);
  const coaching = Math.min(state.coachingCount, DAILY_COACHING_TARGET);
  return {
    coaching,
    coachingTarget: DAILY_COACHING_TARGET,
    complete: spectateHands >= DAILY_SPECTATE_HANDS_TARGET && coaching >= DAILY_COACHING_TARGET,
    spectateHands,
    spectateTarget: DAILY_SPECTATE_HANDS_TARGET,
  };
}

export function recordDailySpectatedHand(tableId: string, handId: number): DailyTasksState {
  if (handId <= 0) {
    return readDailyTasks();
  }

  const current = readDailyTasks();
  const key = handKey(tableId, handId);
  if (current.seenHands.includes(key)) {
    return current;
  }

  return persistState({
    ...current,
    dayKey: todayDayKey(),
    seenHands: [...current.seenHands, key].slice(-MAX_SEEN_HANDS),
  });
}

export function recordDailyCoachingSubmission(): DailyTasksState {
  const current = readDailyTasks();
  return persistState({
    ...current,
    dayKey: todayDayKey(),
    coachingCount: current.coachingCount + 1,
  });
}

export function subscribeDailyTasks(onStoreChange: () => void) {
  window.addEventListener(DAILY_TASKS_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(DAILY_TASKS_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function getDailyTasksSnapshot(): DailyTasksState {
  return readDailyTasks();
}

export function getServerDailyTasksSnapshot(): DailyTasksState {
  return EMPTY_DAILY_TASKS;
}
