import {
  clearUserSessionSetCookie,
  getSessionUserIdFromCookie,
  getUserFromSessionCookieLite,
} from "@/lib/server/userRegistry";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const user = await getUserFromSessionCookieLite(cookieHeader);
  if (!user) {
    const headers: HeadersInit = {};
    if (getSessionUserIdFromCookie(cookieHeader)) {
      headers["Set-Cookie"] = clearUserSessionSetCookie();
    }
    return Response.json({ user: null }, { status: 401, headers });
  }

  return Response.json({ user });
}
