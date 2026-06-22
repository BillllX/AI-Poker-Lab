import { getTableManager } from "@/lib/server/simulator";
import { slimGameSnapshotForSse } from "@/lib/server/sseSnapshot";
import { decrementTableSpectators, incrementTableSpectators, withSpectatorSnapshot } from "@/lib/server/tableSpectators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const heartbeatMs = 1_000;
const idleHeartbeatMs = 15_000;

export async function GET(request: Request, context: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await context.params;
  const origin = new URL(request.url).origin;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let lastHeartbeatAt = 0;
      let lastVersion = "";

      incrementTableSpectators(tableId);

      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      function sendSnapshot() {
        const table = getTableManager(origin).table(tableId);
        if (!table) {
          send("error", { error: "Table was not found." });
          return;
        }
        const cached = table.runner.cachedSnapshot();
        const payload = withSpectatorSnapshot(tableId, cached.snapshot, cached.version);
        if (payload.version !== lastVersion) {
          lastVersion = payload.version;
          lastHeartbeatAt = Date.now();
          send("snapshot", slimGameSnapshotForSse(payload.snapshot));
          return;
        }
        if (Date.now() - lastHeartbeatAt >= idleHeartbeatMs) {
          lastHeartbeatAt = Date.now();
          send("heartbeat", { at: new Date().toISOString(), version: lastVersion });
        }
      }

      sendSnapshot();
      const timer = setInterval(sendSnapshot, heartbeatMs);

      request.signal.addEventListener("abort", () => {
        clearInterval(timer);
        decrementTableSpectators(tableId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
