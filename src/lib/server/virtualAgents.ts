import { decideForAgent } from "../agents/strategies";
import type { AgentDecisionRequest, AgentDecisionResponse } from "../poker/types";
import {
  assignAgentToTable,
  listAgents,
  upsertVirtualAgent,
  type RegisteredAgent,
  type VirtualAgentStrategy,
} from "./agentRegistry";

type VirtualAgentTemplate = {
  id: string;
  name: string;
  strategy: VirtualAgentStrategy;
};

const defaultVirtualAgents: VirtualAgentTemplate[] = [
  { id: "bot-tight-01", name: "Tight Bot 01", strategy: "tight" },
  { id: "bot-aggressive-01", name: "Aggressive Bot 01", strategy: "aggressive" },
  { id: "bot-caller-01", name: "Caller Bot 01", strategy: "caller" },
  { id: "bot-random-01", name: "Random Bot 01", strategy: "random" },
  { id: "bot-tight-02", name: "Tight Bot 02", strategy: "tight" },
  { id: "bot-aggressive-02", name: "Aggressive Bot 02", strategy: "aggressive" },
];

export function isVirtualAgentsEnabled() {
  return process.env.VIRTUAL_AGENTS_ENABLED !== "false";
}

export function isReservedVirtualAgentId(agentId: string) {
  return defaultVirtualAgents.some((agent) => agent.id === agentId);
}

export function ensureVirtualAgentPool() {
  if (!isVirtualAgentsEnabled()) {
    return [];
  }

  return defaultVirtualAgents.map((agent) =>
    upsertVirtualAgent({
      ...agent,
      modelName: `virtual-${agent.strategy}`,
    }),
  );
}

export function listAvailableVirtualAgents() {
  const virtualIds = new Set(defaultVirtualAgents.map((agent) => agent.id));
  ensureVirtualAgentPool();
  return listAgents()
    .filter((agent) => agent.kind === "virtual" && virtualIds.has(agent.id) && !agent.tableId)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function assignVirtualAgentsToTable(tableId: string, seatsToFill: number) {
  if (seatsToFill <= 0 || !isVirtualAgentsEnabled()) {
    return [];
  }

  const assigned: RegisteredAgent[] = [];
  for (const agent of listAvailableVirtualAgents().slice(0, seatsToFill)) {
    const seated = assignAgentToTable(agent.id, tableId);
    if (seated) {
      assigned.push(seated);
    }
  }

  return assigned;
}

export function decideForVirtualAgent(agent: RegisteredAgent, request: AgentDecisionRequest): AgentDecisionResponse {
  return decideForAgent(agent.id, request, agent.strategy);
}

export function isVirtualAgent(agent: RegisteredAgent | undefined): agent is RegisteredAgent & { kind: "virtual" } {
  return agent?.kind === "virtual";
}
