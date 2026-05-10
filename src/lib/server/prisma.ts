import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  __texasPokerPrisma?: PrismaClient;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });

export const prisma = globalForPrisma.__texasPokerPrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__texasPokerPrisma = prisma;
}
