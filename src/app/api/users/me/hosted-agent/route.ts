import { createOrJoinHostedAgent, getHostedAgentStatus, leaveHostedAgent } from "@/lib/server/hostedAgents";
import { getUserFromSessionCookie } from "@/lib/server/userRegistry";

export async function GET(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  return Response.json({ hostedAgent: await getHostedAgentStatus(user.id) });
}

export async function POST(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  try {
    const origin = new URL(request.url).origin;
    const agent = await createOrJoinHostedAgent({ ownerUserId: user.id, ownerName: user.name, origin });
    return Response.json({ agent, hostedAgent: await getHostedAgentStatus(user.id) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create hosted Agent." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const result = await leaveHostedAgent({ ownerUserId: user.id, origin });
  return Response.json({ ...result, hostedAgent: await getHostedAgentStatus(user.id) });
}
