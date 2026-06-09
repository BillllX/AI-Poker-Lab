import { listAgents, listQueuedAgents } from "@/lib/server/agentRegistry";
import { getTableManager } from "@/lib/server/simulator";

export async function GET(request: Request) {
  const manager = getTableManager(new URL(request.url).origin);
  await manager.allocateQueuedAgents();

  return Response.json({
    agents: listAgents(),
    modelStats: manager.modelStats(),
    queuedAgents: listQueuedAgents(),
    tables: manager.summaries(),
  });
}
