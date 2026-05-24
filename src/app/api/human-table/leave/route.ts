import { getHumanTableManager } from "@/lib/server/humanTableManager";
import { getUserFromSessionCookie } from "@/lib/server/userRegistry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  try {
    return Response.json({ ...getHumanTableManager().leave(user.id), snapshot: getHumanTableManager().snapshot(user.id) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to leave human table." }, { status: 400 });
  }
}
