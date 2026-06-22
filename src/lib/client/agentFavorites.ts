export type FavoriteAgentEntry = {
  id: string;
  name: string;
  savedAt: string;
};

const STORAGE_KEY = "texas-poker:agent-favorites";
const CHANGE_EVENT = "agent-favorites-change";

let cachedRaw: string | null | undefined;
let cachedList: FavoriteAgentEntry[] = [];

export function agentFavoritesChangeEvent() {
  return CHANGE_EVENT;
}

function readRaw(): FavoriteAgentEntry[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as FavoriteAgentEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry) => typeof entry.id === "string" && entry.id && typeof entry.name === "string",
    );
  } catch {
    return [];
  }
}

function commitListCache(raw: string | null, entries: FavoriteAgentEntry[]) {
  cachedRaw = raw;
  cachedList = entries;
}

function writeRaw(entries: FavoriteAgentEntry[]) {
  if (typeof localStorage !== "undefined") {
    const raw = JSON.stringify(entries);
    localStorage.setItem(STORAGE_KEY, raw);
    commitListCache(raw, entries);
    return;
  }
  commitListCache(null, entries);
}

export function listFavoriteAgents(): FavoriteAgentEntry[] {
  if (typeof localStorage === "undefined") {
    return cachedList;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedList;
  }

  const next = readRaw().sort((left, right) => right.savedAt.localeCompare(left.savedAt));
  commitListCache(raw, next);
  return next;
}

export function isAgentFavorite(agentId: string): boolean {
  return readRaw().some((entry) => entry.id === agentId);
}

export function toggleAgentFavorite(agentId: string, agentName: string): boolean {
  const current = readRaw();
  const existingIndex = current.findIndex((entry) => entry.id === agentId);

  if (existingIndex >= 0) {
    current.splice(existingIndex, 1);
    writeRaw(current);
    return false;
  }

  writeRaw([
    {
      id: agentId,
      name: agentName,
      savedAt: new Date().toISOString(),
    },
    ...current.filter((entry) => entry.id !== agentId),
  ]);
  return true;
}

export function removeAgentFavorite(agentId: string) {
  writeRaw(readRaw().filter((entry) => entry.id !== agentId));
}
