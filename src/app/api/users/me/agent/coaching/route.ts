import { listAgents } from "@/lib/server/agentRegistry";
import { addRuntimeInstruction, getRuntimeInstructions } from "@/lib/server/runtimeInstructions";
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
    if (!tableId) {
      return Response.json({ error: "tableId is required." }, { status: 400 });
    }
    const agent = listAgents().find((item) => item.ownerUserId === user.id && (!tableId || item.tableId === tableId));
    if (!agent) {
      return Response.json({ error: "Your Agent is not seated at this table." }, { status: 404 });
    }
    const table = getTableManager(new URL(request.url).origin).table(tableId);
    if (!table) {
      return Response.json({ error: "Table was not found." }, { status: 404 });
    }
    const appliesFromHandId = table.runner.snapshot().handId + 1;

    const note = addRuntimeInstruction(agent.id, `用户下一手起生效的 Coaching：${String(input.message ?? "")}`, "operator", {
      tableId,
      appliesFromHandId,
    });
    return Response.json({
      ok: true,
      agent,
      appliesFromHandId,
      note,
      runtimeInstructions: getRuntimeInstructions(agent.id, { tableId, handId: appliesFromHandId }),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to add coaching." }, { status: 400 });
  }
}
