import { resolveAgentProfileByOwner } from "@/lib/server/agentProfile";
import { getUserFromSessionCookie } from "@/lib/server/userRegistry";

export async function GET(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ user: null, agentProfile: null }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const agentProfile = await resolveAgentProfileByOwner(user.id, origin);

  return Response.json({
    user,
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
