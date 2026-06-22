import { createCipheriv, createDecipheriv, createHash, createHmac, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { rankChangeFor, type RankTrend } from "@/lib/leaderboard/rankChange";
import { currentClubDay, previousClubDay, clubDayKeysForLastDays } from "./clubDay";
import { prisma } from "./prisma";
import { logger } from "./logger";

export type ClubUser = {
  id: string;
  name: string;
  pointsBalance: number;
  frozenPoints: number;
  dailyProfitToday: number;
  dailySettlementsToday: number;
  weeklyProfit?: number;
  currentRank?: number;
  previousRank?: number;
  rankDelta?: number;
  rankTrend?: RankTrend;
  createdAt: string;
};

export type LeaderboardSort = "daily" | "points" | "weekly";

export type CreateUserInput = {
  email?: unknown;
  name?: string;
  password?: string;
};

export type LoginUserInput = {
  name?: string;
  password?: string;
};

export type UpdateUserNameInput = {
  ownerUserId?: string;
  userToken?: string;
  name?: string;
  authenticatedOwnerUserId?: string;
};

const initialPointsBalance = 10_000;
export const userSessionCookieName = "texas_poker_user_session";
const userSessionTtlSeconds = 60 * 60 * 24 * 30;

export async function listUsers() {
  const [users, dailyProfits] = await Promise.all([prisma.user.findMany({ orderBy: { createdAt: "asc" } }), dailyProfitStatsForToday()]);
  return users.map((user) => {
    const profit = dailyProfits.get(user.id);
    return publicUser(user, profit?.amount ?? 0, profit?.settlements ?? 0);
  });
}

export async function listLeaderboardUsers(limit = 20, sort: LeaderboardSort = "points") {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));

  if (sort === "points") {
    const rankedUsers = await prisma.user.findMany({
      orderBy: [{ pointsBalance: "desc" }, { createdAt: "asc" }],
      select: {
        createdAt: true,
        frozenPoints: true,
        id: true,
        name: true,
        pointsBalance: true,
      },
    });
    const today = currentClubDay();
    const yesterday = previousClubDay(today);
    await ensureLeaderboardSnapshot(yesterday, rankedUsers);
    await refreshLeaderboardSnapshot(today, rankedUsers);

    const users = rankedUsers.slice(0, safeLimit);
    const userIds = users.map((user) => user.id);
    const [dailyProfits, weeklyProfits, previousSnapshots] = await Promise.all([
      dailyProfitStatsForToday(userIds),
      weeklyProfitStats(userIds),
      prisma.leaderboardDailySnapshot.findMany({
        select: { rank: true, userId: true },
        where: { dayKey: yesterday, userId: { in: userIds } },
      }),
    ]);
    const previousRanks = new Map(previousSnapshots.map((snapshot) => [snapshot.userId, snapshot.rank]));
    return users.map((user, index) => {
      const profit = dailyProfits.get(user.id);
      return {
        ...publicUser(user, profit?.amount ?? 0, profit?.settlements ?? 0),
        weeklyProfit: weeklyProfits.get(user.id) ?? 0,
        ...rankChangeFor(index + 1, previousRanks.get(user.id)),
      };
    });
  }

  const allUsers = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      frozenPoints: true,
      id: true,
      name: true,
      pointsBalance: true,
    },
  });
  const userIds = allUsers.map((user) => user.id);
  const [dailyProfits, weeklyProfits] = await Promise.all([
    dailyProfitStatsForToday(userIds),
    weeklyProfitStats(userIds),
  ]);

  const enriched = allUsers.map((user) => {
    const profit = dailyProfits.get(user.id);
    return {
      ...publicUser(user, profit?.amount ?? 0, profit?.settlements ?? 0),
      weeklyProfit: weeklyProfits.get(user.id) ?? 0,
    };
  });

  const sorted = enriched.sort((left, right) => compareLeaderboardBySort(left, right, sort));

  return sorted.slice(0, safeLimit);
}

export type LeaderboardMeRank = {
  rank: number;
  user: Pick<ClubUser, "dailyProfitToday" | "frozenPoints" | "id" | "name" | "pointsBalance" | "weeklyProfit">;
};

