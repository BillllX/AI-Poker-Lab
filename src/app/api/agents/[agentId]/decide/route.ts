export async function POST(request: Request, context: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await context.params;
  const url = new URL(request.url);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const host = request.headers.get("host") ?? url.host;
  const wsUrl = `${protocol}//${host}/api/agents/ws?agentId=${encodeURIComponent(agentId)}`;

  return Response.json(
    {
      error: "HTTP Agent decision endpoints are disabled. Agents must receive and submit decisions through WebSocket.",
      wsUrl,
    },
    {
      headers: { Upgrade: "websocket" },
      status: 426,
    },
  );
}
