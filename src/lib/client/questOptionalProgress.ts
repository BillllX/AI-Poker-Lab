import { todayDayKey } from "@/lib/client/dailyCheckIn";

const SHARE_KEY = "texas-poker:quest-share";
const PRACTICE_KEY = "texas-poker:quest-practice";
const QUICK_PLAY_KEY = "texas-poker:quest-quick-play";
export const QUEST_OPTIONAL_CHANGE_EVENT = "texas-poker-quest-optional-change";

export type QuestOptionalSnapshot = {
  practice: boolean;
  quickPlay: boolean;
  share: boolean;
};

const EMPTY_OPTIONAL_SNAPSHOT: QuestOptionalSnapshot = { practice: false, quickPlay: false, share: false };

/** Cached snapshot — useSyncExternalStore requires referential stability. */
let cachedOptionalSnapshot: QuestOptionalSnapshot = EMPTY_OPTIONAL_SNAPSHOT;

type DayFlag = { dayKey: string };

function readFlag(key: string): DayFlag | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as DayFlag;
    return typeof parsed.dayKey === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function writeFlag(key: string, field: keyof QuestOptionalSnapshot) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(key, JSON.stringify({ dayKey: todayDayKey() } satisfies DayFlag));
  if (!cachedOptionalSnapshot[field]) {
    cachedOptionalSnapshot = { ...cachedOptionalSnapshot, [field]: true };
  }
  window.dispatchEvent(new Event(QUEST_OPTIONAL_CHANGE_EVENT));
}

export function isQuestShareCompleteToday() {
  const flag = readFlag(SHARE_KEY);
  return flag?.dayKey === todayDayKey();
}

export function isQuestPracticeCompleteToday() {
  const flag = readFlag(PRACTICE_KEY);
  return flag?.dayKey === todayDayKey();
}

export function isQuestQuickPlayCompleteToday() {
  const flag = readFlag(QUICK_PLAY_KEY);
  return flag?.dayKey === todayDayKey();
}

export function recordQuestShareComplete() {
  writeFlag(SHARE_KEY, "share");
}

export function recordQuestPracticeVisit() {
  writeFlag(PRACTICE_KEY, "practice");
}

export function recordQuestQuickPlayComplete() {
  writeFlag(QUICK_PLAY_KEY, "quickPlay");
}

export function subscribeQuestOptional(onStoreChange: () => void) {
  window.addEventListener(QUEST_OPTIONAL_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(QUEST_OPTIONAL_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function getQuestOptionalSnapshot(): QuestOptionalSnapshot {
  const practice = isQuestPracticeCompleteToday();
  const quickPlay = isQuestQuickPlayCompleteToday();
  const share = isQuestShareCompleteToday();
  if (
    cachedOptionalSnapshot.practice === practice &&
    cachedOptionalSnapshot.quickPlay === quickPlay &&
    cachedOptionalSnapshot.share === share
  ) {
    return cachedOptionalSnapshot;
  }
  cachedOptionalSnapshot = { practice, quickPlay, share };
  return cachedOptionalSnapshot;
}

export function getServerQuestOptionalSnapshot(): QuestOptionalSnapshot {
  return EMPTY_OPTIONAL_SNAPSHOT;
}
