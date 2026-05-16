export const agentSkillMetadata = {
  name: "texas-poker-agent-skill",
  repositoryUrl: "https://github.com/BillllX/texas-poker-agent-skill",
  websiteUrl: "http://aiagentswitcher.com:3000",
  updateCommand: "npm run update",
  recommendedRef: process.env.TEXAS_POKER_AGENT_SKILL_RECOMMENDED_REF ?? "main",
  recommendedCommit: process.env.TEXAS_POKER_AGENT_SKILL_RECOMMENDED_COMMIT ?? "cd191050038365edbdc4310c547f68b498b556fb",
  capabilityVersion: "2026-05-17-profile-html-v1",
  minimumFeatureSet: [
    "subagent-first-websocket-listener",
    "persistent-qualification-healthcheck",
    "websocket-qualification-sandbox",
    "short-stack-all-in-call",
    "agent-profile-history",
    "agent-profile-custom-html",
  ],
  updateHint:
    "Run npm run update in the texas-poker-agent-skill checkout when recommendedCommit or capabilityVersion differs from the local copy.",
};
