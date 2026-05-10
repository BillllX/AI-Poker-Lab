import { getTableManager } from "@/lib/server/simulator";

export async function POST(request: Request, context: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await context.params;
  const manager = getTableManager(new URL(request.url).origin);

  try {
    await manager.resetTable(tableId);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to reset table." }, { status: 500 });
  }

  return Response.json({ tables: manager.summaries() });
}
