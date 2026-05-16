import { listAgents, normalizeAgentId } from "@/lib/server/agentRegistry";
import { prisma } from "@/lib/server/prisma";
import { buildDefaultProfileHtml, wrapProfileHtml } from "@/lib/server/profileHtml";
import { getTableManager } from "@/lib/server/simulator";
import type { RegisteredAgent } from "@/lib/server/agentRegistry";

export const runtime = "nodejs";

type ProfileUser = {
  id: string;
  name: string;
  pointsBalance: number;
  frozenPoints: number;
  createdAt: Date;
};

type ProfileQualification = {
  agentId: string;
  modelName: string;
  protocolVersion: string;
  passedAt: Date;
};

type ResolvedProfile = {
  agent: RegisteredAgent;
  user?: ProfileUser;
  qualification?: ProfileQualification;
  live: boolean;
};

export async function GET(request: Request, context: { params: Promise<{ agentId: string }> }) {
  const { agentId: rawAgentId } = await context.params;
  const normalizedAgentId = normalizeAgentId(rawAgentId);
  const profile = await resolveProfile(rawAgentId, normalizedAgentId);

  if (!profile) {
    return Response.json({ error: "Agent was not found." }, { status: 404 });
  }

  const { agent, qualification, user } = profile;
  const origin = new URL(request.url).origin;
  const tableManager = getTableManager(origin);
  const table = agent.tableId ? tableManager.table(agent.tableId) : undefined;
  const snapshot = table?.runner.snapshot();
  const player = snapshot?.players.find((item) => item.id === agent.id);
  const stats = snapshot?.stats.find((item) => item.playerId === agent.id);
  const modelStat = snapshot?.modelStats.find((item) => item.modelName === (agent.modelName ?? "Unknown Model"));
  const tableSummary = table?.runner.tableSummary();
  const historyWhere = historyWhereFor(rawAgentId, profile);
  const [historyAggregate, bestResult, recentResults] = await Promise.all([
    prisma.agentResult.aggregate({
      _count: { _all: true },
      _max: { settledAt: true },
      _sum: { handsPlayed: true, handsWon: true, profit: true },
      where: historyWhere,
    }),
    prisma.agentResult.findFirst({
      orderBy: [{ profit: "desc" }, { settledAt: "desc" }],
      where: historyWhere,
    }),
    prisma.agentResult.findMany({
      orderBy: { settledAt: "desc" },
      take: 8,
      where: historyWhere,
    }),
  ]);
  const historySummary = {
    sessions: historyAggregate._count._all,
    handsPlayed: historyAggregate._sum.handsPlayed ?? 0,
    handsWon: historyAggregate._sum.handsWon ?? 0,
    profit: historyAggregate._sum.profit ?? 0,
    bestProfit: bestResult?.profit ?? 0,
    lastSettledAt: historyAggregate._max.settledAt?.toISOString(),
  };
  const profileContent = user
    ? await prisma.agentProfileContent.findFirst({
        orderBy: { updatedAt: "desc" },
        where: {
          ownerUserId: user.id,
          OR: [{ agentId: agent.id }, { agentId: rawAgentId }],
        },
      })
    : undefined;
  const displayName = user?.name ?? agent.name;

  return Response.json({
    agent,
    badges: badgesFor({ agent, live: profile.live, player, qualification, stats, user }),
    identity: {
      profileId: rawAgentId,
      agentId: agent.id,
      agentName: agent.name,
      ownerUserId: user?.id ?? agent.ownerUserId,
      ownerName: user?.name,
      modelName: agent.modelName ?? qualification?.modelName,
      protocolVersion: qualification?.protocolVersion,
      qualifiedAt: qualification?.passedAt.toISOString(),
      userCreatedAt: user?.createdAt.toISOString(),
      pointsBalance: user?.pointsBalance,
      frozenPoints: user?.frozenPoints,
    },
    live: {
      online: profile.live,
      seated: Boolean(agent.tableId),
      lastSeenAt: agent.lastSeenAt,
      assignmentStatus: profile.live ? agent.assignmentStatus : "offline",
    },
    historySummary,
    profileHtml: {
      source: profileContent ? "custom" : "default",
      updatedAt: profileContent?.updatedAt.toISOString(),
      html: profileContent
        ? wrapProfileHtml(profileContent.html)
        : buildDefaultProfileHtml({
            agentId: agent.id,
            badges: badgesFor({ agent, live: profile.live, player, qualification, stats, user }),
            displayName,
            history: historySummary,
            modelName: agent.modelName ?? qualification?.modelName,
            status: profile.live ? agent.assignmentStatus : "offline",
          }),
    },
    recentResults: recentResults.map((result) => ({
      id: result.id,
      agentId: result.agentId,
      modelName: result.modelName,
      tableId: result.tableId,
      gameSessionId: result.gameSessionId,
      buyIn: result.buyIn,
      finalStack: result.finalStack,
      profit: result.profit,
      handsPlayed: result.handsPlayed,
      handsWon: result.handsWon,
      settledReason: result.settledReason,
      settledAt: result.settledAt.toISOString(),
    })),
    modelStat: modelStat ?? null,
    stats: stats
      ? {
          handsPlayed: stats.handsPlayed,
          handsWon: stats.handsWon,
          profit: stats.profit,
          stack: player?.stack,
          status: player?.status,
        }
      : null,
    table: tableSummary
      ? {
          ...tableSummary,
          url: `${origin}/tables/${tableSummary.id}`,
        }
      : null,
  });
}

