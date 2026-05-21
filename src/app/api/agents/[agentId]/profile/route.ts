import { resolveAgentProfileById } from "@/lib/server/agentProfile";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ agentId: string }> }) {
  const { agentId: rawAgentId } = await context.params;
  const profile = await resolveAgentProfileById(rawAgentId, new URL(request.url).origin);

  if (!profile) {
    return Response.json({ error: "Agent was not found." }, { status: 404 });
  }

  return Response.json(profile);
}
