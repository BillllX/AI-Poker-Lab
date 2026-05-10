import { listAgents, normalizeAgentId } from "@/lib/server/agentRegistry";
import { logger } from "@/lib/server/logger";
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

    logger.info("agent.leave_api_requested", { agentId, ownerUserId: agent.ownerUserId, tableId: agent.tableId });
    const result = await getTableManager(origin).leaveAgent(agentId);
    logger.info("agent.leave_api_completed", { agentId, ...result });
    return Response.json({ ...result, agentId, agents: listAgents(), tables: getTableManager(origin).summaries() });
  } catch (error) {
    logger.warn("agent.leave_api_failed", { error });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to leave game." }, { status: 400 });
  }
}
