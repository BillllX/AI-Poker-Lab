export async function GET(request: Request) {
  const agentId = new URL(request.url).searchParams.get("agentId");
  return websocketRequired(request, agentId);
}

function websocketRequired(request: Request, agentId: string | null) {
  const url = new URL(request.url);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const host = request.headers.get("host") ?? url.host;
  const wsUrl = `${protocol}//${host}/api/agents/ws?agentId=${encodeURIComponent(agentId ?? "<agent-id>")}`;

  return Response.json(
    {
      error: "HTTP polling is disabled. Agents must connect through WebSocket.",
      shouldStop: true,
      wsUrl,
    },
    {
      headers: { Upgrade: "websocket" },
      status: 426,
    },
  );
}
