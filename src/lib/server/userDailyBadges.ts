import { randomUUID } from "node:crypto";
import type { AgentHandSummary } from "../poker/types";
import { currentClubDay, previousClubDay } from "./clubDay";
import { listAgents as listRegisteredAgents } from "./agentRegistry";
import { getRuntimeInstructions } from "./runtimeInstructions";
import { prisma } from "./prisma";
import { getUser, rankUser } from "./userRegistry";

export type DailyBadgeKind = "climber" | "grinder" | "highlight" | "quest_master";

export const DAILY_BADGE_KINDS: DailyBadgeKind[] = ["climber", "grinder", "highlight", "quest_master"];

export async function listTodayBadges(userId: string) {
  await maybeAwardGrinderBadge(userId);
  return prisma.userDailyBadge.findMany({
    orderBy: { earnedAt: "asc" },
    where: { dayKey: currentClubDay(), userId },
  });
}

export async function awardDailyBadge(userId: string, badge: DailyBadgeKind) {
  const dayKey = currentClubDay();
  return prisma.userDailyBadge.upsert({
    create: {
      badge,
      dayKey,
      id: randomUUID(),
      userId,
    },
    update: {},
    where: { userId_dayKey_badge: { badge, dayKey, userId } },
  });
}

export async function maybeAwardHighlightBadges(summary: AgentHandSummary) {
  if (!summary.highlight) {
    return;
  }

  const agents = listRegisteredAgents();
  const ownerIds = new Set<string>();
  for (const player of summary.players) {
    const agent = agents.find((entry) => entry.id === player.playerId);
    if (agent?.ownerUserId) {
      ownerIds.add(agent.ownerUserId);
    }
  }

  await Promise.all([...ownerIds].map((ownerUserId) => awardDailyBadge(ownerUserId, "highlight")));
}

export async function maybeAwardGrinderBadge(userId: string) {
  const user = await getUser(userId);
  if (user.dailySettlementsToday < 3) {
    return null;
  }
  return awardDailyBadge(userId, "grinder");
}

export async function userHasCoachingNoteToday(userId: string) {
  const dayKey = currentClubDay();
  const ownedAgents = listRegisteredAgents().filter((agent) => agent.ownerUserId === userId);
  for (const agent of ownedAgents) {
    const { notes } = getRuntimeInstructions(agent.id);
    for (const note of notes) {
      if (note.sourceType !== "coaching") {
        continue;
      }
      if (currentClubDay(new Date(note.createdAt)) === dayKey) {
        return true;
      }
    }
  }
  return false;
}

export async function maybeAwardGrinderBadgeFromQuestCore(userId: string) {
  if (!(await userHasCoachingNoteToday(userId))) {
    return null;
  }
  return awardDailyBadge(userId, "grinder");
}

export async function maybeAwardClimberBadge(userId: string) {
  const currentRank = await rankUser(userId);
  if (!currentRank) {
    return null;
  }

  const previousSnapshot = await prisma.leaderboardDailySnapshot.findUnique({
    where: {
      dayKey_userId: {
        dayKey: previousClubDay(),
        userId,
      },
    },
  });
  if (!previousSnapshot || currentRank >= previousSnapshot.rank) {
    return null;
  }

  return awardDailyBadge(userId, "climber");
}

export async function claimDailyBadge(userId: string, badge: DailyBadgeKind, context?: "quest_core" | "quest_active") {
  if (badge === "climber") {
    return maybeAwardClimberBadge(userId);
  }
  if (badge === "grinder") {
    if (context === "quest_core") {
      return maybeAwardGrinderBadgeFromQuestCore(userId);
    }
    return maybeAwardGrinderBadge(userId);
  }
  if (badge === "quest_master" && context === "quest_active") {
    return awardDailyBadge(userId, "quest_master");
  }
  return null;
}
