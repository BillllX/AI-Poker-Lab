import { getSimulator } from "@/lib/server/simulator";

export async function POST(request: Request) {
  if (request.headers.get("x-dashboard-action") !== "start-game") {
    return Response.json({ error: "Game can only be started from the monitoring dashboard." }, { status: 403 });
  }

  const origin = new URL(request.url).origin;
  const simulator = getSimulator(origin);
  try {
    await simulator.start();
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to start game." }, { status: 400 });
  }

  return Response.json(simulator.snapshot());
}
