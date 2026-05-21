import { createUserSessionSetCookie, loginUser } from "@/lib/server/userRegistry";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await loginUser(payload);
    return Response.json(result, { headers: { "Set-Cookie": createUserSessionSetCookie(result.user.id) } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to log in." }, { status: 400 });
  }
}
