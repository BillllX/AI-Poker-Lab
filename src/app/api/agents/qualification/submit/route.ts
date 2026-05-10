import { submitQualification } from "@/lib/server/qualification";

export async function POST(request: Request) {
  try {
    const qualification = submitQualification(await request.json());

    return Response.json({
      ok: true,
      qualificationToken: qualification.token,
      agentId: qualification.agentId,
      expiresAt: qualification.expiresAt,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid qualification submission.",
      },
      { status: 400 },
    );
  }
}
