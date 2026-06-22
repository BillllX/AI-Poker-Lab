import { listLeaderboardUsers, type LeaderboardSort } from "@/lib/server/userRegistry";

const CACHE_TTL_MS = 30_000;

type LeaderboardCacheEntry = {
  body: { sort: LeaderboardSort; users: Awaited<ReturnType<typeof listLeaderboardUsers>> };
  expiresAt: number;
};

const globalForLeaderboardCache = globalThis as typeof globalThis & {
  __texasPokerLeaderboardListCache?: Map<string, LeaderboardCacheEntry>;
};

const cache = (globalForLeaderboardCache.__texasPokerLeaderboardListCache ??= new Map());

export const LEADERBOARD_LIST_CACHE_CONTROL = "public, max-age=10, s-maxage=30, stale-while-revalidate=60";

export async function getLeaderboardListPayload(limit: number, sort: LeaderboardSort) {
  const key = `${sort}:${limit}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.body;
  }

  const body = {
    sort,
    users: await listLeaderboardUsers(limit, sort),
  };
  cache.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS });

  if (cache.size > 24) {
    for (const [entryKey, entry] of cache) {
      if (entry.expiresAt <= Date.now()) {
        cache.delete(entryKey);
      }
    }
  }

  return body;
}
