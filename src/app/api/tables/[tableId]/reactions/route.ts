import { getTableManager } from "@/lib/server/simulator";
import { addTableReaction, isReactionEmoji } from "@/lib/server/tableReactions";
import { getUserFromSessionCookieLite } from "@/lib/server/userRegistry";

export async function POST(request: Request, context: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await context.params;
  const origin = new URL(request.url).origin;
  const table = getTableManager(origin).table(tableId);

  if (!table) {
    return Response.json({ error: "Table was not found." }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as { emoji?: string } | null;
  const emoji = payload?.emoji?.trim();
  if (!emoji || !isReactionEmoji(emoji)) {
    return Response.json({ error: "Invalid reaction emoji." }, { status: 400 });
  }

  const user = await getUserFromSessionCookieLite(request.headers.get("cookie"));
  const actorKey = user?.id ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";

  const result = addTableReaction(tableId, emoji, actorKey);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  table.runner.invalidateSnapshotCache();

  return Response.json({ reaction: result.reaction });
}
