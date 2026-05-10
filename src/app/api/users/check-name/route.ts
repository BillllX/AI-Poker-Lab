import { isUserNameAvailable } from "@/lib/server/userRegistry";

export async function GET(request: Request) {
  try {
    const name = new URL(request.url).searchParams.get("name") ?? "";

    return Response.json({
      name,
      available: await isUserNameAvailable(name),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to check user name." }, { status: 400 });
  }
}
