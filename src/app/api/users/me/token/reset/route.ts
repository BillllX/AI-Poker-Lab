import { getUserFromSessionCookie, resetUserTokenForSession } from "@/lib/server/userRegistry";

export async function POST(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  const userToken = await resetUserTokenForSession(user.id);
  return Response.json({
    credentials: {
      ownerUserId: user.id,
      tokenAvailable: true,
      userToken,
    },
  });
}
