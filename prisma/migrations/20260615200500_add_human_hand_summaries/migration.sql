CREATE TABLE "human_hand_summaries" (
  "id" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "tableName" TEXT,
  "handId" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dealerIndex" INTEGER NOT NULL,
  "smallBlind" INTEGER NOT NULL,
  "bigBlind" INTEGER NOT NULL,
  "communityCards" JSONB NOT NULL,
  "actions" JSONB NOT NULL,
  "logs" JSONB NOT NULL,
  "players" JSONB NOT NULL,
  "winners" JSONB NOT NULL,
  "totalAwarded" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "human_hand_summaries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "human_hand_summaries_tableId_handId_key" ON "human_hand_summaries"("tableId", "handId");
CREATE INDEX "human_hand_summaries_tableId_completedAt_idx" ON "human_hand_summaries"("tableId", "completedAt" DESC);
