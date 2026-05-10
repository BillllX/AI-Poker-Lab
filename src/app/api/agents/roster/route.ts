import { listAgents, listPollingAgents, normalizeAgentId, registerAgent, removeAgent } from "@/lib/server/agentRegistry";
import { listPendingDecisions } from "@/lib/server/decisionBroker";
import { consumeQualificationToken } from "@/lib/server/qualification";
import { getTableManager } from "@/lib/server/simulator";
import { verifyUserToken } from "@/lib/server/userRegistry";
import { isReservedVirtualAgentId } from "@/lib/server/virtualAgents";

export async function GET() {
  return Response.json({
    agents: listAgents(),
    pollingAgents: listPollingAgents(),
    pendingDecisions: listPendingDecisions(),
    tables: getTableManager().summaries(),
  });
}

export async function POST(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const tableManager = getTableManager(origin);
    const input = await request.json();
    const agentId = normalizeAgentId(input.id || input.name || "");
    const existingAgent = listAgents().find((agent) => agent.id === agentId);

    if (existingAgent?.kind === "virtual" || isReservedVirtualAgentId(agentId)) {
      return Response.json({ error: "This Agent id is reserved for a built-in virtual Agent." }, { status: 409 });
    }

    if (existingAgent?.tableId && input.name && input.name.trim() !== existingAgent.name) {
      return Response.json({ error: "Cannot rename an Agent while it is assigned to a table." }, { status: 409 });
    }

    if (existingAgent?.tableId && input.modelName && input.modelName.trim() !== existingAgent.modelName) {
      return Response.json({ error: "Cannot change an Agent model while it is assigned to a table." }, { status: 409 });
    }

    if (!existingAgent) {
      if (typeof input.ownerUserId !== "string" || !input.ownerUserId.trim()) {
        return Response.json({ error: "ownerUserId is required when registering a new Agent." }, { status: 400 });
      }
      if (typeof input.modelName !== "string" || !input.modelName.trim()) {
        return Response.json({ error: "modelName is required when registering a new Agent." }, { status: 400 });
      }
      await verifyUserToken(input.ownerUserId, input.userToken);
      consumeQualificationToken(agentId, input.qualificationToken);
    } else if (existingAgent.ownerUserId) {
      if (input.ownerUserId && input.ownerUserId !== existingAgent.ownerUserId) {
        return Response.json({ error: "Cannot move an existing Agent to another owner." }, { status: 409 });
      }
      await verifyUserToken(existingAgent.ownerUserId, input.userToken);
    }

    const agent = registerAgent(input);

    await tableManager.allocateQueuedAgents();

    return Response.json({ agent, agents: listAgents(), pollingAgents: listPollingAgents(), tables: tableManager.summaries() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid Agent registration." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const origin = new URL(request.url).origin;
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Agent id is required." }, { status: 400 });
  }

  const agent = listAgents().find((item) => item.id === id);
  if (agent?.tableId) {
    return Response.json({ error: "Cannot remove an Agent while it is assigned to a table." }, { status: 409 });
  }

  const removed = removeAgent(id);
  const tableManager = getTableManager(origin);

  return Response.json({ removed, agents: listAgents(), tables: tableManager.summaries() });
}
