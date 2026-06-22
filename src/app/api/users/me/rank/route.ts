import {
  getLeaderboardRankForUser,
  getUserFromSessionCookieLite,
  type LeaderboardSort,
} from "@/lib/server/userRegistry";

function parseLeaderboardSort(value: string | null): LeaderboardSort {
  if (value === "daily" || value === "weekly") {
    return value;
  }
  return "points";
}

export async function GET(request: Request) {
  const user = await getUserFromSessionCookieLite(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ rank: null }, { status: 401 });
  }

  const sort = parseLeaderboardSort(new URL(request.url).searchParams.get("sort"));
  const payload = await getLeaderboardRankForUser(user.id, sort);
  if (!payload) {
    return Response.json({ rank: null }, { status: 404 });
  }

  if (sort === "points" && !new URL(request.url).searchParams.has("sort")) {
    return Response.json({ rank: payload.rank });
  }

  return Response.json(payload);
}
