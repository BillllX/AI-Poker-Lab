import { createCaptcha } from "@/lib/server/captcha";

export async function GET() {
  return Response.json(createCaptcha());
}
