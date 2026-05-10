import { listAgents, normalizeAgentId } from "@/lib/server/agentRegistry";
import { getTableManager } from "@/lib/server/simulator";
import { verifyUserToken } from "@/lib/server/userRegistry";

export async function POST(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const input = await request.json();
    const agentId = normalizeAgentId(String(input.agentId ?? input.id ?? ""));
    const agent = listAgents().find((item) => item.id === agentId);

    if (!agent) {
      return Response.json({ removed: false, reason: "Agent is not registered." }, { status: 404 });
    }

    if (!agent.ownerUserId) {
      return Response.json({ error: "Agent is not bound to an ownerUserId." }, { status: 400 });
    }

    await verifyUserToken(agent.ownerUserId, input.userToken);

    const result = await getTableManager(origin).leaveAgent(agentId);
    return Response.json({ ...result, agentId, agents: listAgents(), tables: getTableManager(origin).summaries() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to leave game." }, { status: 400 });
  }
}
