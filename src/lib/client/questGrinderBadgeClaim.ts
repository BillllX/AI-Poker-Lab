import { todayDayKey } from "@/lib/client/dailyCheckIn";
import { withBasePath } from "@/lib/client/basePath";

const AUTO_CLAIM_KEY = "texas-poker:quest-grinder-auto";

export type GrinderClaimResult = "earned" | "login_required" | "unavailable" | "error";

type DayFlag = { dayKey: string };

function readAutoClaimFlag(): DayFlag | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(AUTO_CLAIM_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as DayFlag;
    return typeof parsed.dayKey === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function writeAutoClaimFlag() {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(AUTO_CLAIM_KEY, JSON.stringify({ dayKey: todayDayKey() } satisfies DayFlag));
}

export function hasAttemptedGrinderAutoClaimToday() {
  return readAutoClaimFlag()?.dayKey === todayDayKey();
}

export async function fetchTodayBadgeKinds(): Promise<string[] | "login_required"> {
  const response = await fetch(withBasePath("/api/users/me/daily-badges"), { cache: "no-store" });
  if (response.status === 401) {
    return "login_required";
  }
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as { badges?: Array<{ badge: string }> };
  return (payload.badges ?? []).map((entry) => entry.badge);
}

export async function claimGrinderBadgeFromQuestCore(): Promise<GrinderClaimResult> {
  const response = await fetch(withBasePath("/api/users/me/daily-badges"), {
    body: JSON.stringify({ badge: "grinder", context: "quest_core" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  if (response.status === 401) {
    return "login_required";
  }
  if (response.ok) {
    return "earned";
  }
  if (response.status === 409) {
    return "unavailable";
  }
  return "error";
}

export async function tryAutoClaimGrinderFromQuestCore(): Promise<GrinderClaimResult | "skipped"> {
  if (hasAttemptedGrinderAutoClaimToday()) {
    return "skipped";
  }
  writeAutoClaimFlag();
  return claimGrinderBadgeFromQuestCore();
}

/** Test-only reset. */
export function resetGrinderAutoClaimForTests() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(AUTO_CLAIM_KEY);
  }
}