export async function getLeaderboardRankForUser(
  userId: string,
  sort: LeaderboardSort = "points",
): Promise<LeaderboardMeRank | undefined> {
  if (sort === "points") {
    const rank = await rankUser(userId);
    if (!rank) {
      return undefined;
    }

    const user = await getUser(userId);
    const weeklyProfit = (await weeklyProfitStats([userId])).get(userId) ?? 0;
    return {
      rank,
      user: {
        id: user.id,
        name: user.name,
        pointsBalance: user.pointsBalance,
        frozenPoints: user.frozenPoints,
        dailyProfitToday: user.dailyProfitToday,
        weeklyProfit,
      },
    };
  }

  const allUsers = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      frozenPoints: true,
      id: true,
      name: true,
      pointsBalance: true,
    },
  });
  const userIds = allUsers.map((user) => user.id);
  const [dailyProfits, weeklyProfits] = await Promise.all([
    dailyProfitStatsForToday(userIds),
    weeklyProfitStats(userIds),
  ]);

  const enriched = allUsers.map((user) => {
    const profit = dailyProfits.get(user.id);
    return {
      ...publicUser(user, profit?.amount ?? 0, profit?.settlements ?? 0),
      weeklyProfit: weeklyProfits.get(user.id) ?? 0,
    };
  });

  const sorted = enriched.sort((left, right) => compareLeaderboardBySort(left, right, sort));
  const index = sorted.findIndex((user) => user.id === userId);
  if (index === -1) {
    return undefined;
  }

  const user = sorted[index]!;
  return {
    rank: index + 1,
    user: {
      id: user.id,
      name: user.name,
      pointsBalance: user.pointsBalance,
      frozenPoints: user.frozenPoints,
      dailyProfitToday: user.dailyProfitToday,
      weeklyProfit: user.weeklyProfit,
    },
  };
}

function compareLeaderboardBySort(left: ClubUser, right: ClubUser, sort: LeaderboardSort) {
  const primary =
    sort === "daily"
      ? right.dailyProfitToday - left.dailyProfitToday
      : (right.weeklyProfit ?? 0) - (left.weeklyProfit ?? 0);
  if (primary !== 0) {
    return primary;
  }
  return right.pointsBalance - left.pointsBalance || left.name.localeCompare(right.name);
}

