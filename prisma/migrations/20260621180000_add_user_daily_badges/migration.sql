CREATE TABLE "user_daily_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_badges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_daily_badges_userId_dayKey_badge_key" ON "user_daily_badges"("userId", "dayKey", "badge");
CREATE INDEX "user_daily_badges_userId_dayKey_idx" ON "user_daily_badges"("userId", "dayKey");

ALTER TABLE "user_daily_badges" ADD CONSTRAINT "user_daily_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
