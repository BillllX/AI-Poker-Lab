import { getHumanTableManager } from "@/lib/server/humanTableManager";
import { getUserFromSessionCookie } from "@/lib/server/userRegistry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  return Response.json(getHumanTableManager().snapshot(user?.id));
}