export async function rankUser(userId: string) {
  const user = await prisma.user.findUnique({
    select: { createdAt: true, id: true, pointsBalance: true },
    where: { id: userId },
  });
  if (!user) {
    return undefined;
  }

  const ahead = await prisma.user.count({
    where: {
      OR: [
        { pointsBalance: { gt: user.pointsBalance } },
        {
          createdAt: { lt: user.createdAt },
          pointsBalance: user.pointsBalance,
        },
      ],
    },
  });
  return ahead + 1;
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

export async function getUserLite(userId: string) {
  const user = await findStoredUser(userId);
  return publicUser(user, 0, 0);
}

export async function createUser(input: CreateUserInput) {
  const name = normalizeName(input.name ?? "");
  const email = normalizeEmail(input.email);
  const passwordHash = hashPassword(normalizePassword(input.password));

  if (!(await isUserNameAvailable(name))) {
    throw new Error("User name is already taken.");
  }
  if (!(await isUserEmailAvailable(email))) {
    throw new Error("Email address is already registered.");
  }

  const userToken = issueUserToken();
  const storedUser = await prisma.user.create({
    data: {
      email,
      id: `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
      name,
      passwordHash,
      pointsBalance: initialPointsBalance,
      frozenPoints: 0,
      tokenHash: hashToken(userToken),
      encryptedUserToken: encryptUserToken(userToken),
    },
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
      if (target.includes("email")) {
        throw new Error("Email address is already registered.");
      }
      throw new Error("User name is already taken.");
    }
    throw error;
  });

  logger.info("user.created", { ownerUserId: storedUser.id, name: storedUser.name });

  return {
    user: publicUser(storedUser, 0, 0),
    userToken,
  };
}

export async function loginUser(input: LoginUserInput) {
  const name = normalizeName(input.name ?? "");
  const password = normalizePassword(input.password);
  const user = await prisma.user.findUnique({ where: { name } });

  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw new Error("User name or password is incorrect.");
  }

  const dailyProfits = await dailyProfitStatsForToday([user.id]);
  const profit = dailyProfits.get(user.id);
  const userToken = decryptUserToken(user.encryptedUserToken);

  logger.info("user.logged_in", { ownerUserId: user.id, name: user.name, tokenAvailable: Boolean(userToken) });

  return {
    user: publicUser(user, profit?.amount ?? 0, profit?.settlements ?? 0),
    userToken,
  };
}

export async function getCurrentUserTokenForSession(ownerUserId: string) {
  const user = await findStoredUser(ownerUserId);
  return decryptUserToken(user.encryptedUserToken);
}

export async function resetUserTokenForSession(ownerUserId: string) {
  const userToken = issueUserToken();
  await prisma.user.update({
    data: {
      encryptedUserToken: encryptUserToken(userToken),
      tokenHash: hashToken(userToken),
    },
    where: { id: ownerUserId },
  });
  logger.warn("user.token_reset", { ownerUserId });
  return userToken;
}

export async function verifyUserToken(userId: string, token: unknown) {
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("userToken is required.");
  }

  const user = await findStoredUser(userId);
  if (user.tokenHash !== hashToken(token)) {
    throw new Error("userToken is invalid for this ownerUserId.");
  }

  return publicUser(user, 0, 0);
}

export async function getUserFromSessionCookie(cookieHeader: string | null) {
  const user = await findSessionUser(cookieHeader);
  if (!user) {
    return undefined;
  }

  const dailyProfits = await dailyProfitStatsForToday([user.id]);
  const profit = dailyProfits.get(user.id);
  return publicUser(user, profit?.amount ?? 0, profit?.settlements ?? 0);
}

export async function getUserFromSessionCookieLite(cookieHeader: string | null) {
  const user = await findSessionUser(cookieHeader);
  if (!user) {
    return undefined;
  }

  return publicUser(user, 0, 0);
}

export function getSessionUserIdFromCookie(cookieHeader: string | null) {
  return verifyUserSessionCookie(cookieHeader);
}

export function createUserSessionSetCookie(ownerUserId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + userSessionTtlSeconds;
  const payload = Buffer.from(JSON.stringify({ ownerUserId, expiresAt })).toString("base64url");
  const signature = signSessionPayload(payload);
  return serializeCookie(userSessionCookieName, `${payload}.${signature}`, userSessionTtlSeconds);
}

export function clearUserSessionSetCookie() {
  return serializeCookie(userSessionCookieName, "", 0);
}

export function verifyUserSessionCookie(cookieHeader: string | null) {
  const sessionCookie = parseCookie(cookieHeader ?? "")[userSessionCookieName];
  if (!sessionCookie) {
    return undefined;
  }

  const [payload, signature] = sessionCookie.split(".");
  if (!payload || !signature || signSessionPayload(payload) !== signature) {
    return undefined;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { ownerUserId?: unknown; expiresAt?: unknown };
    if (typeof decoded.ownerUserId !== "string" || typeof decoded.expiresAt !== "number") {
      return undefined;
    }
    if (decoded.expiresAt <= Math.floor(Date.now() / 1000)) {
      return undefined;
    }
    return decoded.ownerUserId;
  } catch {
    return undefined;
  }
}

export async function updateUserName(input: UpdateUserNameInput) {
  const authenticatedOwnerUserId = typeof input.authenticatedOwnerUserId === "string" ? input.authenticatedOwnerUserId.trim() : "";
  const requestedOwnerUserId = typeof input.ownerUserId === "string" ? input.ownerUserId.trim() : "";
  const ownerUserId = authenticatedOwnerUserId || requestedOwnerUserId;
  const userToken = input.userToken;
  const name = normalizeName(input.name ?? "");

  if (!ownerUserId) {
    throw new Error("ownerUserId is required.");
  }
  if (authenticatedOwnerUserId && requestedOwnerUserId && authenticatedOwnerUserId !== requestedOwnerUserId) {
    throw new Error("Cannot update another user's name from this session.");
  }

  const user = await findStoredUser(ownerUserId);
  if (!authenticatedOwnerUserId) {
    if (typeof userToken !== "string" || !userToken.trim()) {
      throw new Error("userToken is required.");
    }
    if (user.tokenHash !== hashToken(userToken)) {
      throw new Error("userToken is invalid for this ownerUserId.");
    }
  }

  const updated = await prisma.user.update({
    data: { name },
    where: { id: ownerUserId },
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("User name is already taken.");
    }
    throw error;
  });

  logger.info("user.name_updated", { ownerUserId: updated.id, name: updated.name });
  const dailyProfits = await dailyProfitStatsForToday([ownerUserId]);
  const profit = dailyProfits.get(updated.id);
  return publicUser(updated, profit?.amount ?? 0, profit?.settlements ?? 0);
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

async function findSessionUser(cookieHeader: string | null) {
  const ownerUserId = verifyUserSessionCookie(cookieHeader);
  if (!ownerUserId) {
    return undefined;
  }

  return prisma.user.findUnique({ where: { id: ownerUserId } });
}

async function findStoredUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error("ownerUserId does not exist.");
  }

  return user;
}

async function isUserEmailAvailable(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  return !existing;
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

async function weeklyProfitStats(userIds?: string[]) {
  const rows = await prisma.pointsLedger.groupBy({
    _sum: { amount: true },
    by: ["userId"],
    where: {
      dayKey: { in: clubDayKeysForLastDays(7) },
      type: "SETTLE_PROFIT",
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
  });

  return new Map(rows.map((row) => [row.userId, row._sum.amount ?? 0]));
}

type RankedSnapshotUser = {
  id: string;
  pointsBalance: number;
  createdAt: Date;
};

async function ensureLeaderboardSnapshot(dayKey: string, rankedUsers: RankedSnapshotUser[]) {
  const existingCount = await prisma.leaderboardDailySnapshot.count({ where: { dayKey } });
  if (existingCount > 0 || rankedUsers.length === 0) {
    return;
  }

  await prisma.leaderboardDailySnapshot.createMany({
    data: leaderboardSnapshotRows(dayKey, rankedUsers),
    skipDuplicates: true,
  });
}

async function refreshLeaderboardSnapshot(dayKey: string, rankedUsers: RankedSnapshotUser[]) {
  await prisma.$transaction(async (tx) => {
    await tx.leaderboardDailySnapshot.deleteMany({ where: { dayKey } });
    if (rankedUsers.length > 0) {
      await tx.leaderboardDailySnapshot.createMany({
        data: leaderboardSnapshotRows(dayKey, rankedUsers),
      });
    }
  });
}

function leaderboardSnapshotRows(dayKey: string, rankedUsers: RankedSnapshotUser[]) {
  return rankedUsers.map((user, index) => ({
    id: `lbs_${randomUUID().replace(/-/g, "")}`,
    dayKey,
    userId: user.id,
    rank: index + 1,
    pointsBalance: user.pointsBalance,
    userCreatedAt: user.createdAt,
  }));
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

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function issueUserToken() {
  return `utok_${randomBytes(24).toString("base64url")}`;
}

function encryptUserToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptUserToken(encryptedToken?: string | null) {
  if (!encryptedToken) {
    return undefined;
  }
  const [version, ivText, tagText, ciphertextText] = encryptedToken.split(".");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) {
    return undefined;
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", tokenEncryptionKey(), Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return undefined;
  }
}

function tokenEncryptionKey() {
  const secret = process.env.TEXAS_POKER_TOKEN_ENCRYPTION_SECRET ?? process.env.AUTH_SECRET ?? sessionSecret();
  return createHash("sha256").update(`texas-poker-token:${secret}`).digest();
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("base64url");
  return `pbkdf2_sha256$120000$${salt}$${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterationsText, salt, expectedHash] = storedHash.split("$");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2_sha256" || !Number.isInteger(iterations) || !salt || !expectedHash) {
    return false;
  }

  const actual = pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const expected = Buffer.from(expectedHash, "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function normalizePassword(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Password is required.");
  }
  const password = value.trim();
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (password.length > 128) {
    throw new Error("Password must be at most 128 characters.");
  }
  return password;
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Email address is required.");
  }
  const email = value.trim().toLowerCase();
  if (!email) {
    throw new Error("Email address is required.");
  }
  if (email.length > 254) {
    throw new Error("Email address is too long.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email address is invalid.");
  }
  return email;
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function sessionSecret() {
  return process.env.TEXAS_POKER_USER_SESSION_SECRET ?? process.env.AUTH_SECRET ?? "texas-poker-local-session-secret";
}

function serializeCookie(name: string, value: string, maxAgeSeconds: number) {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (process.env.TEXAS_POKER_SECURE_COOKIES === "1") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function parseCookie(cookieHeader: string) {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        if (separator === -1) {
          return [part, ""];
        }
        return [part.slice(0, separator), part.slice(separator + 1)];
      }),
  );
}

function normalizeName(value: string) {
  const name = value.trim().slice(0, 64);

  if (!name) {
    throw new Error("User name is required.");
  }

  return name;
}
