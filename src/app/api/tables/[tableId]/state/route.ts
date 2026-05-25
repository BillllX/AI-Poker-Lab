import { getTableManager } from "@/lib/server/simulator";

export async function GET(request: Request, context: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await context.params;
  const manager = getTableManager(new URL(request.url).origin);
  const table = manager.table(tableId);

  if (!table) {
    return Response.json({ error: "Table was not found." }, { status: 404 });
  }

  return Response.json(table.runner.cachedSnapshot().snapshot);
}
