CREATE TABLE "agent_profile_contents" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_profile_contents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_profile_contents_agentId_ownerUserId_key" ON "agent_profile_contents"("agentId", "ownerUserId");

CREATE INDEX "agent_profile_contents_ownerUserId_idx" ON "agent_profile_contents"("ownerUserId");

ALTER TABLE "agent_profile_contents" ADD CONSTRAINT "agent_profile_contents_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
