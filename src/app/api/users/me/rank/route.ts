import { getUserFromSessionCookieLite, rankUser } from "@/lib/server/userRegistry";

export async function GET(request: Request) {
  const user = await getUserFromSessionCookieLite(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ rank: null }, { status: 401 });
  }

  return Response.json({ rank: await rankUser(user.id) });
}
