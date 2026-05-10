import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

type StoredUser = {
  id: string;
  name: string;
  pointsBalance: number;
  frozenPoints?: number;
  createdAt: string;
  tokenHash?: string;
  dailyProfitByDate?: Record<string, number>;
};

type UserStore = {
  users?: StoredUser[];
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });
const storePath = path.join(process.cwd(), "data", "users.json");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  if (!existsSync(storePath)) {
    console.log(`No users.json found at ${storePath}; nothing to migrate.`);
    return;
  }

  const parsed = JSON.parse(readFileSync(storePath, "utf8")) as UserStore;
  const users = Array.isArray(parsed.users) ? parsed.users : [];

  for (const user of users) {
    await prisma.user.upsert({
      create: {
        id: user.id,
        name: user.name,
        email: null,
        pointsBalance: user.pointsBalance,
        frozenPoints: user.frozenPoints ?? 0,
        tokenHash: user.tokenHash ?? createLegacyTokenHash(user.id),
        createdAt: new Date(user.createdAt),
      },
      update: {
        frozenPoints: user.frozenPoints ?? 0,
        pointsBalance: user.pointsBalance,
        tokenHash: user.tokenHash ?? createLegacyTokenHash(user.id),
      },
      where: { id: user.id },
    });

    for (const [dayKey, amount] of Object.entries(user.dailyProfitByDate ?? {})) {
      if (!Number.isFinite(amount) || amount === 0) {
        continue;
      }

      await prisma.pointsLedger.upsert({
        create: {
          id: `ledger_migration_${user.id}_${dayKey}`,
          userId: user.id,
          type: "SETTLE_PROFIT",
          amount,
          balanceAfter: user.pointsBalance,
          frozenAfter: user.frozenPoints ?? 0,
          dayKey,
          note: "Migrated daily profit from data/users.json.",
        },
        update: {},
        where: { id: `ledger_migration_${user.id}_${dayKey}` },
      });
    }
  }

  console.log(`Migrated ${users.length} users from data/users.json.`);
}

function createLegacyTokenHash(userId: string) {
  return createHash("sha256").update(`legacy-token-unavailable:${userId}`).digest("hex");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
