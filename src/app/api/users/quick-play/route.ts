import { createOrJoinHostedAgent, getHostedAgentStatus, hostedAgentTableLink } from "@/lib/server/hostedAgents";
import { updateAgentPrivateSettings } from "@/lib/server/agentPrivateSettings";
import { createUser, createUserSessionSetCookie, getUserFromSessionCookieLite } from "@/lib/server/userRegistry";

export async function POST(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const body = await safeJson(request);
    const existingUser = await getUserFromSessionCookieLite(request.headers.get("cookie"));
    const userResult = existingUser ? { user: existingUser, userToken: null } : await createUser(body);
    if (typeof body.agentPrompt === "string" && body.agentPrompt.trim()) {
      await updateAgentPrivateSettings(userResult.user.id, { agentPrompt: body.agentPrompt });
    }
    const agent = await createOrJoinHostedAgent({
      ownerName: userResult.user.name,
      ownerUserId: userResult.user.id,
      origin,
    });
    const hostedAgent = await getHostedAgentStatus(userResult.user.id);
    const tableLink = hostedAgentTableLink(agent);
    const headers = existingUser ? undefined : { "Set-Cookie": createUserSessionSetCookie(userResult.user.id) };

    return Response.json(
      {
        user: userResult.user,
        agent,
        hostedAgent,
        ...tableLink,
      },
      headers ? { headers } : undefined,
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to start quick play." },
      { status: 400 },
    );
  }
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
