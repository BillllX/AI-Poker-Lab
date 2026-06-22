const KEY_PREFIX = "texas-poker:coaching-streak:";
const WINDOW_HANDS = 3;
const TARGET_SUBMISSIONS = 3;

type CoachingStreakState = {
  activeCoach: boolean;
  submissions: number[];
};

function storageKey(tableId: string) {
  return `${KEY_PREFIX}${tableId}`;
}

function readState(tableId: string): CoachingStreakState {
  if (typeof window === "undefined") {
    return { activeCoach: false, submissions: [] };
  }

  try {
    const stored = sessionStorage.getItem(storageKey(tableId));
    if (!stored) {
      return { activeCoach: false, submissions: [] };
    }
    const parsed = JSON.parse(stored) as CoachingStreakState;
    return {
      activeCoach: Boolean(parsed.activeCoach),
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions.filter((handId) => Number.isInteger(handId)) : [],
    };
  } catch {
    return { activeCoach: false, submissions: [] };
  }
}

function writeState(tableId: string, state: CoachingStreakState) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(storageKey(tableId), JSON.stringify(state));
}

function countInWindow(submissions: number[], handId: number) {
  const minHandId = Math.max(0, handId - (WINDOW_HANDS - 1));
  return submissions.filter((entry) => entry >= minHandId && entry <= handId).length;
}

export function getCoachingStreak(tableId: string) {
  const state = readState(tableId);
  const latestHandId = state.submissions.at(-1) ?? 0;
  return {
    activeCoach: state.activeCoach,
    count: countInWindow(state.submissions, latestHandId),
    target: TARGET_SUBMISSIONS,
  };
}

export function recordCoachingSubmission(tableId: string, handId: number) {
  const state = readState(tableId);
  const submissions = [...state.submissions, handId];
  const count = countInWindow(submissions, handId);
  const activeCoach = state.activeCoach || count >= TARGET_SUBMISSIONS;
  const nextState: CoachingStreakState = { activeCoach, submissions: submissions.slice(-12) };
  writeState(tableId, nextState);

  return {
    activeCoach,
    count: Math.min(count, TARGET_SUBMISSIONS),
    newlyActive: activeCoach && !state.activeCoach,
    target: TARGET_SUBMISSIONS,
  };
}

export function resetCoachingStreak(tableId: string) {
  writeState(tableId, { activeCoach: false, submissions: [] });
}
