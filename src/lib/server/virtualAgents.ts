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
  { id: "bot-phil-hellmuth", name: "Phil Hellmuth", strategy: "tight" },
  { id: "bot-stephen-chidwick", name: "Stephen Chidwick", strategy: "tight" },
  { id: "bot-alan-keating", name: "Alan Keating", strategy: "aggressive" },
  { id: "bot-tom-dwan", name: "Tom Dwan", strategy: "aggressive" },
  { id: "bot-daniel-negreanu", name: "Daniel Negreanu", strategy: "caller" },
  { id: "bot-bryn-kenney", name: "Bryn Kenney", strategy: "random" },
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
