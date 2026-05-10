CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "pointsBalance" INTEGER NOT NULL DEFAULT 10000,
  "frozenPoints" INTEGER NOT NULL DEFAULT 0,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "points_ledger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "frozenAfter" INTEGER NOT NULL,
  "gameSessionId" TEXT,
  "agentId" TEXT,
  "note" TEXT,
  "dayKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "points_ledger_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_name_key" ON "users"("name");
CREATE INDEX "points_ledger_userId_dayKey_idx" ON "points_ledger"("userId", "dayKey");
CREATE INDEX "points_ledger_dayKey_idx" ON "points_ledger"("dayKey");

ALTER TABLE "points_ledger"
  ADD CONSTRAINT "points_ledger_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