function historyWhereFor(profileId: string, profile: ResolvedProfile) {
  if (profile.user?.id === profileId) {
    return { ownerUserId: profile.user.id };
  }

  return { agentId: profile.agent.id };
}

async function resolveProfile(profileId: string, normalizedAgentId: string): Promise<ResolvedProfile | undefined> {
  const agents = listAgents();
  const activeAgent = agents.find((item) => item.id === normalizedAgentId) ?? agents.find((item) => item.ownerUserId === profileId);
  if (activeAgent) {
    const [user, qualification] = await Promise.all([
      activeAgent.ownerUserId ? prisma.user.findUnique({ where: { id: activeAgent.ownerUserId } }) : undefined,
      prisma.agentQualification.findFirst({
        orderBy: { passedAt: "desc" },
        where: {
          agentId: activeAgent.id,
          ownerUserId: activeAgent.ownerUserId,
          modelName: activeAgent.modelName,
        },
      }),
    ]);
    return { agent: activeAgent, live: true, qualification: qualification ?? undefined, user: user ?? undefined };
  }

  const user = await prisma.user.findUnique({
    include: {
      agentQualifications: {
        orderBy: { passedAt: "desc" },
        take: 1,
      },
    },
    where: { id: profileId },
  });

  if (user) {
    const qualification = user.agentQualifications[0];
    return {
      agent: agentFromStoredProfile({
        agentId: qualification?.agentId ?? user.id,
        agentName: qualification?.agentId ?? user.name,
        modelName: qualification?.modelName,
        ownerUserId: user.id,
        registeredAt: qualification?.passedAt ?? user.createdAt,
      }),
      live: false,
      qualification,
      user,
    };
  }

  const qualification = await prisma.agentQualification.findFirst({
    include: { user: true },
    orderBy: { passedAt: "desc" },
    where: { agentId: normalizedAgentId },
  });

  if (!qualification) {
    return undefined;
  }

  return {
    agent: agentFromStoredProfile({
      agentId: qualification.agentId,
      agentName: qualification.agentId,
      modelName: qualification.modelName,
      ownerUserId: qualification.ownerUserId,
      registeredAt: qualification.passedAt,
    }),
    live: false,
    qualification,
    user: qualification.user,
  };
}

function agentFromStoredProfile(input: {
  agentId: string;
  agentName: string;
  modelName?: string;
  ownerUserId: string;
  registeredAt: Date;
}): RegisteredAgent {
  return {
    id: input.agentId,
    name: input.agentName,
    ownerUserId: input.ownerUserId,
    modelName: input.modelName,
    kind: "external",
    registeredAt: input.registeredAt.toISOString(),
    assignmentStatus: "registered",
  };
}

function badgesFor(input: {
  agent: RegisteredAgent;
  live: boolean;
  player?: { stack: number; status: string };
  qualification?: ProfileQualification;
  stats?: { handsPlayed: number; handsWon: number; profit: number };
  user?: ProfileUser;
}) {
  const badges: string[] = [];
  const lastSeenAt = input.agent.lastSeenAt ? new Date(input.agent.lastSeenAt).getTime() : 0;

  if (!input.live) {
    badges.push("Offline");
  }
  if (input.agent.kind === "virtual") {
    badges.push("BOT");
  }
  if (input.live && Date.now() - lastSeenAt <= 30_000) {
    badges.push("Online");
  }
  if (input.qualification) {
    badges.push("Qualified");
  }
  if ((input.user?.pointsBalance ?? 0) > 0) {
    badges.push("Funded");
  }
  if ((input.stats?.profit ?? 0) > 0) {
    badges.push("Profitable");
  }
  if ((input.stats?.handsPlayed ?? 0) >= 10) {
    badges.push("Grinder");
  }
  if ((input.stats?.handsWon ?? 0) > 0) {
    badges.push("Winner");
  }
  if (input.player && input.player.stack > 0 && input.player.stack <= 300) {
    badges.push("Short-stack Survivor");
  }

  return badges.length > 0 ? badges : ["New Agent"];
}
