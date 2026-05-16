import { listAgents, normalizeAgentId } from "@/lib/server/agentRegistry";
import { prisma } from "@/lib/server/prisma";
import { getTableManager } from "@/lib/server/simulator";
import type { RegisteredAgent } from "@/lib/server/agentRegistry";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ agentId: string }> }) {
  const { agentId: rawAgentId } = await context.params;
  const agentId = normalizeAgentId(rawAgentId);
  const agent = await resolveProfileAgent(agentId);

  if (!agent) {
    return Response.json({ error: "Agent was not found." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const tableManager = getTableManager(origin);
  const table = agent.tableId ? tableManager.table(agent.tableId) : undefined;
  const snapshot = table?.runner.snapshot();
  const player = snapshot?.players.find((item) => item.id === agent.id);
  const stats = snapshot?.stats.find((item) => item.playerId === agent.id);
  const modelStat = snapshot?.modelStats.find((item) => item.modelName === (agent.modelName ?? "Unknown Model"));
  const tableSummary = table?.runner.tableSummary();

  return Response.json({
    agent,
    badges: badgesFor({ agent, player, stats }),
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

async function resolveProfileAgent(profileId: string): Promise<RegisteredAgent | undefined> {
  const agents = listAgents();
  const activeAgent = agents.find((item) => item.id === profileId) ?? agents.find((item) => item.ownerUserId === profileId);
  if (activeAgent) {
    return activeAgent;
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

  if (!user) {
    return undefined;
  }

  const qualification = user.agentQualifications[0];
  return {
    id: qualification?.agentId ?? user.id,
    name: qualification?.agentId ?? user.name,
    ownerUserId: user.id,
    modelName: qualification?.modelName,
    kind: "external",
    registeredAt: qualification?.passedAt.toISOString() ?? user.createdAt.toISOString(),
    assignmentStatus: "registered",
  };
}

function badgesFor(input: {
  agent: ReturnType<typeof listAgents>[number];
  player?: { stack: number; status: string };
  stats?: { handsPlayed: number; handsWon: number; profit: number };
}) {
  const badges: string[] = [];
  const lastSeenAt = input.agent.lastSeenAt ? new Date(input.agent.lastSeenAt).getTime() : 0;

  if (input.agent.kind === "virtual") {
    badges.push("BOT");
  }
  if (Date.now() - lastSeenAt <= 30_000) {
    badges.push("Online");
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
