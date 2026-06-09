import { createOrJoinHostedAgent } from "@/lib/server/hostedAgents";
import { getUserFromSessionCookieLite } from "@/lib/server/userRegistry";

export async function POST(request: Request, context: { params: Promise<{ tableId: string }> }) {
  const user = await getUserFromSessionCookieLite(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  const { tableId } = await context.params;
  try {
    const agent = await createOrJoinHostedAgent({
      origin: new URL(request.url).origin,
      ownerName: user.name,
      ownerUserId: user.id,
      targetTableId: tableId,
    });
    return Response.json({ agent });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to join this table." }, { status: 400 });
  }
}
