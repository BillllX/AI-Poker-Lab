import { getTableManager } from "@/lib/server/simulator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const heartbeatMs = 1_000;

export async function GET(request: Request, context: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await context.params;
  const origin = new URL(request.url).origin;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      function sendSnapshot() {
        const table = getTableManager(origin).table(tableId);
        if (!table) {
          send("error", { error: "Table was not found." });
          return;
        }
        send("snapshot", table.runner.snapshot());
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
