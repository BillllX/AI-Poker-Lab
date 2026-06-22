import { getHumanTableManager } from "@/lib/server/humanTableManager";
import { getUserFromSessionCookieLite } from "@/lib/server/userRegistry";
import { slimHumanTableSnapshotForSse } from "@/lib/server/sseSnapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const heartbeatMs = 1_000;
const idleHeartbeatMs = 15_000;

export async function GET(request: Request) {
  const user = await getUserFromSessionCookieLite(request.headers.get("cookie"));
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let lastHeartbeatAt = 0;
      let lastVersion = "";

      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      function sendSnapshot() {
        const cached = getHumanTableManager().cachedSnapshot(user?.id);
        if (cached.version !== lastVersion) {
          lastVersion = cached.version;
          lastHeartbeatAt = Date.now();
          send("snapshot", slimHumanTableSnapshotForSse(cached.snapshot));
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
