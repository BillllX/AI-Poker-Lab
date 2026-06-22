const STORAGE_KEY = "texas-poker:recent-spectate";
export const RECENT_SPECTATE_CHANGE_EVENT = "recent-spectate-change";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type RecentSpectateEntry = {
  tableId: string;
  tableName: string;
  visitedAt: string;
};

let cachedRaw: string | null | undefined;
let cachedEntry: RecentSpectateEntry | undefined;

function commitCache(raw: string | null, entry: RecentSpectateEntry | undefined) {
  cachedRaw = raw;
  cachedEntry = entry;
}

function parseEntry(raw: string): RecentSpectateEntry | undefined {
  try {
    const parsed = JSON.parse(raw) as Partial<RecentSpectateEntry>;
    if (typeof parsed.tableId !== "string" || !parsed.tableId) {
      return undefined;
    }
    if (typeof parsed.tableName !== "string" || !parsed.tableName) {
      return undefined;
    }
    if (typeof parsed.visitedAt !== "string" || !parsed.visitedAt) {
      return undefined;
    }
    if (Date.now() - new Date(parsed.visitedAt).getTime() > MAX_AGE_MS) {
      return undefined;
    }
    return {
      tableId: parsed.tableId,
      tableName: parsed.tableName,
      visitedAt: parsed.visitedAt,
    };
  } catch {
    return undefined;
  }
}

export function readRecentSpectate(): RecentSpectateEntry | undefined {
  if (typeof localStorage === "undefined") {
    return undefined;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedEntry;
  }

  if (!raw) {
    commitCache(null, undefined);
    return undefined;
  }

  const entry = parseEntry(raw);
  if (!entry) {
    localStorage.removeItem(STORAGE_KEY);
    commitCache(null, undefined);
    return undefined;
  }

  commitCache(raw, entry);
  return entry;
}

export function recordRecentSpectate(tableId: string, tableName: string) {
  const entry: RecentSpectateEntry = {
    tableId,
    tableName,
    visitedAt: new Date().toISOString(),
  };
  const raw = JSON.stringify(entry);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, raw);
  }

  commitCache(raw, entry);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RECENT_SPECTATE_CHANGE_EVENT));
  }
}

export function subscribeRecentSpectate(onStoreChange: () => void) {
  window.addEventListener(RECENT_SPECTATE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(RECENT_SPECTATE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
