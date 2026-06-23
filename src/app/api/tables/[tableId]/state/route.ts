import { getTableManager } from "@/lib/server/simulator";
import { withSpectatorSnapshot } from "@/lib/server/tableSpectators";

export async function GET(request: Request, context: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await context.params;
  const manager = getTableManager(new URL(request.url).origin);
  const table = manager.table(tableId);

  if (!table) {
    return Response.json({ error: "Table was not found." }, { status: 404 });
  }

  const cached = table.runner.cachedSnapshot();
  return Response.json(withSpectatorSnapshot(tableId, cached.snapshot, cached.version).snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
