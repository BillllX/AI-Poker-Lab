import { getHumanTableManager } from "@/lib/server/humanTableManager";
import { getUserFromSessionCookie } from "@/lib/server/userRegistry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  try {
    const input = await request.json();
    const password = typeof input.password === "string" ? input.password : "";
    return Response.json(getHumanTableManager().join(user, password));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to join human table." }, { status: 400 });
  }
}
