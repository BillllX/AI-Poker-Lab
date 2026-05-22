import { addRuntimeInstruction, getRuntimeInstructions } from "@/lib/server/runtimeInstructions";

export async function GET(request: Request) {
  try {
    const agentId = new URL(request.url).searchParams.get("agentId");
    const url = new URL(request.url);
    const tableId = url.searchParams.get("tableId") ?? undefined;
    const handIdText = url.searchParams.get("handId");
    const handId = handIdText ? Number(handIdText) : undefined;

    if (!agentId) {
      return Response.json({ error: "agentId is required." }, { status: 400 });
    }

    return Response.json(getRuntimeInstructions(agentId, { tableId, handId }));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to read runtime instructions." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const note = addRuntimeInstruction(String(input.agentId ?? ""), String(input.message ?? ""), "operator");

    return Response.json({ ok: true, note, runtimeInstructions: getRuntimeInstructions(note.agentId) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to add runtime instruction." }, { status: 400 });
  }
}
