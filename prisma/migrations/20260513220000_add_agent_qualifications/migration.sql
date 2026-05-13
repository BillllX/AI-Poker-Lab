CREATE TABLE "agent_qualifications" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "modelName" TEXT NOT NULL,
  "protocolVersion" TEXT NOT NULL,
  "passedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "agent_qualifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_qualifications_agentId_ownerUserId_modelName_protocolVersion_key"
  ON "agent_qualifications"("agentId", "ownerUserId", "modelName", "protocolVersion");

CREATE INDEX "agent_qualifications_ownerUserId_idx" ON "agent_qualifications"("ownerUserId");

ALTER TABLE "agent_qualifications"
  ADD CONSTRAINT "agent_qualifications_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
