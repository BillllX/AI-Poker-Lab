export async function POST(request: Request) {
  const url = new URL(request.url);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const host = request.headers.get("host") ?? url.host;
  const wsUrl = `${protocol}//${host}/api/agents/ws?agentId=<agent-id>`;

  return Response.json(
    {
      error: "HTTP action submission is disabled. Agents must submit action_response through WebSocket.",
      wsUrl,
    },
    {
      headers: { Upgrade: "websocket" },
      status: 426,
    },
  );
}
