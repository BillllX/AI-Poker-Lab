type AgentProfilePayload = NonNullable<Awaited<ReturnType<typeof import("./agentProfile").resolveAgentProfileById>>>;

export type AgentProfileOgFacts = {
  handsWon: number;
  modelName?: string;
  name: string;
  online: boolean;
  profit: number;
  sessions: number;
  status: string;
};

export function agentProfileOgFacts(profile: AgentProfilePayload): AgentProfileOgFacts {
  return {
    name: profile.identity?.ownerName ?? profile.agent.name,
    modelName: profile.identity?.modelName ?? profile.agent.modelName,
    status: profile.live.online ? profile.live.assignmentStatus : "offline",
    profit: profile.historySummary.profit,
    handsWon: profile.historySummary.handsWon,
    sessions: profile.historySummary.sessions,
    online: profile.live.online,
  };
}

export function formatOgProfit(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toLocaleString("en-US")} pts`;
}
