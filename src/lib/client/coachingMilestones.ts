const STORAGE_KEY = "texas-poker:coaching-submission-total";

/** Lifetime coaching submission counts that trigger a milestone toast. */
export const COACHING_SUBMISSION_MILESTONES = [1, 3, 5, 10, 25] as const;

function readTotal() {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeTotal(count: number) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, String(count));
}

export function incrementCoachingSubmissionTotal() {
  const count = readTotal() + 1;
  writeTotal(count);
  const milestone = COACHING_SUBMISSION_MILESTONES.find((value) => value === count);
  return { count, milestone };
}

export function coachingSubmissionTotal() {
  return readTotal();
}
