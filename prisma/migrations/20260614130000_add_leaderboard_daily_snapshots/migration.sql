CREATE TABLE "leaderboard_daily_snapshots" (
  "id" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rank" INTEGER NOT NULL,
  "pointsBalance" INTEGER NOT NULL,
  "userCreatedAt" TIMESTAMP(3) NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "leaderboard_daily_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "leaderboard_daily_snapshots_dayKey_userId_key" ON "leaderboard_daily_snapshots"("dayKey", "userId");
CREATE INDEX "leaderboard_daily_snapshots_dayKey_rank_idx" ON "leaderboard_daily_snapshots"("dayKey", "rank");
CREATE INDEX "leaderboard_daily_snapshots_userId_dayKey_idx" ON "leaderboard_daily_snapshots"("userId", "dayKey");

ALTER TABLE "leaderboard_daily_snapshots"
  ADD CONSTRAINT "leaderboard_daily_snapshots_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
