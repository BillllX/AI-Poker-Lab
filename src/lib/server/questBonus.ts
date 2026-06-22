import { randomUUID } from "node:crypto";
import { currentClubDay } from "./clubDay";
import { prisma } from "./prisma";
import { getUser } from "./userRegistry";
import { listTodayBadges, userHasCoachingNoteToday } from "./userDailyBadges";

export type QuestBonusReason = "quest_star" | "quest_core" | "quest_master";

export type QuestBonusEligibilityInput = {
  badgeKinds: ReadonlySet<string>;
  dailySettlementsToday: number;
  hasCoachingNoteToday: boolean;
  hasQuestStarBonusToday: boolean;
  reason: QuestBonusReason;
};

export function evaluateQuestBonusEligibility(input: QuestBonusEligibilityInput) {
  const { badgeKinds, dailySettlementsToday, hasCoachingNoteToday, hasQuestStarBonusToday, reason } = input;

  if (reason === "quest_master") {
    return badgeKinds.has("quest_master") && hasQuestStarBonusToday;
  }

  if (reason === "quest_core") {
    return hasCoachingNoteToday && (badgeKinds.has("grinder") || dailySettlementsToday >= 1);
  }

  if (reason === "quest_star") {
    return badgeKinds.has("quest_master");
  }

  return false;
}

export function resolveQuestBonusGrant(existing: unknown, eligible: boolean) {
  if (existing) {
    return { conflict: true as const };
  }
  if (!eligible) {
    return { conflict: false as const, ineligible: true as const };
  }
  return { conflict: false as const, grant: true as const };
}

const BONUS_AMOUNTS: Record<QuestBonusReason, number> = {
  quest_core: 15,
  quest_master: 50,
  quest_star: 25,
};

const LEDGER_TYPE = "QUEST_BONUS";

function ledgerNote(reason: QuestBonusReason) {
  return `quest_bonus:${reason}`;
}

export async function findQuestBonusToday(userId: string, reason: QuestBonusReason, dayKey = currentClubDay()) {
  return prisma.pointsLedger.findFirst({
    where: {
      dayKey,
      type: LEDGER_TYPE,
      userId,
      note: ledgerNote(reason),
    },
  });
}

async function isEligibleForQuestBonus(userId: string, reason: QuestBonusReason, dayKey: string) {
  const badges = await listTodayBadges(userId);
  const badgeKinds = new Set(badges.map((entry) => entry.badge));
  const user = await getUser(userId);
  const starBonus =
    reason === "quest_master" ? await findQuestBonusToday(userId, "quest_star", dayKey) : null;

  return evaluateQuestBonusEligibility({
    badgeKinds,
    dailySettlementsToday: user.dailySettlementsToday,
    hasCoachingNoteToday: await userHasCoachingNoteToday(userId),
    hasQuestStarBonusToday: Boolean(starBonus),
    reason,
  });
}

export async function grantQuestBonus(userId: string, reason: QuestBonusReason) {
  const dayKey = currentClubDay();
  const existing = await findQuestBonusToday(userId, reason, dayKey);
  const eligible = await isEligibleForQuestBonus(userId, reason, dayKey);
  const resolution = resolveQuestBonusGrant(existing, eligible);
  if ("conflict" in resolution && resolution.conflict) {
    return { conflict: true as const, existing };
  }
  if ("ineligible" in resolution && resolution.ineligible) {
    return { conflict: false as const, ineligible: true as const };
  }

  const amount = BONUS_AMOUNTS[reason];

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      data: { pointsBalance: { increment: amount } },
      where: { id: userId },
    });

    const ledger = await tx.pointsLedger.create({
      data: {
        amount,
        balanceAfter: updated.pointsBalance,
        dayKey,
        frozenAfter: updated.frozenPoints,
        id: `ledger_${randomUUID().replace(/-/g, "")}`,
        note: ledgerNote(reason),
        type: LEDGER_TYPE,
        userId,
      },
    });

    return { granted: amount, ledger, pointsBalance: updated.pointsBalance };
  });

  return { conflict: false as const, ...result };
}

export async function sumQuestBonusToday(userId: string, dayKey = currentClubDay()) {
  const rows = await prisma.pointsLedger.findMany({
    where: { dayKey, type: LEDGER_TYPE, userId },
  });
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

export async function listQuestBonusToday(userId: string, dayKey = currentClubDay()) {
  const rows = await prisma.pointsLedger.findMany({
    orderBy: { createdAt: "asc" },
    where: { dayKey, type: LEDGER_TYPE, userId },
  });
  return rows.map((row) => ({
    amount: row.amount,
    reason: row.note?.replace("quest_bonus:", "") ?? "unknown",
  }));
}

export async function assertUserExists(userId: string) {
  return getUser(userId);
}
