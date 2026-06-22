import { getLeaderboardListPayload, LEADERBOARD_LIST_CACHE_CONTROL } from "@/lib/server/leaderboardListCache";
import type { LeaderboardSort } from "@/lib/server/userRegistry";

function parseLeaderboardSort(value: string | null): LeaderboardSort {
  if (value === "daily" || value === "weekly") {
    return value;
  }
  return "points";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const sort = parseLeaderboardSort(url.searchParams.get("sort"));
  const payload = await getLeaderboardListPayload(limit, sort);

  return Response.json(payload, {
    headers: {
      "Cache-Control": LEADERBOARD_LIST_CACHE_CONTROL,
    },
  });
}
