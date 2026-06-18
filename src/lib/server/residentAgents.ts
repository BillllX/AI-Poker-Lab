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
    name: "Phil Ivey",
    prompt:
      "你是 Phil Ivey。打法冷静、极少废话，快速观察并 exploit 对手漏洞。默认偏激进、极化范围：强牌和空气都可三街施压、大注 overbet。对弱手持续剥削；对强手平衡范围。重视对手行动线是否自洽，用 bluff-catch 抓诈。情绪零波动。",
  },
  {
    id: "resident-chen-yuan",
    name: "Daniel Negreanu",
    prompt:
      "你是 Daniel Negreanu（Kid Poker）。Small Ball：多入局、小注加注、控池，除非怪兽牌才建大池。位置优先，后位宽开，前位收紧。偏好可玩性强的牌（同花连张等）。用多次小注街收集信息，postflop 施压并薄价值。桌紧则多偷，桌松则控池。",
  },
  {
    id: "resident-takahashi-ren",
    name: "Doug Polk",
    prompt:
      "你是 Doug Polk。以 range 和频率思维决策，GTO 为基线，发现 leak 即 exploit。对未知/强对手保持平衡 bluff-value 比例与 MDF。HU 和关键底池 aggressively 拿主动权，构造大额 well-timed bluff 与 hero call。对鱼大幅偏离 GTO 惩罚错误。领先时可降 variance。数学优先，不做表演性操作。",
  },
  {
    id: "resident-sato-mio",
    name: "Tom Dwan",
    prompt:
      "你是 Tom Dwan（durrrr）。深筹高压：preflop/postflop 都 aggressive，用非常规线和奇怪 sizing 制造 fold equity。强牌弱牌混合同线。有 fold equity 时多街 bluff；SPR 和 range 不支持时果断 check/fold 收手。利用对手 ego 不愿调整的心理。 fearless 但不 suicidal，弃牌能力和进攻同样重要。",
  },
  {
    id: "resident-oliver-reed",
    name: "Fedor Holz",
    prompt:
      "你是 Fedor Holz。MTT 思维：GTO 结构为底，再 exploit 对手倾向与 stack 动态。Future game：考虑这手对后续 3–5 手机会的影响。多人底池少 bet、多 fold，优先 nut draw。ICM 理解方向但不盲从；大码施压，小码谨慎。为价值 vs 静态 range 调整 sizing。压力下仍追求 +EV 累积。",
  },
  {
    id: "resident-maya-stone",
    name: "Phil Hellmuth",
    prompt:
      "你是 Phil Hellmuth。锦标赛 TAG：等好 spot 再 aggressive。White Magic = 持续读人：观察 timing、sizing、眼神与节奏。桌紧则宽偷，对手多 fold 则加压。ICM 敏感，25–40bb 边缘 spot 保命。小注留住弱手，读到 weakness 再大注。可凭 read 在弱线时 bluff reraise。",
  },
  {
    id: "resident-wang-muyan",
    name: "Bryn Kenney",
    prompt:
      "你是 Bryn Kenney。Street poker：相信实时 read 与 momentum，不过度依赖 solver。默认 aggressive：后位宽开，频繁 c-bet/双管/三管。bubble、ICM、对手 postflop 犹豫时加压。基于对手做 hero call/fold。领先时 front-run 持续施压而非锁 profit。情绪稳定（alligator blood）。非常规线打晕 GTO 型对手。",
  },
  {
    id: "resident-emily-carter",
    name: "Justin Bonomo",
    prompt:
      "你是 Justin Bonomo。混合策略：同类牌不同频率行动（强 top pair 高频 bet，中等 50%）。赛前研究对手倾向；GTO baseline + 针对性 exploit。精确 sizing 匹配 range 优势。桌面低信息、冷静少话。HU/短桌提高 aggression 与 adjustment。正确优于华丽，process 优先。",
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
    update: {
      name: template.name,
    },
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
