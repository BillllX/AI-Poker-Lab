import { strict as assert } from "node:assert";

type StorageLike = {
  clear(): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

function installBrowserGlobals() {
  const memory = new Map<string, string>();
  const listeners = new Map<string, Set<(event: Event) => void>>();
  const localStorage: StorageLike = {
    clear: () => memory.clear(),
    getItem: (key) => memory.get(key) ?? null,
    removeItem: (key) => memory.delete(key),
    setItem: (key, value) => memory.set(key, value),
  };

  const windowLike = {
    addEventListener(type: string, listener: (event: Event) => void) {
      const bucket = listeners.get(type) ?? new Set();
      bucket.add(listener);
      listeners.set(type, bucket);
    },
    dispatchEvent(event: Event) {
      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
    removeEventListener(type: string, listener: (event: Event) => void) {
      listeners.get(type)?.delete(listener);
    },
  };

  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStorage });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: localStorage });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowLike,
  });
}

function assertStable(label: string, read: () => unknown) {
  const first = read();
  const second = read();
  assert.equal(
    Object.is(first, second),
    true,
    `${label}: consecutive getSnapshot calls must return the same reference (React #185 guard)`,
  );
}

async function main() {
  installBrowserGlobals();

  const { readCheckInState, checkInToday, isCheckedInToday } = await import(
    "../src/lib/client/dailyCheckIn"
  );
  const { getDailyTasksSnapshot, readDailyTasks, recordDailyCoachingSubmission } = await import(
    "../src/lib/client/dailyTasks"
  );
  const { getCurrentStorageUserId, getUserScopedStorageKey, setCurrentStorageUserId } = await import(
    "../src/lib/client/userScopedStorage"
  );
  const {
    getQuestOptionalSnapshot,
    recordQuestPracticeVisit,
    recordQuestQuickPlayComplete,
    recordQuestShareComplete,
  } = await import("../src/lib/client/questOptionalProgress");
  const { readRecentSpectate } = await import("../src/lib/client/recentSpectate");
  const { listFavoriteAgents } = await import("../src/lib/client/agentFavorites");
  const { drainEngagementEvents } = await import("../src/lib/client/engagementAnalytics");
  const { drainStoredToasts } = await import("../src/lib/client/engagementToast");
  const { syncQuestCompletionTelemetry, resetQuestCompletionTelemetryForTests } = await import(
    "../src/lib/client/questCompletionTelemetry"
  );
  const { readQuestHistory, upsertTodayQuestHistory } = await import("../src/lib/client/questHistory");
  const { claimQuestCoreBonus, fetchScopedQuestBonusSummary, resolveScopedQuestBonusDisplay } = await import(
    "../src/lib/client/questBonusClient"
  );

  assertStable("readCheckInState(empty)", readCheckInState);
  checkInToday();
  assertStable("readCheckInState(after check-in)", readCheckInState);

  setCurrentStorageUserId(null);
  localStorage.setItem(
    getUserScopedStorageKey("texas-poker:daily-tasks"),
    JSON.stringify({ dayKey: "2020-01-01", seenHands: ["t:1"], coachingCount: 2 }),
  );
  assertStable("readDailyTasks(stale dayKey)", readDailyTasks);
  assertStable("getDailyTasksSnapshot(stale dayKey)", getDailyTasksSnapshot);

  localStorage.clear();
  assertStable("getDailyTasksSnapshot(fresh)", getDailyTasksSnapshot);

  setCurrentStorageUserId("user-a");
  recordDailyCoachingSubmission();
  assert.equal(readDailyTasks().coachingCount, 1, "user A dailyTasks coachingCount");
  assertStable("readDailyTasks(user A)", readDailyTasks);

  setCurrentStorageUserId("user-b");
  assertStable("readDailyTasks(user B empty)", readDailyTasks);
  assert.equal(readDailyTasks().coachingCount, 0, "user B starts with empty dailyTasks");
  recordDailyCoachingSubmission();
  recordDailyCoachingSubmission();
  assert.equal(readDailyTasks().coachingCount, 2, "user B dailyTasks coachingCount");
  assertStable("readDailyTasks(user B after writes)", readDailyTasks);

  setCurrentStorageUserId("user-a");
  assertStable("readDailyTasks(user A restored)", readDailyTasks);
  assert.equal(readDailyTasks().coachingCount, 1, "user A dailyTasks restored");
  assertStable("getDailyTasksSnapshot(user A restored)", getDailyTasksSnapshot);

  localStorage.clear();
  setCurrentStorageUserId("user-a");
  checkInToday();
  assert.equal(isCheckedInToday(readCheckInState()), true, "user A dailyCheckIn checked in");
  assertStable("readCheckInState(user A after check-in)", readCheckInState);

  setCurrentStorageUserId("user-b");
  assertStable("readCheckInState(user B empty)", readCheckInState);
  assert.equal(isCheckedInToday(readCheckInState()), false, "user B dailyCheckIn not checked in");
  checkInToday();
  assert.equal(isCheckedInToday(readCheckInState()), true, "user B dailyCheckIn checked in");
  assertStable("readCheckInState(user B after check-in)", readCheckInState);

  setCurrentStorageUserId("user-a");
  assertStable("readCheckInState(user A restored)", readCheckInState);
  assert.equal(isCheckedInToday(readCheckInState()), true, "user A dailyCheckIn restored");
  assert.equal(readCheckInState().totalCheckIns, 1, "user A dailyCheckIn totalCheckIns restored");

  setCurrentStorageUserId(null);
  assertStable("getQuestOptionalSnapshot(guest empty)", getQuestOptionalSnapshot);
  recordQuestShareComplete();
  recordQuestPracticeVisit();
  recordQuestQuickPlayComplete();
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    { practice: false, quickPlay: false, share: false },
    "guest questOptionalProgress must not write",
  );

  setCurrentStorageUserId("user-a");
  assertStable("getQuestOptionalSnapshot(user A empty)", getQuestOptionalSnapshot);
  recordQuestShareComplete();
  recordQuestQuickPlayComplete();
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    { practice: false, quickPlay: true, share: true },
    "user A questOptionalProgress flags",
  );
  assertStable("getQuestOptionalSnapshot(user A after writes)", getQuestOptionalSnapshot);

  setCurrentStorageUserId("user-b");
  assertStable("getQuestOptionalSnapshot(user B empty)", getQuestOptionalSnapshot);
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    { practice: false, quickPlay: false, share: false },
    "user B questOptionalProgress starts empty",
  );
  recordQuestPracticeVisit();
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    { practice: true, quickPlay: false, share: false },
    "user B questOptionalProgress flags",
  );

  setCurrentStorageUserId("user-a");
  assertStable("getQuestOptionalSnapshot(user A restored)", getQuestOptionalSnapshot);
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    { practice: false, quickPlay: true, share: true },
    "user A questOptionalProgress restored",
  );

  setCurrentStorageUserId("user-c");
  recordQuestShareComplete();
  const userCBeforeQuickPlay = getQuestOptionalSnapshot();
  assert.deepEqual(
    userCBeforeQuickPlay,
    { practice: false, quickPlay: false, share: true },
    "user C questOptionalProgress before user D quick-play",
  );

  setCurrentStorageUserId("user-d");
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    { practice: false, quickPlay: false, share: false },
    "user D questOptionalProgress starts empty before quick-play",
  );
  recordQuestQuickPlayComplete();
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    { practice: false, quickPlay: true, share: false },
    "user D quick-play writes latest scope only",
  );

  setCurrentStorageUserId("user-c");
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    userCBeforeQuickPlay,
    "user C questOptionalProgress must not be changed by user D quick-play",
  );
  assertStable("getQuestOptionalSnapshot(user C after user D quick-play)", getQuestOptionalSnapshot);

  setCurrentStorageUserId("user-e");
  recordQuestQuickPlayComplete();
  const userEBeforeSharePractice = getQuestOptionalSnapshot();
  assert.deepEqual(
    userEBeforeSharePractice,
    { practice: false, quickPlay: true, share: false },
    "user E questOptionalProgress before user F share/practice",
  );

  setCurrentStorageUserId("user-f");
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    { practice: false, quickPlay: false, share: false },
    "user F questOptionalProgress starts empty before share/practice",
  );
  recordQuestShareComplete();
  recordQuestPracticeVisit();
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    { practice: true, quickPlay: false, share: true },
    "user F share/practice writes latest scope only",
  );

  setCurrentStorageUserId("user-e");
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    userEBeforeSharePractice,
    "user E questOptionalProgress must not be changed by user F share/practice",
  );
  assertStable("getQuestOptionalSnapshot(user E after user F share/practice)", getQuestOptionalSnapshot);

  setCurrentStorageUserId("user-g");
  recordQuestQuickPlayComplete();
  const userGBeforeGuestRecords = getQuestOptionalSnapshot();
  assert.deepEqual(
    userGBeforeGuestRecords,
    { practice: false, quickPlay: true, share: false },
    "user G questOptionalProgress before guest records",
  );

  setCurrentStorageUserId(null);
  recordQuestShareComplete();
  recordQuestPracticeVisit();
  recordQuestQuickPlayComplete();
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    { practice: false, quickPlay: false, share: false },
    "guest questOptionalProgress records remain no-op after user G",
  );

  setCurrentStorageUserId("user-g");
  assert.deepEqual(
    getQuestOptionalSnapshot(),
    userGBeforeGuestRecords,
    "user G questOptionalProgress must not be changed by guest records",
  );
  assertStable("getQuestOptionalSnapshot(user G after guest records)", getQuestOptionalSnapshot);

  assertStable("readRecentSpectate(empty)", readRecentSpectate);

  localStorage.setItem(
    "texas-poker:recent-spectate",
    JSON.stringify({ tableId: "t1", tableName: "Table 1", visitedAt: new Date().toISOString() }),
  );
  assertStable("readRecentSpectate(entry)", readRecentSpectate);

  assertStable("listFavoriteAgents(empty)", listFavoriteAgents);

  localStorage.setItem(
    "texas-poker:agent-favorites",
    JSON.stringify([{ id: "a1", name: "Agent", savedAt: "2026-06-22T00:00:00.000Z" }]),
  );
  assertStable("listFavoriteAgents(one entry)", listFavoriteAgents);

  const completedQuest = {
    complete: true,
    description: "Check in",
    id: "check_in",
    kind: "optional",
    progress: 1,
    reward: { hintKey: "check_in", stars: 1 },
    target: 1,
    title: "Check in",
  } as const;
  const incompleteQuest = {
    complete: false,
    description: "Spectate",
    id: "spectate",
    kind: "core",
    progress: 0,
    reward: { hintKey: "spectate", stars: 1 },
    target: 1,
    title: "Spectate",
  } as const;
  const questBoard = [completedQuest, incompleteQuest];

  setCurrentStorageUserId(null);
  assertStable("readQuestHistory(guest empty)", readQuestHistory);
  upsertTodayQuestHistory(questBoard);
  assert.equal(readQuestHistory().length, 0, "guest upsertTodayQuestHistory must not write");
  resetQuestCompletionTelemetryForTests();
  syncQuestCompletionTelemetry(questBoard);
  assert.equal(drainEngagementEvents().length, 0, "guest syncQuestCompletionTelemetry must not track");

  setCurrentStorageUserId("user-a");
  upsertTodayQuestHistory(questBoard);
  assertStable("readQuestHistory(user A one entry)", readQuestHistory);
  assert.equal(readQuestHistory().length, 1, "user A quest history writes one entry");
  assert.deepEqual(readQuestHistory()[0]?.completedIds, ["check_in"], "user A quest history completed ids");

  setCurrentStorageUserId("user-b");
  assertStable("readQuestHistory(user B empty)", readQuestHistory);
  assert.equal(readQuestHistory().length, 0, "user B quest history starts empty");
  upsertTodayQuestHistory([{ ...completedQuest, id: "coach", kind: "core", reward: { hintKey: "coach", stars: 1 } }]);
  assert.equal(readQuestHistory().length, 1, "user B quest history writes one entry");
  assert.deepEqual(readQuestHistory()[0]?.completedIds, ["coach"], "user B quest history completed ids");

  setCurrentStorageUserId("user-a");
  assertStable("readQuestHistory(user A restored)", readQuestHistory);
  assert.deepEqual(readQuestHistory()[0]?.completedIds, ["check_in"], "user A quest history restored");

  sessionStorage.clear();
  resetQuestCompletionTelemetryForTests();
  setCurrentStorageUserId("user-a");
  syncQuestCompletionTelemetry(questBoard);
  syncQuestCompletionTelemetry(questBoard);
  assert.equal(drainEngagementEvents().length, 1, "user A quest telemetry dedupes per user");
  setCurrentStorageUserId("user-b");
  syncQuestCompletionTelemetry(questBoard);
  assert.equal(drainEngagementEvents().length, 1, "user B quest telemetry is not suppressed by user A");

  setCurrentStorageUserId("user-h");
  upsertTodayQuestHistory(questBoard);
  const userHHistoryBeforeGuest = readQuestHistory();
  assert.deepEqual(userHHistoryBeforeGuest[0]?.completedIds, ["check_in"], "user H quest history baseline");
  drainEngagementEvents();
  resetQuestCompletionTelemetryForTests();
  syncQuestCompletionTelemetry(questBoard);
  assert.equal(drainEngagementEvents().length, 1, "user H quest telemetry baseline");

  setCurrentStorageUserId(null);
  upsertTodayQuestHistory([{ ...completedQuest, id: "share", reward: { hintKey: "share", stars: 1 } }]);
  assert.equal(readQuestHistory().length, 0, "guest quest history stays empty after user H");
  syncQuestCompletionTelemetry(questBoard);
  assert.equal(drainEngagementEvents().length, 0, "guest quest telemetry stays empty after user H");

  setCurrentStorageUserId("user-h");
  assert.deepEqual(readQuestHistory(), userHHistoryBeforeGuest, "user H quest history unchanged after guest");
  syncQuestCompletionTelemetry(questBoard);
  assert.equal(drainEngagementEvents().length, 0, "user H telemetry dedupe unchanged after guest");

  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  const userASummary = { breakdown: [{ amount: 10, reason: "quest_core_a" }], grantedToday: 10 };
  const userBSummary = { breakdown: [{ amount: 20, reason: "quest_core_b" }], grantedToday: 20 };
  const userHSummary = { breakdown: [{ amount: 30, reason: "quest_core_h" }], grantedToday: 30 };
  const userISummary = { breakdown: [{ amount: 40, reason: "quest_core_i" }], grantedToday: 40 };
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    fetchCallCount += 1;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    assert.match(url, /\/api\/users\/me\/quest-bonus$/, "fetchScopedQuestBonusSummary should GET quest-bonus");
    const scopeUserId = getCurrentStorageUserId();
    if (scopeUserId === "user-a") {
      return new Response(JSON.stringify(userASummary), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }
    if (scopeUserId === "user-b") {
      return new Response(JSON.stringify(userBSummary), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }
    if (scopeUserId === "user-h") {
      return new Response(JSON.stringify(userHSummary), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }
    if (scopeUserId === "user-i") {
      return new Response(JSON.stringify(userISummary), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }
    throw new Error(`unexpected fetch scope userId: ${String(scopeUserId)}`);
  }) as typeof fetch;

  try {
    setCurrentStorageUserId(null);
    fetchCallCount = 0;
    const guestResult = await fetchScopedQuestBonusSummary();
    assert.equal(fetchCallCount, 0, "guest scope must not fetch quest-bonus summary");
    assert.equal(guestResult.userId, null, "guest scope userId");
    assert.equal(guestResult.summary, null, "guest scope summary");

    setCurrentStorageUserId("user-a");
    fetchCallCount = 0;
    const userAResult = await fetchScopedQuestBonusSummary();
    assert.equal(fetchCallCount, 1, "user-a scope should fetch quest-bonus summary once");
    assert.equal(userAResult.userId, "user-a", "user-a scope userId");
    assert.deepEqual(userAResult.summary, userASummary, "user-a scope summary");

    setCurrentStorageUserId("user-b");
    fetchCallCount = 0;
    const userBResult = await fetchScopedQuestBonusSummary();
    assert.equal(fetchCallCount, 1, "user-b scope should fetch quest-bonus summary again");
    assert.equal(userBResult.userId, "user-b", "user-b scope userId");
    assert.deepEqual(userBResult.summary, userBSummary, "user-b scope summary");
    assert.notDeepEqual(userBResult.summary, userASummary, "user-b scope summary must not be user-a payload");

    const staleUserADisplay = resolveScopedQuestBonusDisplay(userAResult, "user-b");
    assert.equal(staleUserADisplay, undefined, "user-a summary must not display after switching to user-b");
    const userBDisplay = resolveScopedQuestBonusDisplay(userBResult, "user-b");
    assert.deepEqual(
      userBDisplay,
      { bonusBreakdown: userBSummary.breakdown, bonusToday: userBSummary.grantedToday },
      "user-b summary display state",
    );

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const userHResult = await fetchScopedQuestBonusSummary();
    assert.equal(fetchCallCount, 1, "user-h scope should fetch quest-bonus summary once");
    assert.equal(userHResult.userId, "user-h", "user-h scope userId");
    assert.deepEqual(userHResult.summary, userHSummary, "user-h scope summary baseline");

    setCurrentStorageUserId(null);
    fetchCallCount = 0;
    const guestAfterUserHResult = await fetchScopedQuestBonusSummary();
    assert.equal(fetchCallCount, 0, "guest summary after user-h must not fetch");
    assert.equal(guestAfterUserHResult.summary, null, "guest summary after user-h remains empty");

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const userHResultAfterGuest = await fetchScopedQuestBonusSummary();
    assert.equal(fetchCallCount, 1, "user-h summary should still fetch after guest");
    assert.deepEqual(userHResultAfterGuest.summary, userHSummary, "user-h summary unchanged after guest");

    setCurrentStorageUserId(null);
    const staleUserHDisplayInGuest = resolveScopedQuestBonusDisplay(userHResult, getCurrentStorageUserId());
    assert.equal(staleUserHDisplayInGuest, undefined, "user-h stale summary must not display in guest scope");

    setCurrentStorageUserId("user-i");
    const staleUserHDisplayInUserI = resolveScopedQuestBonusDisplay(userHResult, getCurrentStorageUserId());
    assert.equal(staleUserHDisplayInUserI, undefined, "user-h stale summary must not display in user-i scope");
    fetchCallCount = 0;
    const userIResult = await fetchScopedQuestBonusSummary();
    assert.equal(fetchCallCount, 1, "user-i summary should fetch once");
    const userIDisplay = resolveScopedQuestBonusDisplay(userIResult, getCurrentStorageUserId());
    assert.deepEqual(
      userIDisplay,
      { bonusBreakdown: userISummary.breakdown, bonusToday: userISummary.grantedToday },
      "user-i summary display state",
    );
  } finally {
    setCurrentStorageUserId(null);
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCallCount += 1;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    assert.match(url, /\/api\/users\/me\/quest-bonus$/, "claimQuestCoreBonus should POST quest-bonus");
    assert.equal(init?.method, "POST", "claimQuestCoreBonus should use POST");
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body, { reason: "quest_core" }, "claimQuestCoreBonus POST body");
    const scopeUserId = getCurrentStorageUserId();
    if (scopeUserId === "user-a") {
      return new Response(JSON.stringify({ granted: 11 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }
    if (scopeUserId === "user-b") {
      return new Response(JSON.stringify({ granted: 22 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }
    if (scopeUserId === "user-h") {
      return new Response(JSON.stringify({ granted: 33 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }
    throw new Error(`unexpected fetch scope userId: ${String(scopeUserId)}`);
  }) as typeof fetch;

  try {
    setCurrentStorageUserId(null);
    fetchCallCount = 0;
    const guestClaim = await claimQuestCoreBonus("zh");
    assert.equal(fetchCallCount, 0, "guest claimQuestCoreBonus must not fetch");
    assert.equal(guestClaim, null, "guest claimQuestCoreBonus result");

    setCurrentStorageUserId("user-a");
    fetchCallCount = 0;
    const userAClaim = await claimQuestCoreBonus("zh");
    assert.equal(fetchCallCount, 1, "user-a claimQuestCoreBonus should fetch once");
    assert.equal(userAClaim, 11, "user-a claimQuestCoreBonus granted");

    setCurrentStorageUserId("user-b");
    fetchCallCount = 0;
    const userBClaim = await claimQuestCoreBonus("zh");
    assert.equal(fetchCallCount, 1, "user-b claimQuestCoreBonus should fetch again");
    assert.equal(userBClaim, 22, "user-b claimQuestCoreBonus granted");
    assert.notEqual(userBClaim, userAClaim, "user-b claim must not reuse user-a granted");

    setCurrentStorageUserId("user-h");
    sessionStorage.clear();
    fetchCallCount = 0;
    const userHClaim = await claimQuestCoreBonus("zh");
    assert.equal(fetchCallCount, 1, "user-h claimQuestCoreBonus should fetch once");
    assert.equal(userHClaim, 33, "user-h claimQuestCoreBonus granted");
    assert.equal(drainEngagementEvents().length, 1, "user-h claimQuestCoreBonus tracks once");

    setCurrentStorageUserId(null);
    fetchCallCount = 0;
    const guestClaimAfterUserH = await claimQuestCoreBonus("zh");
    assert.equal(fetchCallCount, 0, "guest claim after user-h must not fetch");
    assert.equal(guestClaimAfterUserH, null, "guest claim after user-h result");
    assert.equal(drainEngagementEvents().length, 0, "guest claim after user-h must not track");

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const userHClaimAfterGuest = await claimQuestCoreBonus("zh");
    assert.equal(fetchCallCount, 1, "user-h claim after guest should fetch");
    assert.equal(userHClaimAfterGuest, 33, "user-h claim after guest granted");

    let resolveDelayedClaim: (response: Response) => void = () => {
      throw new Error("delayed claim resolver was called before fetch started");
    };
    globalThis.fetch = (async () => {
      fetchCallCount += 1;
      return await new Promise<Response>((resolve) => {
        resolveDelayedClaim = resolve;
      });
    }) as typeof fetch;

    setCurrentStorageUserId("user-h");
    drainEngagementEvents();
    drainStoredToasts();
    fetchCallCount = 0;
    const pendingGuestClaim = claimQuestCoreBonus("zh");
    assert.equal(fetchCallCount, 1, "pending user-h claim before guest should fetch once");
    setCurrentStorageUserId(null);
    resolveDelayedClaim(
      new Response(JSON.stringify({ granted: 44 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const staleGuestClaim = await pendingGuestClaim;
    assert.equal(staleGuestClaim, null, "pending user-h claim must not resolve after switching to guest");
    assert.equal(drainEngagementEvents().length, 0, "pending user-h claim switched to guest must not track");
    assert.equal(drainStoredToasts().length, 0, "pending user-h claim switched to guest must not toast");

    setCurrentStorageUserId("user-h");
    drainEngagementEvents();
    drainStoredToasts();
    fetchCallCount = 0;
    const pendingUserIClaim = claimQuestCoreBonus("zh");
    assert.equal(fetchCallCount, 1, "pending user-h claim before user-i should fetch once");
    setCurrentStorageUserId("user-i");
    resolveDelayedClaim(
      new Response(JSON.stringify({ granted: 55 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const staleUserIClaim = await pendingUserIClaim;
    assert.equal(staleUserIClaim, null, "pending user-h claim must not resolve after switching to user-i");
    assert.equal(drainEngagementEvents().length, 0, "pending user-h claim switched to user-i must not track");
    assert.equal(drainStoredToasts().length, 0, "pending user-h claim switched to user-i must not toast");
  } finally {
    setCurrentStorageUserId(null);
    globalThis.fetch = originalFetch;
  }

  const { tryQuestActiveRewards } = await import("../src/lib/client/questActiveRewardClaim");
  const {
    fetchTodayBadgeKinds,
    resetGrinderAutoClaimForTests,
    tryAutoClaimGrinderFromQuestCore,
  } = await import("../src/lib/client/questGrinderBadgeClaim");

  const scopedStorageKeyForUser = (userId: string | null, baseKey: string) => {
    const suffix = baseKey.startsWith("texas-poker:")
      ? baseKey.slice("texas-poker:".length)
      : baseKey;
    return userId
      ? `texas-poker:users:${encodeURIComponent(userId)}:${suffix}`
      : `texas-poker:guest:${suffix}`;
  };
  const activeRewardKey = (userId: string | null) =>
    scopedStorageKeyForUser(userId, "texas-poker:quest-active-reward-auto");
  const grinderAutoKey = (userId: string | null) =>
    scopedStorageKeyForUser(userId, "texas-poker:quest-grinder-auto");

  for (const userId of [null, "user-a", "user/h"] as const) {
    for (const baseKey of [
      "texas-poker:quest-active-reward-auto",
      "texas-poker:quest-grinder-auto",
    ] as const) {
      setCurrentStorageUserId(userId);
      assert.equal(
        scopedStorageKeyForUser(userId, baseKey),
        getUserScopedStorageKey(baseKey),
        `scoped storage key parity for ${String(userId)} ${baseKey}`,
      );
    }
  }

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCallCount += 1;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/api/users/me/daily-badges")) {
      const status = init?.method === "POST" ? 200 : 200;
      return new Response(JSON.stringify({ badges: [] }), {
        headers: { "content-type": "application/json" },
        status,
      });
    }
    if (url.includes("/api/users/me/quest-bonus")) {
      return new Response(JSON.stringify({ granted: 5 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }
    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  try {
    sessionStorage.clear();
    resetGrinderAutoClaimForTests();

    setCurrentStorageUserId(null);
    fetchCallCount = 0;
    const guestActiveReward = await tryQuestActiveRewards(3, "zh");
    assert.equal(fetchCallCount, 0, "guest tryQuestActiveRewards must not fetch");
    assert.equal(guestActiveReward.kind, "login_required", "guest tryQuestActiveRewards login_required");
    assert.equal(
      sessionStorage.getItem(activeRewardKey(null)),
      null,
      "guest tryQuestActiveRewards must not write scoped auto flag",
    );

    setCurrentStorageUserId("user-a");
    fetchCallCount = 0;
    const userAActiveReward = await tryQuestActiveRewards(3, "zh");
    assert.ok(fetchCallCount > 0, "user-a tryQuestActiveRewards should fetch");
    assert.notEqual(userAActiveReward.kind, "skipped", "user-a tryQuestActiveRewards not skipped");
    assert.ok(
      sessionStorage.getItem(activeRewardKey("user-a")),
      "user-a tryQuestActiveRewards writes user-a scoped auto flag",
    );

    setCurrentStorageUserId("user-b");
    fetchCallCount = 0;
    const userBActiveReward = await tryQuestActiveRewards(3, "zh");
    assert.ok(fetchCallCount > 0, "user-b tryQuestActiveRewards should fetch despite user-a flag");
    assert.notEqual(userBActiveReward.kind, "skipped", "user-b tryQuestActiveRewards not skipped by user-a flag");

    sessionStorage.clear();
    resetGrinderAutoClaimForTests();

    setCurrentStorageUserId(null);
    fetchCallCount = 0;
    const guestBadgeKinds = await fetchTodayBadgeKinds();
    assert.equal(fetchCallCount, 0, "guest fetchTodayBadgeKinds must not fetch");
    assert.equal(guestBadgeKinds, "login_required", "guest fetchTodayBadgeKinds login_required");
    assert.equal(
      sessionStorage.getItem(grinderAutoKey(null)),
      null,
      "guest fetchTodayBadgeKinds must not write scoped auto flag",
    );

    fetchCallCount = 0;
    const guestGrinder = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(fetchCallCount, 0, "guest tryAutoClaimGrinderFromQuestCore must not fetch");
    assert.equal(guestGrinder, "login_required", "guest tryAutoClaimGrinderFromQuestCore login_required");
    assert.equal(
      sessionStorage.getItem(grinderAutoKey(null)),
      null,
      "guest tryAutoClaimGrinderFromQuestCore must not write scoped auto flag",
    );

    setCurrentStorageUserId("user-a");
    fetchCallCount = 0;
    const userAGrinder = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(fetchCallCount, 1, "user-a tryAutoClaimGrinderFromQuestCore should fetch once");
    assert.notEqual(userAGrinder, "skipped", "user-a tryAutoClaimGrinderFromQuestCore not skipped");
    assert.ok(
      sessionStorage.getItem(grinderAutoKey("user-a")),
      "user-a tryAutoClaimGrinderFromQuestCore writes user-a scoped auto flag",
    );

    setCurrentStorageUserId("user-b");
    fetchCallCount = 0;
    const userBGrinder = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(fetchCallCount, 1, "user-b tryAutoClaimGrinderFromQuestCore should fetch despite user-a flag");
    assert.notEqual(userBGrinder, "skipped", "user-b tryAutoClaimGrinderFromQuestCore not skipped by user-a flag");

    sessionStorage.clear();
    resetGrinderAutoClaimForTests();

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCallCount += 1;
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/users/me/daily-badges") && init?.method === "POST") {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
      }
      throw new Error(`unexpected fetch url: ${url}`);
    }) as typeof fetch;

    setCurrentStorageUserId("user-a");
    fetchCallCount = 0;
    const activeReward401First = await tryQuestActiveRewards(3, "zh");
    assert.equal(activeReward401First.kind, "login_required", "user-a active reward 401 login_required");
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user-a")),
      null,
      "user-a active reward 401 must not write scoped auto flag",
    );

    fetchCallCount = 0;
    const activeReward401Retry = await tryQuestActiveRewards(3, "zh");
    assert.notEqual(activeReward401Retry.kind, "skipped", "user-a active reward 401 retry not skipped");
    assert.ok(fetchCallCount > 0, "user-a active reward 401 retry should fetch again");

    sessionStorage.clear();
    resetGrinderAutoClaimForTests();

    setCurrentStorageUserId("user-a");
    fetchCallCount = 0;
    const grinder401First = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(grinder401First, "login_required", "user-a grinder 401 login_required");
    assert.equal(
      sessionStorage.getItem(grinderAutoKey("user-a")),
      null,
      "user-a grinder 401 must not write scoped auto flag",
    );

    fetchCallCount = 0;
    const grinder401Retry = await tryAutoClaimGrinderFromQuestCore();
    assert.notEqual(grinder401Retry, "skipped", "user-a grinder 401 retry not skipped");
    assert.equal(fetchCallCount, 1, "user-a grinder 401 retry should fetch again");

    sessionStorage.clear();
    resetGrinderAutoClaimForTests();

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCallCount += 1;
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/users/me/daily-badges") && init?.method === "POST") {
        return new Response(JSON.stringify({ earned: true }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }
      if (url.includes("/api/users/me/quest-bonus") && init?.method === "POST") {
        return new Response(JSON.stringify({ error: "already claimed" }), { status: 409 });
      }
      throw new Error(`unexpected fetch url: ${url}`);
    }) as typeof fetch;

    setCurrentStorageUserId("user-a");
    fetchCallCount = 0;
    const activeReward409First = await tryQuestActiveRewards(3, "zh");
    assert.equal(activeReward409First.kind, "done", "user-a active reward 409 first call done");
    assert.equal(activeReward409First.grantedPoints, 0, "user-a active reward 409 grantedPoints 0");
    assert.equal(activeReward409First.masterBadge, true, "user-a active reward 409 masterBadge earned");
    assert.ok(
      sessionStorage.getItem(activeRewardKey("user-a")),
      "user-a active reward 409 writes user-a scoped auto flag",
    );
    assert.ok(fetchCallCount > 0, "user-a active reward 409 first call should fetch");

    fetchCallCount = 0;
    const activeReward409Second = await tryQuestActiveRewards(3, "zh");
    assert.equal(activeReward409Second.kind, "skipped", "user-a active reward 409 second call skipped");
    assert.equal(fetchCallCount, 0, "user-a active reward 409 second call must not fetch");

    setCurrentStorageUserId("user-b");
    fetchCallCount = 0;
    const activeReward409UserBFirst = await tryQuestActiveRewards(3, "zh");
    assert.ok(fetchCallCount > 0, "user-b active reward 409 first call should fetch despite user-a flag");
    assert.notEqual(activeReward409UserBFirst.kind, "skipped", "user-b active reward 409 first call not skipped");
    assert.equal(activeReward409UserBFirst.kind, "done", "user-b active reward 409 first call done");
    assert.equal(activeReward409UserBFirst.grantedPoints, 0, "user-b active reward 409 grantedPoints 0");
    assert.equal(activeReward409UserBFirst.masterBadge, true, "user-b active reward 409 masterBadge earned");
    assert.ok(
      sessionStorage.getItem(activeRewardKey("user-b")),
      "user-b active reward 409 writes user-b scoped auto flag",
    );

    fetchCallCount = 0;
    const activeReward409UserBSecond = await tryQuestActiveRewards(3, "zh");
    assert.equal(activeReward409UserBSecond.kind, "skipped", "user-b active reward 409 second call skipped");
    assert.equal(fetchCallCount, 0, "user-b active reward 409 second call must not fetch");

    sessionStorage.clear();
    resetGrinderAutoClaimForTests();

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCallCount += 1;
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/users/me/daily-badges") && init?.method === "POST") {
        return new Response(JSON.stringify({ error: "already claimed" }), { status: 409 });
      }
      throw new Error(`unexpected fetch url: ${url}`);
    }) as typeof fetch;

    setCurrentStorageUserId("user-a");
    fetchCallCount = 0;
    const grinder409First = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(grinder409First, "unavailable", "user-a grinder 409 first call unavailable");
    assert.ok(
      sessionStorage.getItem(grinderAutoKey("user-a")),
      "user-a grinder 409 writes user-a scoped auto flag",
    );

    fetchCallCount = 0;
    const grinder409Second = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(grinder409Second, "skipped", "user-a grinder 409 second call skipped");
    assert.equal(fetchCallCount, 0, "user-a grinder 409 second call must not fetch");

    setCurrentStorageUserId("user-b");
    fetchCallCount = 0;
    const grinder409UserBFirst = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(fetchCallCount, 1, "user-b grinder 409 first call should fetch despite user-a flag");
    assert.equal(grinder409UserBFirst, "unavailable", "user-b grinder 409 first call unavailable");
    assert.ok(
      sessionStorage.getItem(grinderAutoKey("user-b")),
      "user-b grinder 409 writes user-b scoped auto flag",
    );

    fetchCallCount = 0;
    const grinder409UserBSecond = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(grinder409UserBSecond, "skipped", "user-b grinder 409 second call skipped");
    assert.equal(fetchCallCount, 0, "user-b grinder 409 second call must not fetch");

    sessionStorage.clear();
    resetGrinderAutoClaimForTests();

    let resolveDelayedAutoFetch: (response: Response) => void = () => {
      throw new Error("delayed auto fetch resolver was called before fetch started");
    };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCallCount += 1;
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      assert.ok(
        url.includes("/api/users/me/daily-badges") && init?.method === "POST",
        `unexpected pending auto fetch url: ${url}`,
      );
      return await new Promise<Response>((resolve) => {
        resolveDelayedAutoFetch = resolve;
      });
    }) as typeof fetch;

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    drainEngagementEvents();
    drainStoredToasts();
    const pendingActiveGuest = tryQuestActiveRewards(3, "zh");
    assert.equal(fetchCallCount, 1, "pending active reward before guest should fetch once");
    setCurrentStorageUserId(null);
    resolveDelayedAutoFetch(
      new Response(JSON.stringify({ earned: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const staleActiveGuest = await pendingActiveGuest;
    assert.equal(staleActiveGuest.kind, "skipped", "pending active reward switched to guest skips");
    assert.equal(
      sessionStorage.getItem(activeRewardKey(null)),
      null,
      "pending active reward switched to guest must not write guest flag",
    );
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user-h")),
      null,
      "pending active reward switched to guest must not write original user flag",
    );
    assert.equal(drainEngagementEvents().length, 0, "pending active reward switched to guest must not track");
    assert.equal(drainStoredToasts().length, 0, "pending active reward switched to guest must not toast");

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const activeRetryAfterGuest = tryQuestActiveRewards(3, "zh");
    assert.equal(fetchCallCount, 1, "user-h active reward retry after guest stale skip should fetch");
    resolveDelayedAutoFetch(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }));
    const activeRetryAfterGuestResult = await activeRetryAfterGuest;
    assert.equal(
      activeRetryAfterGuestResult.kind,
      "login_required",
      "user-h active reward retry after guest stale skip must not be skipped",
    );

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    drainEngagementEvents();
    drainStoredToasts();
    const pendingActiveUserI = tryQuestActiveRewards(3, "zh");
    assert.equal(fetchCallCount, 1, "pending active reward before user-i should fetch once");
    setCurrentStorageUserId("user-i");
    resolveDelayedAutoFetch(
      new Response(JSON.stringify({ earned: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const staleActiveUserI = await pendingActiveUserI;
    assert.equal(staleActiveUserI.kind, "skipped", "pending active reward switched to user-i skips");
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user-i")),
      null,
      "pending active reward switched to user-i must not write user-i flag",
    );
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user-h")),
      null,
      "pending active reward switched to user-i must not write original user flag",
    );
    assert.equal(drainEngagementEvents().length, 0, "pending active reward switched to user-i must not track");
    assert.equal(drainStoredToasts().length, 0, "pending active reward switched to user-i must not toast");

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const activeRetryAfterUserI = tryQuestActiveRewards(3, "zh");
    assert.equal(fetchCallCount, 1, "user-h active reward retry after user-i stale skip should fetch");
    resolveDelayedAutoFetch(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }));
    const activeRetryAfterUserIResult = await activeRetryAfterUserI;
    assert.equal(
      activeRetryAfterUserIResult.kind,
      "login_required",
      "user-h active reward retry after user-i stale skip must not be skipped",
    );

    let resolveDelayedActiveBonus: (response: Response) => void = () => {
      throw new Error("delayed active bonus resolver was called before fetch started");
    };
    let resolveActiveBonusStarted: (() => void) | null = null;
    let activeBonusStarted: Promise<void> = Promise.resolve();
    const resetActiveBonusStarted = () => {
      activeBonusStarted = new Promise<void>((resolve) => {
        resolveActiveBonusStarted = resolve;
      });
    };
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCallCount += 1;
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/users/me/daily-badges") && init?.method === "POST") {
        return new Response(JSON.stringify({ earned: true }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }
      assert.ok(
        url.includes("/api/users/me/quest-bonus") && init?.method === "POST",
        `unexpected pending active bonus url: ${url}`,
      );
      resolveActiveBonusStarted?.();
      resolveActiveBonusStarted = null;
      return await new Promise<Response>((resolve) => {
        resolveDelayedActiveBonus = resolve;
      });
    }) as typeof fetch;

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    drainEngagementEvents();
    drainStoredToasts();
    resetActiveBonusStarted();
    const pendingActiveBonusGuest = tryQuestActiveRewards(3, "zh");
    await activeBonusStarted;
    assert.equal(fetchCallCount, 2, "pending active bonus before guest should reach second fetch");
    setCurrentStorageUserId(null);
    resolveDelayedActiveBonus(
      new Response(JSON.stringify({ granted: 8 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const staleActiveBonusGuest = await pendingActiveBonusGuest;
    assert.equal(staleActiveBonusGuest.kind, "skipped", "pending active bonus switched to guest skips");
    assert.equal(
      sessionStorage.getItem(activeRewardKey(null)),
      null,
      "pending active bonus switched to guest must not write guest flag",
    );
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user-h")),
      null,
      "pending active bonus switched to guest must not write original user flag",
    );
    assert.equal(drainEngagementEvents().length, 0, "pending active bonus switched to guest must not track");
    assert.equal(drainStoredToasts().length, 0, "pending active bonus switched to guest must not toast");

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    resetActiveBonusStarted();
    const activeBonusRetryAfterGuest = tryQuestActiveRewards(3, "zh");
    await activeBonusStarted;
    assert.equal(fetchCallCount, 2, "user-h active bonus retry after guest stale skip should reach second fetch");
    resolveDelayedActiveBonus(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }));
    const activeBonusRetryAfterGuestResult = await activeBonusRetryAfterGuest;
    assert.equal(
      activeBonusRetryAfterGuestResult.kind,
      "login_required",
      "user-h active bonus retry after guest stale skip must not be skipped",
    );

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    drainEngagementEvents();
    drainStoredToasts();
    resetActiveBonusStarted();
    const pendingActiveBonusUserI = tryQuestActiveRewards(3, "zh");
    await activeBonusStarted;
    assert.equal(fetchCallCount, 2, "pending active bonus before user-i should reach second fetch");
    setCurrentStorageUserId("user-i");
    resolveDelayedActiveBonus(
      new Response(JSON.stringify({ granted: 9 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    const staleActiveBonusUserI = await pendingActiveBonusUserI;
    assert.equal(staleActiveBonusUserI.kind, "skipped", "pending active bonus switched to user-i skips");
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user-i")),
      null,
      "pending active bonus switched to user-i must not write user-i flag",
    );
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user-h")),
      null,
      "pending active bonus switched to user-i must not write original user flag",
    );
    assert.equal(drainEngagementEvents().length, 0, "pending active bonus switched to user-i must not track");
    assert.equal(drainStoredToasts().length, 0, "pending active bonus switched to user-i must not toast");

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    resetActiveBonusStarted();
    const activeBonusRetryAfterUserI = tryQuestActiveRewards(3, "zh");
    await activeBonusStarted;
    assert.equal(fetchCallCount, 2, "user-h active bonus retry after user-i stale skip should reach second fetch");
    resolveDelayedActiveBonus(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }));
    const activeBonusRetryAfterUserIResult = await activeBonusRetryAfterUserI;
    assert.equal(
      activeBonusRetryAfterUserIResult.kind,
      "login_required",
      "user-h active bonus retry after user-i stale skip must not be skipped",
    );

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCallCount += 1;
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/users/me/daily-badges") && init?.method === "POST") {
        return new Response(JSON.stringify({ earned: true }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }
      if (url.includes("/api/users/me/quest-bonus") && init?.method === "POST") {
        const body = JSON.parse(String(init.body ?? "{}")) as { reason?: string };
        return new Response(JSON.stringify({ granted: body.reason === "quest_master" ? 7 : 6 }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }
      throw new Error(`unexpected active bonus success retry url: ${url}`);
    }) as typeof fetch;

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    drainEngagementEvents();
    drainStoredToasts();
    const activeBonusRetrySuccess = await tryQuestActiveRewards(3, "zh");
    assert.equal(fetchCallCount, 3, "user-h active bonus retry success should fetch badge and bonuses");
    assert.equal(activeBonusRetrySuccess.kind, "done", "user-h active bonus retry success should finish");
    assert.equal(
      activeBonusRetrySuccess.kind === "done" ? activeBonusRetrySuccess.grantedPoints : 0,
      13,
      "user-h active bonus retry success should grant both bonuses",
    );
    assert.ok(
      sessionStorage.getItem(activeRewardKey("user-h")),
      "user-h active bonus retry success writes user-h scoped auto flag",
    );
    const activeBonusRetrySuccessFlag = sessionStorage.getItem(activeRewardKey("user-h"));
    assert.ok(activeBonusRetrySuccessFlag, "user-h active bonus retry success flag exists before second call");
    assert.equal(
      sessionStorage.getItem(activeRewardKey(null)),
      null,
      "user-h active bonus retry success must not write guest flag",
    );
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user-i")),
      null,
      "user-h active bonus retry success must not write user-i flag",
    );

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const activeBonusRetrySuccessSecond = await tryQuestActiveRewards(3, "zh");
    assert.equal(activeBonusRetrySuccessSecond.kind, "skipped", "user-h active bonus retry success second call skipped");
    assert.equal(fetchCallCount, 0, "user-h active bonus retry success second call must not fetch");
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user-h")),
      activeBonusRetrySuccessFlag,
      "user-h active bonus retry success second call must not change flag value",
    );

    setCurrentStorageUserId("user-i");
    fetchCallCount = 0;
    const activeBonusUserIAfterUserHSuccess = await tryQuestActiveRewards(3, "zh");
    assert.equal(fetchCallCount, 3, "user-i active bonus after user-h success should fetch badge and bonuses");
    assert.equal(activeBonusUserIAfterUserHSuccess.kind, "done", "user-i active bonus after user-h success should finish");
    assert.ok(
      sessionStorage.getItem(activeRewardKey("user-i")),
      "user-i active bonus after user-h success writes user-i scoped auto flag",
    );

    setCurrentStorageUserId("user-i");
    fetchCallCount = 0;
    const activeBonusUserIAfterUserHSuccessSecond = await tryQuestActiveRewards(3, "zh");
    assert.equal(
      activeBonusUserIAfterUserHSuccessSecond.kind,
      "skipped",
      "user-i active bonus after user-h success second call skipped",
    );
    assert.equal(fetchCallCount, 0, "user-i active bonus after user-h success second call must not fetch");

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const activeBonusUserHAfterUserISuccess = await tryQuestActiveRewards(3, "zh");
    assert.equal(
      activeBonusUserHAfterUserISuccess.kind,
      "skipped",
      "user-h active bonus after user-i success still skipped",
    );
    assert.equal(fetchCallCount, 0, "user-h active bonus after user-i success must not fetch");
    const activeRewardUserHKey = activeRewardKey("user-h");
    const activeRewardUserIKey = activeRewardKey("user-i");
    assert.notEqual(activeRewardUserHKey, activeRewardUserIKey, "active reward scoped keys must differ by user");
    assert.ok(
      sessionStorage.getItem(activeRewardUserHKey),
      "active bonus user-h scoped auto flag persists after user-i success",
    );
    assert.ok(
      sessionStorage.getItem(activeRewardUserIKey),
      "active bonus user-i scoped auto flag persists alongside user-h flag",
    );

    setCurrentStorageUserId("user/h");
    fetchCallCount = 0;
    drainEngagementEvents();
    drainStoredToasts();
    const activeBonusEncodedUserSuccess = await tryQuestActiveRewards(3, "zh");
    assert.equal(fetchCallCount, 3, "encoded user active bonus success should fetch badge and bonuses");
    assert.equal(activeBonusEncodedUserSuccess.kind, "done", "encoded user active bonus success should finish");
    assert.ok(
      sessionStorage.getItem(activeRewardKey("user/h")),
      "encoded user active bonus success writes encoded scoped auto flag",
    );
    const encodedActiveBonusSuccessFlag = sessionStorage.getItem(activeRewardKey("user/h"));
    assert.ok(encodedActiveBonusSuccessFlag, "encoded user active bonus success flag exists before second call");

    setCurrentStorageUserId("user/h");
    fetchCallCount = 0;
    const activeBonusEncodedUserSecond = await tryQuestActiveRewards(3, "zh");
    assert.equal(activeBonusEncodedUserSecond.kind, "skipped", "encoded user active bonus second call skipped");
    assert.equal(fetchCallCount, 0, "encoded user active bonus second call must not fetch");
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user/h")),
      encodedActiveBonusSuccessFlag,
      "encoded user active bonus second call must not change flag value",
    );
    const encodedActiveRewardFlagBeforeGuest = encodedActiveBonusSuccessFlag;

    setCurrentStorageUserId(null);
    fetchCallCount = 0;
    const activeBonusGuestAfterEncodedUser = await tryQuestActiveRewards(3, "zh");
    assert.equal(
      activeBonusGuestAfterEncodedUser.kind,
      "login_required",
      "guest active bonus after encoded user success login_required",
    );
    assert.equal(fetchCallCount, 0, "guest active bonus after encoded user success must not fetch");
    assert.equal(
      sessionStorage.getItem(activeRewardKey(null)),
      null,
      "guest active bonus after encoded user success must not write guest flag",
    );
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user/h")),
      encodedActiveRewardFlagBeforeGuest,
      "encoded user active reward scoped auto flag persists during guest scope",
    );

    setCurrentStorageUserId("user/h");
    fetchCallCount = 0;
    const activeBonusEncodedUserAfterGuest = await tryQuestActiveRewards(3, "zh");
    assert.equal(
      activeBonusEncodedUserAfterGuest.kind,
      "skipped",
      "encoded user active bonus after guest still skipped",
    );
    assert.equal(fetchCallCount, 0, "encoded user active bonus after guest must not fetch");
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user/h")),
      encodedActiveRewardFlagBeforeGuest,
      "encoded user active reward scoped auto flag persists after guest round trip",
    );

    setCurrentStorageUserId("user-a");
    fetchCallCount = 0;
    const activeBonusUserAAfterEncodedUser = await tryQuestActiveRewards(3, "zh");
    assert.equal(fetchCallCount, 3, "user-a active bonus after encoded user success should fetch badge and bonuses");
    assert.equal(activeBonusUserAAfterEncodedUser.kind, "done", "user-a active bonus after encoded user success should finish");
    assert.ok(
      sessionStorage.getItem(activeRewardKey("user-a")),
      "user-a active bonus after encoded user success writes user-a scoped auto flag",
    );
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user/h")),
      encodedActiveRewardFlagBeforeGuest,
      "user-a active bonus claim must not change encoded user active reward flag value",
    );

    setCurrentStorageUserId("user-a");
    fetchCallCount = 0;
    const activeBonusUserAAfterEncodedUserSecond = await tryQuestActiveRewards(3, "zh");
    assert.equal(
      activeBonusUserAAfterEncodedUserSecond.kind,
      "skipped",
      "user-a active bonus after encoded user success second call skipped",
    );
    assert.equal(fetchCallCount, 0, "user-a active bonus after encoded user success second call must not fetch");
    assert.equal(
      sessionStorage.getItem(activeRewardKey("user/h")),
      encodedActiveRewardFlagBeforeGuest,
      "user-a active bonus second call must not change encoded user active reward flag value",
    );

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCallCount += 1;
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      assert.ok(
        url.includes("/api/users/me/daily-badges") && init?.method === "POST",
        `unexpected pending grinder fetch url: ${url}`,
      );
      return await new Promise<Response>((resolve) => {
        resolveDelayedAutoFetch = resolve;
      });
    }) as typeof fetch;

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const pendingGrinderGuest = tryAutoClaimGrinderFromQuestCore();
    assert.equal(fetchCallCount, 1, "pending grinder before guest should fetch once");
    setCurrentStorageUserId(null);
    resolveDelayedAutoFetch(new Response(JSON.stringify({ earned: true }), { status: 200 }));
    const staleGrinderGuest = await pendingGrinderGuest;
    assert.equal(staleGrinderGuest, "skipped", "pending grinder switched to guest skips");
    assert.equal(
      sessionStorage.getItem(grinderAutoKey(null)),
      null,
      "pending grinder switched to guest must not write guest flag",
    );
    assert.equal(
      sessionStorage.getItem(grinderAutoKey("user-h")),
      null,
      "pending grinder switched to guest must not write original user flag",
    );

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const grinderRetryAfterGuest = tryAutoClaimGrinderFromQuestCore();
    assert.equal(fetchCallCount, 1, "user-h grinder retry after guest stale skip should fetch");
    resolveDelayedAutoFetch(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }));
    const grinderRetryAfterGuestResult = await grinderRetryAfterGuest;
    assert.equal(
      grinderRetryAfterGuestResult,
      "login_required",
      "user-h grinder retry after guest stale skip must not be skipped",
    );

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const pendingGrinderUserI = tryAutoClaimGrinderFromQuestCore();
    assert.equal(fetchCallCount, 1, "pending grinder before user-i should fetch once");
    setCurrentStorageUserId("user-i");
    resolveDelayedAutoFetch(new Response(JSON.stringify({ earned: true }), { status: 200 }));
    const staleGrinderUserI = await pendingGrinderUserI;
    assert.equal(staleGrinderUserI, "skipped", "pending grinder switched to user-i skips");
    assert.equal(
      sessionStorage.getItem(grinderAutoKey("user-i")),
      null,
      "pending grinder switched to user-i must not write user-i flag",
    );
    assert.equal(
      sessionStorage.getItem(grinderAutoKey("user-h")),
      null,
      "pending grinder switched to user-i must not write original user flag",
    );
    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const grinderRetryAfterUserI = tryAutoClaimGrinderFromQuestCore();
    assert.equal(fetchCallCount, 1, "user-h grinder retry after user-i stale skip should fetch");
    resolveDelayedAutoFetch(new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }));
    const grinderRetryAfterUserIResult = await grinderRetryAfterUserI;
    assert.equal(
      grinderRetryAfterUserIResult,
      "login_required",
      "user-h grinder retry after user-i stale skip must not be skipped",
    );

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCallCount += 1;
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      assert.ok(
        url.includes("/api/users/me/daily-badges") && init?.method === "POST",
        `unexpected grinder success retry fetch url: ${url}`,
      );
      return new Response(JSON.stringify({ earned: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    }) as typeof fetch;

    setCurrentStorageUserId("user/h");
    fetchCallCount = 0;
    const grinderEncodedUserSuccess = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(fetchCallCount, 1, "encoded user grinder success should fetch once");
    assert.equal(grinderEncodedUserSuccess, "earned", "encoded user grinder success should earn badge");
    assert.ok(
      sessionStorage.getItem(grinderAutoKey("user/h")),
      "encoded user grinder success writes encoded scoped auto flag",
    );
    const encodedGrinderSuccessFlag = sessionStorage.getItem(grinderAutoKey("user/h"));
    assert.ok(encodedGrinderSuccessFlag, "encoded user grinder success flag exists before second call");

    setCurrentStorageUserId("user/h");
    fetchCallCount = 0;
    const grinderEncodedUserSecond = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(grinderEncodedUserSecond, "skipped", "encoded user grinder success second call skipped");
    assert.equal(fetchCallCount, 0, "encoded user grinder success second call must not fetch");
    assert.equal(
      sessionStorage.getItem(grinderAutoKey("user/h")),
      encodedGrinderSuccessFlag,
      "encoded user grinder success second call must not change flag value",
    );
    const encodedGrinderFlagBeforeGuest = encodedGrinderSuccessFlag;

    setCurrentStorageUserId(null);
    fetchCallCount = 0;
    const grinderGuestAfterEncodedUser = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(grinderGuestAfterEncodedUser, "login_required", "guest grinder after encoded user success login_required");
    assert.equal(fetchCallCount, 0, "guest grinder after encoded user success must not fetch");
    assert.equal(
      sessionStorage.getItem(grinderAutoKey(null)),
      null,
      "guest grinder after encoded user success must not write guest flag",
    );
    assert.equal(
      sessionStorage.getItem(grinderAutoKey("user/h")),
      encodedGrinderFlagBeforeGuest,
      "encoded user grinder scoped auto flag persists during guest scope",
    );

    setCurrentStorageUserId("user/h");
    fetchCallCount = 0;
    const grinderEncodedUserAfterGuest = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(grinderEncodedUserAfterGuest, "skipped", "encoded user grinder after guest still skipped");
    assert.equal(fetchCallCount, 0, "encoded user grinder after guest must not fetch");
    assert.equal(
      sessionStorage.getItem(grinderAutoKey("user/h")),
      encodedGrinderFlagBeforeGuest,
      "encoded user grinder scoped auto flag persists after guest round trip",
    );

    setCurrentStorageUserId("user-a");
    fetchCallCount = 0;
    const grinderUserAAfterEncodedUser = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(fetchCallCount, 1, "user-a grinder after encoded user success should fetch once");
    assert.equal(grinderUserAAfterEncodedUser, "earned", "user-a grinder after encoded user success should earn badge");
    assert.ok(
      sessionStorage.getItem(grinderAutoKey("user-a")),
      "user-a grinder after encoded user success writes user-a scoped auto flag",
    );
    assert.equal(
      sessionStorage.getItem(grinderAutoKey("user/h")),
      encodedGrinderFlagBeforeGuest,
      "user-a grinder claim must not change encoded user grinder flag value",
    );

    setCurrentStorageUserId("user-a");
    fetchCallCount = 0;
    const grinderUserAAfterEncodedUserSecond = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(grinderUserAAfterEncodedUserSecond, "skipped", "user-a grinder after encoded user success second call skipped");
    assert.equal(fetchCallCount, 0, "user-a grinder after encoded user success second call must not fetch");
    assert.equal(
      sessionStorage.getItem(grinderAutoKey("user/h")),
      encodedGrinderFlagBeforeGuest,
      "user-a grinder second call must not change encoded user grinder flag value",
    );

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const grinderRetrySuccess = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(fetchCallCount, 1, "user-h grinder retry success should fetch once");
    assert.equal(grinderRetrySuccess, "earned", "user-h grinder retry success should earn badge");
    assert.ok(
      sessionStorage.getItem(grinderAutoKey("user-h")),
      "user-h grinder retry success writes user-h scoped auto flag",
    );
    const grinderRetrySuccessFlag = sessionStorage.getItem(grinderAutoKey("user-h"));
    assert.ok(grinderRetrySuccessFlag, "user-h grinder retry success flag exists before second call");
    assert.equal(
      sessionStorage.getItem(grinderAutoKey(null)),
      null,
      "user-h grinder retry success must not write guest flag",
    );
    assert.equal(
      sessionStorage.getItem(grinderAutoKey("user-i")),
      null,
      "user-h grinder retry success must not write user-i flag",
    );

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const grinderRetrySuccessSecond = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(grinderRetrySuccessSecond, "skipped", "user-h grinder retry success second call skipped");
    assert.equal(fetchCallCount, 0, "user-h grinder retry success second call must not fetch");
    assert.equal(
      sessionStorage.getItem(grinderAutoKey("user-h")),
      grinderRetrySuccessFlag,
      "user-h grinder retry success second call must not change flag value",
    );

    setCurrentStorageUserId("user-i");
    fetchCallCount = 0;
    const grinderUserIAfterUserHSuccess = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(fetchCallCount, 1, "user-i grinder after user-h success should fetch once");
    assert.equal(grinderUserIAfterUserHSuccess, "earned", "user-i grinder after user-h success should earn badge");
    assert.ok(
      sessionStorage.getItem(grinderAutoKey("user-i")),
      "user-i grinder after user-h success writes user-i scoped auto flag",
    );

    setCurrentStorageUserId("user-i");
    fetchCallCount = 0;
    const grinderUserIAfterUserHSuccessSecond = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(grinderUserIAfterUserHSuccessSecond, "skipped", "user-i grinder after user-h success second call skipped");
    assert.equal(fetchCallCount, 0, "user-i grinder after user-h success second call must not fetch");

    setCurrentStorageUserId("user-h");
    fetchCallCount = 0;
    const grinderUserHAfterUserISuccess = await tryAutoClaimGrinderFromQuestCore();
    assert.equal(grinderUserHAfterUserISuccess, "skipped", "user-h grinder after user-i success still skipped");
    assert.equal(fetchCallCount, 0, "user-h grinder after user-i success must not fetch");
    const grinderUserHKey = grinderAutoKey("user-h");
    const grinderUserIKey = grinderAutoKey("user-i");
    assert.notEqual(grinderUserHKey, grinderUserIKey, "grinder scoped keys must differ by user");
    assert.ok(
      sessionStorage.getItem(grinderUserHKey),
      "grinder user-h scoped auto flag persists after user-i success",
    );
    assert.ok(
      sessionStorage.getItem(grinderUserIKey),
      "grinder user-i scoped auto flag persists alongside user-h flag",
    );
  } finally {
    globalThis.fetch = originalFetch;
    sessionStorage.clear();
    resetGrinderAutoClaimForTests();
  }

  console.log("external-store snapshot smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
