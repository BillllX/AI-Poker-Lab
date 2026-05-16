CREATE TABLE "agent_results" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "modelName" TEXT,
    "tableId" TEXT NOT NULL,
    "gameSessionId" TEXT,
    "buyIn" INTEGER NOT NULL,
    "finalStack" INTEGER NOT NULL,
    "profit" INTEGER NOT NULL,
    "handsPlayed" INTEGER NOT NULL,
    "handsWon" INTEGER NOT NULL,
    "settledReason" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_results_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agent_results_ownerUserId_settledAt_idx" ON "agent_results"("ownerUserId", "settledAt");

CREATE INDEX "agent_results_agentId_settledAt_idx" ON "agent_results"("agentId", "settledAt");

CREATE INDEX "agent_results_modelName_settledAt_idx" ON "agent_results"("modelName", "settledAt");

ALTER TABLE "agent_results" ADD CONSTRAINT "agent_results_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
