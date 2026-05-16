import { randomUUID } from "node:crypto";
import { normalizeAgentId } from "@/lib/server/agentRegistry";
import { prisma } from "@/lib/server/prisma";
import { validateProfileHtml, wrapProfileHtml } from "@/lib/server/profileHtml";
import { verifyUserToken } from "@/lib/server/userRegistry";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId: rawAgentId } = await context.params;
    const agentId = normalizeAgentId(rawAgentId);
    const input = await request.json();

    if (typeof input.ownerUserId !== "string" || !input.ownerUserId.trim()) {
      return Response.json({ error: "ownerUserId is required." }, { status: 400 });
    }

    await verifyUserToken(input.ownerUserId, input.userToken);
    await assertAgentOwner(agentId, input.ownerUserId);
    const html = validateProfileHtml(input.html);

    const content = await prisma.agentProfileContent.upsert({
      create: {
        id: `profile_content_${randomUUID().replace(/-/g, "")}`,
        agentId,
        ownerUserId: input.ownerUserId,
        html,
      },
      update: { html },
      where: {
        agentId_ownerUserId: {
          agentId,
          ownerUserId: input.ownerUserId,
        },
      },
    });

    return Response.json({
      ok: true,
      profileHtml: {
        source: "custom",
        updatedAt: content.updatedAt.toISOString(),
        html: wrapProfileHtml(content.html),
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update profile html." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ agentId: string }> }) {
  try {
    const { agentId: rawAgentId } = await context.params;
    const agentId = normalizeAgentId(rawAgentId);
    const input = await request.json();

    if (typeof input.ownerUserId !== "string" || !input.ownerUserId.trim()) {
      return Response.json({ error: "ownerUserId is required." }, { status: 400 });
    }

    await verifyUserToken(input.ownerUserId, input.userToken);
    await prisma.agentProfileContent.deleteMany({ where: { agentId, ownerUserId: input.ownerUserId } });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to delete profile html." }, { status: 400 });
  }
}

async function assertAgentOwner(agentId: string, ownerUserId: string) {
  const qualification = await prisma.agentQualification.findFirst({ where: { agentId, ownerUserId } });
  if (qualification) {
    return;
  }

  if (agentId === ownerUserId) {
    return;
  }

  throw new Error("Agent does not belong to this ownerUserId.");
}
