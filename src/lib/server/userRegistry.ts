import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { logger } from "./logger";

export type ClubUser = {
  id: string;
  name: string;
  pointsBalance: number;
  frozenPoints: number;
  dailyProfitToday: number;
  dailySettlementsToday: number;
  createdAt: string;
};

export type CreateUserInput = {
  name?: string;
  email?: string;
};

const initialPointsBalance = 10_000;

export async function listUsers() {
  const [users, dailyProfits] = await Promise.all([prisma.user.findMany({ orderBy: { createdAt: "asc" } }), dailyProfitStatsForToday()]);
  return users.map((user) => {
    const profit = dailyProfits.get(user.id);
    return publicUser(user, profit?.amount ?? 0, profit?.settlements ?? 0);
  });
}

export async function isUserNameAvailable(name: string) {
  const normalized = normalizeName(name);
  const existing = await prisma.user.findUnique({ where: { name: normalized } });
  return !existing;
}

export async function getUser(userId: string) {
  const user = await findStoredUser(userId);
  const dailyProfits = await dailyProfitStatsForToday([userId]);
  const profit = dailyProfits.get(user.id);
  return publicUser(user, profit?.amount ?? 0, profit?.settlements ?? 0);
}

export async function createUser(input: CreateUserInput) {
  const name = normalizeName(input.name ?? "");
  const email = normalizeEmail(input.email ?? "");

  if (!(await isUserNameAvailable(name))) {
    throw new Error("User name is already taken.");
  }

  const userToken = `utok_${randomBytes(24).toString("base64url")}`;
  const storedUser = await prisma.user.create({
    data: {
      id: `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
      name,
      email,
      pointsBalance: initialPointsBalance,
      frozenPoints: 0,
      tokenHash: hashToken(userToken),
    },
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Email is already registered.");
    }
    throw error;
  });

  logger.info("user.created", { ownerUserId: storedUser.id, name: storedUser.name });

  return {
    user: publicUser(storedUser, 0, 0),
    userToken,
  };
}

export async function verifyUserToken(userId: string, token: unknown) {
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("userToken is required.");
  }

  const user = await findStoredUser(userId);
  if (user.tokenHash !== hashToken(token)) {
    throw new Error("userToken is invalid for this ownerUserId.");
  }

  const dailyProfits = await dailyProfitStatsForToday([userId]);
  const profit = dailyProfits.get(user.id);
  return publicUser(user, profit?.amount ?? 0, profit?.settlements ?? 0);
}

export type GameBuyIn = {
  agentId: string;
  ownerUserId: string;
  amount: number;
  gameSessionId?: string;
};

export type GameSettlement = GameBuyIn & {
  finalStack: number;
};

export async function reserveGameBuyIns(buyIns: GameBuyIn[]) {
  const totals = totalsByOwner(buyIns, "amount");
  const sessionId = commonSessionId(buyIns);
  logger.info("points.reserve_started", {
    gameSessionId: sessionId,
    buyInCount: buyIns.length,
    ownerCount: totals.size,
    totalAmount: sumValues(totals),
  });

  await prisma.$transaction(async (tx) => {
    for (const [ownerUserId, amount] of totals) {
      const updated = await tx.user.updateMany({
        data: {
          frozenPoints: { increment: amount },
          pointsBalance: { decrement: amount },
        },
        where: {
          id: ownerUserId,
          pointsBalance: { gte: amount },
        },
      });

      if (updated.count !== 1) {
        await assertUserCanReserve(tx, ownerUserId, amount);
      }

      const user = await tx.user.findUniqueOrThrow({ where: { id: ownerUserId } });
      await tx.pointsLedger.create({
        data: {
          id: `ledger_${randomUUID().replace(/-/g, "")}`,
          userId: ownerUserId,
          type: "FREEZE_BUY_IN",
          amount: -amount,
          balanceAfter: user.pointsBalance,
          frozenAfter: user.frozenPoints,
          gameSessionId: sessionId,
          dayKey: currentClubDay(),
          note: "Freeze Agent buy-in for a game session.",
        },
      });
    }
  });
  logger.info("points.reserve_completed", {
    gameSessionId: sessionId,
    buyInCount: buyIns.length,
    ownerCount: totals.size,
    totalAmount: sumValues(totals),
  });
}

export async function settleGameBuyIns(settlements: GameSettlement[]) {
  const frozenReleases = totalsByOwner(settlements, "amount");
  const payouts = totalsByOwner(settlements, "finalStack");
  const sessionId = commonSessionId(settlements);
  const today = currentClubDay();
  logger.info("points.settle_started", {
    gameSessionId: sessionId,
    settlementCount: settlements.length,
    ownerCount: frozenReleases.size,
    frozenRelease: sumValues(frozenReleases),
    payout: sumValues(payouts),
  });

  await prisma.$transaction(async (tx) => {
    for (const [ownerUserId, frozenRelease] of frozenReleases) {
      const payout = payouts.get(ownerUserId) ?? 0;
      const profit = payout - frozenRelease;
      const updated = await tx.user.updateMany({
        data: {
          frozenPoints: { decrement: frozenRelease },
          pointsBalance: { increment: payout },
        },
        where: {
          id: ownerUserId,
          frozenPoints: { gte: frozenRelease },
        },
      });

      if (updated.count !== 1) {
        throw new Error(`Unable to settle buy-in for ownerUserId ${ownerUserId}.`);
      }

      const user = await tx.user.findUniqueOrThrow({ where: { id: ownerUserId } });
      await tx.pointsLedger.create({
        data: {
          id: `ledger_${randomUUID().replace(/-/g, "")}`,
          userId: ownerUserId,
          type: "SETTLE_PROFIT",
          amount: profit,
          balanceAfter: user.pointsBalance,
          frozenAfter: user.frozenPoints,
          gameSessionId: sessionId,
          dayKey: today,
          note: "Settle Agent final table stack back to owner points.",
        },
      });
    }
  });
  logger.info("points.settle_completed", {
    gameSessionId: sessionId,
    settlementCount: settlements.length,
    ownerCount: frozenReleases.size,
    frozenRelease: sumValues(frozenReleases),
    payout: sumValues(payouts),
    dayKey: today,
  });
}

function publicUser(
  user: { id: string; name: string; pointsBalance: number; frozenPoints: number; createdAt: Date },
  dailyProfitToday: number,
  dailySettlementsToday: number,
): ClubUser {
  return {
    id: user.id,
    name: user.name,
    pointsBalance: user.pointsBalance,
    frozenPoints: user.frozenPoints ?? 0,
    dailyProfitToday,
    dailySettlementsToday,
    createdAt: user.createdAt.toISOString(),
  };
}

async function findStoredUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error("ownerUserId does not exist.");
  }

  return user;
}
function totalsByOwner<T extends { ownerUserId: string }>(items: T[], key: keyof T) {
  const totals = new Map<string, number>();

  for (const item of items) {
    const rawValue = item[key];
    const amount = typeof rawValue === "number" && Number.isFinite(rawValue) ? Math.max(0, rawValue) : 0;
    totals.set(item.ownerUserId, (totals.get(item.ownerUserId) ?? 0) + amount);
  }

  return totals;
}

function commonSessionId(items: Array<{ gameSessionId?: string }>) {
  const sessionIds = [...new Set(items.map((item) => item.gameSessionId).filter((value): value is string => Boolean(value)))];
  return sessionIds.length === 1 ? sessionIds[0] : undefined;
}

function sumValues(values: Map<string, number>) {
  return [...values.values()].reduce((sum, value) => sum + value, 0);
}

async function dailyProfitStatsForToday(userIds?: string[]) {
  const rows = await prisma.pointsLedger.groupBy({
    _sum: { amount: true },
    _count: { _all: true },
    by: ["userId"],
    where: {
      dayKey: currentClubDay(),
      type: "SETTLE_PROFIT",
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
  });

  return new Map(rows.map((row) => [row.userId, { amount: row._sum.amount ?? 0, settlements: row._count._all }]));
}

async function assertUserCanReserve(tx: Prisma.TransactionClient, ownerUserId: string, amount: number) {
  const user = await tx.user.findUnique({ where: { id: ownerUserId } });

  if (!user) {
    throw new Error(`ownerUserId ${ownerUserId} does not exist.`);
  }

  if (user.pointsBalance < amount) {
    throw new Error(`User ${user.name} does not have enough available points for Agent buy-in.`);
  }

  throw new Error(`Unable to reserve buy-in for ownerUserId ${ownerUserId}.`);
}

function currentClubDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeName(value: string) {
  const name = value.trim().slice(0, 64);

  if (!name) {
    throw new Error("User name is required.");
  }

  return name;
}

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase().slice(0, 254);

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email format is invalid.");
  }

  return email;
}
