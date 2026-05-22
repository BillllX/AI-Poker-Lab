import { listAgents } from "@/lib/server/agentRegistry";
import { getTableManager } from "@/lib/server/simulator";
import { getUserFromSessionCookie } from "@/lib/server/userRegistry";

export async function POST(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  try {
    const input = await request.json();
    const tableId = typeof input.tableId === "string" ? input.tableId.trim() : "";
    const agent = listAgents().find((item) => item.ownerUserId === user.id && (!tableId || item.tableId === tableId));
    if (!agent) {
      return Response.json({ error: "Your Agent is not seated at this table." }, { status: 404 });
    }

    const result = await getTableManager(new URL(request.url).origin).leaveAgent(agent.id);
    return Response.json({ ...result, agentId: agent.id, tables: getTableManager(new URL(request.url).origin).summaries() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to leave table." }, { status: 400 });
  }
}
