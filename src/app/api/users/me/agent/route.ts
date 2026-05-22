import { resolveAgentProfileByOwner } from "@/lib/server/agentProfile";
import { getAgentPrivateSettings, updateAgentPrivateSettings } from "@/lib/server/agentPrivateSettings";
import { getHostedAgentStatus } from "@/lib/server/hostedAgents";
import { getCurrentUserTokenForSession, getUserFromSessionCookie } from "@/lib/server/userRegistry";

export async function GET(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ user: null, agentProfile: null }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const [agentProfile, userToken, privateSettings, hostedAgent] = await Promise.all([
    resolveAgentProfileByOwner(user.id, origin),
    getCurrentUserTokenForSession(user.id),
    getAgentPrivateSettings(user.id),
    getHostedAgentStatus(user.id),
  ]);

  return Response.json({
    user,
    credentials: {
      ownerUserId: user.id,
      tokenAvailable: Boolean(userToken),
      userToken: userToken ?? null,
    },
    privateSettings,
    hostedAgent,
    agentProfile: agentProfile ?? null,
    onboarding: agentProfile
      ? null
      : {
          skillUrl: `${origin}/api/agents/skill`,
          tablesUrl: `${origin}/tables`,
          message: "No Agent identity has been created for this user yet.",
        },
  });
}

export async function PATCH(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const privateSettings = await updateAgentPrivateSettings(user.id, body);
    return Response.json({ privateSettings });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update private settings." }, { status: 400 });
  }
}
