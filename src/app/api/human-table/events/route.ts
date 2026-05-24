import { getHumanTableManager } from "@/lib/server/humanTableManager";
import { getUserFromSessionCookie } from "@/lib/server/userRegistry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const heartbeatMs = 1_000;

export async function GET(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      function sendSnapshot() {
        send("snapshot", getHumanTableManager().snapshot(user?.id));
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
