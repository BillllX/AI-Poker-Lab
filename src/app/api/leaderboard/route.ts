import { listLeaderboardUsers } from "@/lib/server/userRegistry";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 20);
  return Response.json({ users: await listLeaderboardUsers(limit) });
}
