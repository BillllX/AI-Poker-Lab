import { getHumanTableManager } from "@/lib/server/humanTableManager";
import { getUserFromSessionCookieLite } from "@/lib/server/userRegistry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getUserFromSessionCookieLite(request.headers.get("cookie"));
  return Response.json(getHumanTableManager().cachedSnapshot(user?.id).snapshot);
}
