import { listAgents } from "@/lib/server/agentRegistry";
import { addRuntimeInstruction, getRuntimeInstructions } from "@/lib/server/runtimeInstructions";
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

    const note = addRuntimeInstruction(agent.id, `用户现场 Coaching：${String(input.message ?? "")}`, "operator");
    return Response.json({
      ok: true,
      agent,
      note,
      runtimeInstructions: getRuntimeInstructions(agent.id),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to add coaching." }, { status: 400 });
  }
}
