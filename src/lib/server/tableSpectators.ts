import type { GameSnapshot } from "../poker/types";

const globalForSpectators = globalThis as typeof globalThis & {
  __texasPokerTableSpectators?: Map<string, number>;
};

const counts = (globalForSpectators.__texasPokerTableSpectators ??= new Map<string, number>());

export function incrementTableSpectators(tableId: string) {
  const next = (counts.get(tableId) ?? 0) + 1;
  counts.set(tableId, next);
  return next;
}

export function decrementTableSpectators(tableId: string) {
  const current = counts.get(tableId) ?? 0;
  const next = Math.max(0, current - 1);
  if (next === 0) {
    counts.delete(tableId);
  } else {
    counts.set(tableId, next);
  }
  return next;
}

export function getTableSpectatorCount(tableId: string) {
  return counts.get(tableId) ?? 0;
}

export function withSpectatorSnapshot(tableId: string, snapshot: GameSnapshot, version: string) {
  const spectatorCount = getTableSpectatorCount(tableId);
  return {
    snapshot: { ...snapshot, spectatorCount },
    version: `${version}|spectators:${spectatorCount}`,
  };
}
