import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const skillPath = path.join(process.cwd(), ".cursor", "skills", "texas-poker-agent", "SKILL.md");
  const content = await readFile(skillPath, "utf8");

  return new Response(content, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
