import { getHumanTableManager } from "@/lib/server/humanTableManager";
import { getUserFromSessionCookieLite } from "@/lib/server/userRegistry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getUserFromSessionCookieLite(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  try {
    return Response.json(getHumanTableManager().endTable(user.id));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to end human table." }, { status: 400 });
  }
}
