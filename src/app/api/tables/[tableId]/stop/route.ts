import { getTableManager } from "@/lib/server/simulator";
import { logger } from "@/lib/server/logger";

export async function POST(request: Request, context: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await context.params;
  const manager = getTableManager(new URL(request.url).origin);

  try {
    logger.warn("table.stop_api_requested", { tableId });
    await manager.endTable(tableId);
    logger.warn("table.stop_api_completed", { tableId });
  } catch (error) {
    logger.error("table.stop_api_failed", { tableId, error });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to stop table." }, { status: 500 });
  }

  return Response.json({ tables: manager.summaries() });
}
