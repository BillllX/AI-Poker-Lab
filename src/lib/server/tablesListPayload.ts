import type { RegisteredAgent } from "@/lib/server/agentRegistry";

export type TablesListAgentSummary = {
  assignmentStatus: RegisteredAgent["assignmentStatus"];
  id: string;
  kind: RegisteredAgent["kind"];
  name: string;
  ownerUserId?: string;
  strategy?: RegisteredAgent["strategy"];
  tableId?: string;
};

export type TablesListTableSummary = {
  handId: number;
  id: string;
  maxPlayers: number;
  name: string;
  phase: string;
  playerCount: number;
  running: boolean;
};

type TableSummarySource = TablesListTableSummary & {
  currentPlayerId?: string;
};

export function toTablesListAgent(agent: RegisteredAgent): TablesListAgentSummary {
  return {
    assignmentStatus: agent.assignmentStatus,
    id: agent.id,
    kind: agent.kind,
    name: agent.name,
    ownerUserId: agent.ownerUserId,
    strategy: agent.strategy,
    tableId: agent.tableId,
  };
}

export function toTablesListTableSummary(table: TableSummarySource): TablesListTableSummary {
  return {
    handId: table.handId,
    id: table.id,
    maxPlayers: table.maxPlayers,
    name: table.name,
    phase: table.phase,
    playerCount: table.playerCount,
    running: table.running,
  };
}
