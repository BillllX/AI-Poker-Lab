import { getSimulator } from "@/lib/server/simulator";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return Response.json(getSimulator(origin).snapshot());
}
