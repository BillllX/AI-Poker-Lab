import { strict as assert } from "node:assert";

type StorageLike = {
  clear(): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

function installBrowserGlobals() {
  const memory = new Map<string, string>();
  const localStorage: StorageLike = {
    clear: () => memory.clear(),
    getItem: (key) => memory.get(key) ?? null,
    removeItem: (key) => memory.delete(key),
    setItem: (key, value) => memory.set(key, value),
  };

  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStorage });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: localStorage });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: globalThis,
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

  const { readCheckInState, checkInToday } = await import("../src/lib/client/dailyCheckIn");
  const { getDailyTasksSnapshot, readDailyTasks } = await import("../src/lib/client/dailyTasks");
  const { getQuestOptionalSnapshot } = await import("../src/lib/client/questOptionalProgress");
  const { readRecentSpectate } = await import("../src/lib/client/recentSpectate");
  const { listFavoriteAgents } = await import("../src/lib/client/agentFavorites");
  const { readQuestHistory } = await import("../src/lib/client/questHistory");

  assertStable("readCheckInState(empty)", readCheckInState);
  checkInToday();
  assertStable("readCheckInState(after check-in)", readCheckInState);

  localStorage.setItem(
    "texas-poker:daily-tasks",
    JSON.stringify({ dayKey: "2020-01-01", seenHands: ["t:1"], coachingCount: 2 }),
  );
  assertStable("readDailyTasks(stale dayKey)", readDailyTasks);
  assertStable("getDailyTasksSnapshot(stale dayKey)", getDailyTasksSnapshot);

  localStorage.clear();
  assertStable("getDailyTasksSnapshot(fresh)", getDailyTasksSnapshot);

  assertStable("getQuestOptionalSnapshot(empty)", getQuestOptionalSnapshot);

  localStorage.setItem("texas-poker:quest-share", JSON.stringify({ dayKey: new Date().toISOString().slice(0, 10) }));
  assertStable("getQuestOptionalSnapshot(with share flag)", getQuestOptionalSnapshot);

  localStorage.setItem("texas-poker:quest-quick-play", JSON.stringify({ dayKey: new Date().toISOString().slice(0, 10) }));
  assertStable("getQuestOptionalSnapshot(with quick play flag)", getQuestOptionalSnapshot);

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

  assertStable("readQuestHistory(empty)", readQuestHistory);

  localStorage.setItem(
    "texas-poker:quest-history",
    JSON.stringify([
      {
        completedIds: ["check_in"],
        dayKey: "2026-06-21",
        stars: 2,
        updatedAt: "2026-06-21T12:00:00.000Z",
      },
    ]),
  );
  assertStable("readQuestHistory(one entry)", readQuestHistory);

  console.log("external-store snapshot smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
