import { createHash, randomUUID } from "node:crypto";
import { initialStack } from "../poker/gameEngine";
import { listAgents, queueAgent, upsertResidentAgent, type RegisteredAgent } from "./agentRegistry";
import { prisma } from "./prisma";

type ResidentAgentTemplate = {
  id: string;
  name: string;
  prompt: string;
};

const residentBankroll = 10_000;
const residentModelName = process.env.RESIDENT_AGENT_MODEL ?? process.env.HOSTED_AGENT_MODEL ?? "MiniMax M2.7 Highspeed";
const residentTargetQueued = Math.max(4, Number(process.env.RESIDENT_AGENT_TARGET_QUEUED ?? 8));

const defaultResidentAgents: ResidentAgentTemplate[] = [
  {
    id: "resident-lin-chuan",
    name: "林川",
    prompt: "你是林川，一名稳健紧凶型德州扑克玩家。你重视长期 EV，少打边缘牌，强牌和强听牌主动施压。",
  },
  {
    id: "resident-chen-yuan",
    name: "陈予安",
    prompt: "你是陈予安，一名观察力很强的德州扑克玩家。你会根据位置和下注尺度调整策略，避免无意义冒险。",
  },
  {
    id: "resident-takahashi-ren",
    name: "高桥莲",
    prompt: "你是高桥莲，一名耐心、纪律性强的德州扑克玩家。你喜欢控制底池，在对手示弱时逐步施压。",
  },
  {
    id: "resident-sato-mio",
    name: "佐藤澪",
    prompt: "你是佐藤澪，一名小注控池型德州扑克玩家。你谨慎处理边缘牌，擅长用位置优势偷取小底池。",
  },
  {
    id: "resident-oliver-reed",
    name: "Oliver Reed",
    prompt: "你是 Oliver Reed，一名数学型德州扑克玩家。你重视赔率、范围和筹码深度，倾向选择风险收益清晰的动作。",
  },
  {
    id: "resident-maya-stone",
    name: "Maya Stone",
    prompt: "你是 Maya Stone，一名位置型德州扑克玩家。你在后位更主动，前位更谨慎，会利用下注节奏制造压力。",
  },
  {
    id: "resident-wang-muyan",
    name: "王慕言",
    prompt: "你是王慕言，一名冷静细致的德州扑克玩家。你会尊重对手强线，但在多人弃牌倾向明显时主动偷盲。",
  },
  {
    id: "resident-emily-carter",
    name: "Emily Carter",
    prompt: "你是 Emily Carter，一名均衡型德州扑克玩家。你会混合价值下注和少量诈唬，优先选择稳定、可持续的打法。",
  },
];

export function isResidentAgentsEnabled() {
  return process.env.RESIDENT_AGENTS_ENABLED !== "false";
}

export function isResidentAgent(agent: RegisteredAgent | undefined): agent is RegisteredAgent & { kind: "resident"; ownerUserId: string } {
  return agent?.kind === "resident" && Boolean(agent.ownerUserId);
}

export async function ensureResidentAgentPool() {
  if (!isResidentAgentsEnabled()) {
    return [];
  }

  const agents: RegisteredAgent[] = [];
  for (const template of defaultResidentAgents) {
    const ownerUserId = residentOwnerUserId(template.id);
    await ensureResidentUser(template, ownerUserId);
    agents.push(upsertResidentAgent({
      id: template.id,
      modelName: residentModelName,
      name: template.name,
      ownerUserId,
    }));
  }
  return agents;
}

export async function queueResidentAgents(targetQueued = residentTargetQueued) {
  const pool = await ensureResidentAgentPool();
  const queuedOrActive = listAgents().filter(
    (agent) => agent.kind === "resident" && (agent.assignmentStatus === "queued" || agent.assignmentStatus === "seated" || agent.assignmentStatus === "playing"),
  ).length;
  const seatsToQueue = Math.max(0, targetQueued - queuedOrActive);
  const available = pool
    .filter((agent) => !agent.tableId && agent.assignmentStatus !== "queued")
    .sort((left, right) => left.registeredAt.localeCompare(right.registeredAt) || left.id.localeCompare(right.id))
    .slice(0, seatsToQueue);

  for (const agent of available) {
    queueAgent(agent.id);
  }

  return available;
}

export function residentOwnerUserId(agentId: string) {
  return `resident_user_${agentId.replace(/^resident-/, "").replace(/-/g, "_")}`;
}

async function ensureResidentUser(template: ResidentAgentTemplate, ownerUserId: string) {
  const tokenHash = createHash("sha256").update(`resident:${template.id}`).digest("hex");
  await prisma.user.upsert({
    create: {
      encryptedUserToken: null,
      frozenPoints: 0,
      id: ownerUserId,
      name: template.name,
      passwordHash: null,
      pointsBalance: residentBankroll,
      tokenHash,
    },
    update: {},
    where: { id: ownerUserId },
  });
  await prisma.agentPrivateSettings.upsert({
    create: {
      agentPrompt: template.prompt,
      id: `agent_private_settings_${randomUUID().replace(/-/g, "")}`,
      ownerUserId,
    },
    update: {
      agentPrompt: template.prompt,
    },
    where: { ownerUserId },
  });

  const user = await prisma.user.findUnique({ where: { id: ownerUserId } });
  if (user && user.pointsBalance < initialStack) {
    await prisma.user.update({
      data: { pointsBalance: residentBankroll },
      where: { id: ownerUserId },
    });
  }
}
