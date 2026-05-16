import { consumeCaptcha } from "@/lib/server/captcha";
import { syncOwnerAgentNames } from "@/lib/server/agentRegistry";
import { createUser, listUsers, updateUserName } from "@/lib/server/userRegistry";

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

export async function PATCH(request: Request) {
  try {
    const payload = await request.json();
    const user = await updateUserName(payload);
    const syncedAgents = syncOwnerAgentNames(user.id, user.name);
    return Response.json({ user, syncedAgents });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update user name." }, { status: 400 });
  }
}
