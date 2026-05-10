import { getSimulator } from "@/lib/server/simulator";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const simulator = getSimulator(origin);
  try {
    await simulator.reset(origin);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to reset game." }, { status: 500 });
  }

  return Response.json(simulator.snapshot());
}
