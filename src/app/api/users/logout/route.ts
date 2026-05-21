import { clearUserSessionSetCookie } from "@/lib/server/userRegistry";

export async function POST() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearUserSessionSetCookie() } });
}
