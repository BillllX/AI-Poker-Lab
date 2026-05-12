import { QualificationSubmissionError, submitQualification } from "@/lib/server/qualification";

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
    const message = error instanceof Error ? error.message : "Invalid qualification submission.";
    const details = error instanceof QualificationSubmissionError ? error.details : {};

    return Response.json(
      {
        ok: false,
        error: message,
        ...details,
      },
      { status: 400 },
    );
  }
}
