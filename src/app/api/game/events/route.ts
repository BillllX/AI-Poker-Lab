import { getSimulator } from "@/lib/server/simulator";
import { slimGameSnapshotForSse } from "@/lib/server/sseSnapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const heartbeatMs = 1_000;

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      function sendSnapshot() {
        send("snapshot", slimGameSnapshotForSse(getSimulator(origin).snapshot()));
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
