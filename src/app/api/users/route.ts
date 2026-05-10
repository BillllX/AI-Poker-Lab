import { consumeCaptcha } from "@/lib/server/captcha";
import { createUser, listUsers } from "@/lib/server/userRegistry";

export async function GET() {
  return Response.json({ users: await listUsers() });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    consumeCaptcha(payload.captchaId, payload.captchaAnswer);
    return Response.json(await createUser(payload));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create user." }, { status: 400 });
  }
}
