import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";

export type AgentPrivateSettingsInput = {
  agentPrompt?: unknown;
};

export async function getAgentPrivateSettings(ownerUserId: string) {
  const settings = await prisma.agentPrivateSettings.findUnique({ where: { ownerUserId } });
  return publicSettings(settings);
}

export async function updateAgentPrivateSettings(ownerUserId: string, input: AgentPrivateSettingsInput) {
  const agentPrompt = normalizeAgentPrompt(input.agentPrompt);
  const settings = await prisma.agentPrivateSettings.upsert({
    create: {
      id: `agent_private_settings_${randomUUID().replace(/-/g, "")}`,
      ownerUserId,
      agentPrompt,
    },
    update: {
      agentPrompt,
    },
    where: { ownerUserId },
  });

  return publicSettings(settings);
}

function publicSettings(settings: { agentPrompt: string | null; updatedAt: Date } | null) {
  return {
    agentPrompt: settings?.agentPrompt ?? "",
    updatedAt: settings?.updatedAt.toISOString(),
  };
}

function normalizeAgentPrompt(value: unknown) {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error("agentPrompt must be a string.");
  }
  const prompt = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (prompt.length > 4_000) {
    throw new Error("agentPrompt must be at most 4000 characters.");
  }
  return prompt;
}
