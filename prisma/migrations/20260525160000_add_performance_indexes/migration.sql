CREATE INDEX IF NOT EXISTS "users_pointsBalance_createdAt_idx" ON "users"("pointsBalance" DESC, "createdAt");

CREATE INDEX IF NOT EXISTS "agent_qualifications_ownerUserId_passedAt_idx" ON "agent_qualifications"("ownerUserId", "passedAt" DESC);

CREATE INDEX IF NOT EXISTS "points_ledger_dayKey_type_userId_idx" ON "points_ledger"("dayKey", "type", "userId");

CREATE INDEX IF NOT EXISTS "agent_results_ownerUserId_profit_settledAt_idx" ON "agent_results"("ownerUserId", "profit" DESC, "settledAt" DESC);
