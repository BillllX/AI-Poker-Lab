import { listAgents, listQueuedAgents } from "@/lib/server/agentRegistry";
import { parseAgentsLimit, parseTablesLimit, prioritizeTableSummaries } from "@/lib/server/listLimits";
import { getTableManager } from "@/lib/server/simulator";
import { toTablesListAgent, toTablesListTableSummary } from "@/lib/server/tablesListPayload";

/** Public lobby snapshot — safe to cache briefly (live data refreshes via SSE on table pages). */
const TABLES_LIST_CACHE_CONTROL = "public, s-maxage=10, stale-while-revalidate=30";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tablesLimit = parseTablesLimit(url.searchParams.get("limit"));
  const agentsLimit = parseAgentsLimit(url.searchParams.get("agentLimit"));

  const manager = getTableManager(url.origin);
  await manager.allocateQueuedAgents();

  const allTables = manager.summaries();
  const tables = prioritizeTableSummaries(allTables, tablesLimit).map(toTablesListTableSummary);
  const allAgents = listAgents();
  const allQueuedAgents = listQueuedAgents();
  const agents = allAgents.slice(0, agentsLimit).map(toTablesListAgent);
  const queuedAgents = allQueuedAgents.slice(0, agentsLimit).map(toTablesListAgent);

  return Response.json(
    {
      agents,
      agentsLimit,
      agentsTotal: allAgents.length,
      queuedAgents,
      tables,
      tablesLimit,
      tablesTotal: allTables.length,
      tablesTruncated: allTables.length > tables.length,
    },
    {
      headers: {
        "Cache-Control": TABLES_LIST_CACHE_CONTROL,
      },
    },
  );
}
