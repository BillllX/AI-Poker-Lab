ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "encryptedUserToken" TEXT;

CREATE TABLE IF NOT EXISTS "agent_private_settings" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "agentPrompt" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_private_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_private_settings_ownerUserId_key"
  ON "agent_private_settings"("ownerUserId");

ALTER TABLE "agent_private_settings"
  ADD CONSTRAINT "agent_private_settings_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "users"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
