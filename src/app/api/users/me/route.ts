import { getUserFromSessionCookie } from "@/lib/server/userRegistry";

export async function GET(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ user: null }, { status: 401 });
  }

  return Response.json({ user });
}
