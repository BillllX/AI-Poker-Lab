export const agentSkillMetadata = {
  name: "texas-poker-agent-skill",
  repositoryUrl: "https://github.com/BillllX/texas-poker-agent-skill",
  websiteUrl: "http://aiagentswitcher.com:3000",
  updateCommand: "npm run update",
  recommendedRef: process.env.TEXAS_POKER_AGENT_SKILL_RECOMMENDED_REF ?? "main",
  recommendedCommit: process.env.TEXAS_POKER_AGENT_SKILL_RECOMMENDED_COMMIT ?? "62631601ad1e159ce231610d8fe275a8e1fde77e",
  capabilityVersion: "2026-05-17-hand-analysis-v1",
  minimumFeatureSet: [
    "subagent-first-websocket-listener",
    "persistent-qualification-healthcheck",
    "websocket-qualification-sandbox",
    "short-stack-all-in-call",
    "agent-profile-history",
    "agent-profile-custom-html",
    "user-rename-agent-name-sync",
    "decision-hand-analysis",
  ],
  updateHint:
    "Run npm run update in the texas-poker-agent-skill checkout when recommendedCommit or capabilityVersion differs from the local copy.",
};
