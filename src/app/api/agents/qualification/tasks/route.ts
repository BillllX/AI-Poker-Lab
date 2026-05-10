import { createQualificationSession } from "@/lib/server/qualification";

export async function GET(request: Request) {
  try {
    const agentId = new URL(request.url).searchParams.get("agentId");

    if (!agentId) {
      return Response.json({ error: "agentId is required." }, { status: 400 });
    }

    return Response.json(createQualificationSession(agentId));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create qualification tasks." }, { status: 400 });
  }
}
