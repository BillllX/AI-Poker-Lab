import {
  findOwnerExternalAgent,
  listAgents,
  queueAgent,
  syncOwnerAgentNames,
  upsertHostedAgent,
  type RegisteredAgent,
} from "./agentRegistry";
import { hostedAgentModel } from "./hostedAgentDecision";
import { getTableManager } from "./simulator";
import { findPersistentOwnerAgent, hostedAgentProtocolVersion, recordHostedAgentQualification } from "./qualification";
import { logger } from "./logger";

export type HostedAgentStatus = {
  available: boolean;
  agent: RegisteredAgent | null;
  blockedByAgent: {
    agentId: string;
    modelName?: string | null;
    protocolVersion?: string;
  } | null;
  modelName: string;
};

export async function getHostedAgentStatus(ownerUserId: string): Promise<HostedAgentStatus> {
  const liveOwnerAgent = findOwnerExternalAgent(ownerUserId);
  const persistentOwnerAgent = await findPersistentOwnerAgent(ownerUserId);
  const hostedLiveAgent = liveOwnerAgent?.kind === "hosted" ? liveOwnerAgent : null;
  const blockedByAgent =
    liveOwnerAgent && liveOwnerAgent.kind !== "hosted"
      ? { agentId: liveOwnerAgent.id, modelName: liveOwnerAgent.modelName, protocolVersion: "live-external" }
      : persistentOwnerAgent && persistentOwnerAgent.protocolVersion !== hostedAgentProtocolVersion
        ? {
            agentId: persistentOwnerAgent.agentId,
            modelName: persistentOwnerAgent.modelName,
            protocolVersion: persistentOwnerAgent.protocolVersion,
          }
        : null;

  return {
    available: !blockedByAgent,
    agent: hostedLiveAgent,
    blockedByAgent,
    modelName: hostedAgentModel(),
  };
}

export async function createOrJoinHostedAgent(input: { ownerUserId: string; ownerName: string; origin: string; targetTableId?: string }) {
  const ownerUserId = input.ownerUserId.trim();
  const ownerName = input.ownerName.trim();
  const modelName = hostedAgentModel();
  const liveOwnerAgent = findOwnerExternalAgent(ownerUserId);

  if (liveOwnerAgent && liveOwnerAgent.kind !== "hosted") {
    throw new Error(`This user already has Agent ${liveOwnerAgent.id}. Leave or reuse it before creating a hosted Agent.`);
  }

  const persistentOwnerAgent = await findPersistentOwnerAgent(ownerUserId);
  if (persistentOwnerAgent && persistentOwnerAgent.protocolVersion !== hostedAgentProtocolVersion) {
    throw new Error(`This user already has Agent ${persistentOwnerAgent.agentId}. Reuse it before creating a hosted Agent.`);
  }

  const agentId = liveOwnerAgent?.id ?? persistentOwnerAgent?.agentId ?? hostedAgentId(ownerUserId);
  await recordHostedAgentQualification({ agentId, modelName, ownerUserId });
  const hostedAgent = upsertHostedAgent({
    id: agentId,
    name: ownerName,
    ownerUserId,
    modelName,
  });
  const [namedAgent] = syncOwnerAgentNames(ownerUserId, ownerName).filter((agent) => agent.id === hostedAgent.id);
  const tableManager = getTableManager(input.origin);
  if (input.targetTableId) {
    const joinedAgent = await tableManager.joinAgentToTable(hostedAgent.id, input.targetTableId);
    logger.info("hosted_agent.joined", {
      agentId: hostedAgent.id,
      ownerUserId,
      modelName,
      assignmentStatus: listAgents().find((agent) => agent.id === hostedAgent.id)?.assignmentStatus,
      targetTableId: input.targetTableId,
    });
    return joinedAgent;
  }

  const queuedAgent = queueAgent(hostedAgent.id) ?? namedAgent ?? hostedAgent;
  await tableManager.allocateQueuedAgents();

  logger.info("hosted_agent.joined", {
    agentId: hostedAgent.id,
    ownerUserId,
    modelName,
    assignmentStatus: listAgents().find((agent) => agent.id === hostedAgent.id)?.assignmentStatus,
  });

  return listAgents().find((agent) => agent.id === hostedAgent.id) ?? queuedAgent;
}

export async function leaveHostedAgent(input: { ownerUserId: string; origin: string }) {
  const hostedAgent = findOwnerExternalAgent(input.ownerUserId);
  if (!hostedAgent || hostedAgent.kind !== "hosted") {
    return { removed: false, agent: null };
  }

  const result = await getTableManager(input.origin).leaveAgent(hostedAgent.id);
  logger.info("hosted_agent.left", { agentId: hostedAgent.id, ownerUserId: input.ownerUserId, removed: result.removed });
  return { ...result, agent: hostedAgent };
}

export function hostedAgentTableLink(agent: Pick<RegisteredAgent, "tableId"> | null | undefined) {
  if (!agent?.tableId) {
    return { tableId: null, tableUrl: null };
  }

  return {
    tableId: agent.tableId,
    tableUrl: `/tables/${encodeURIComponent(agent.tableId)}`,
  };
}

function hostedAgentId(ownerUserId: string) {
  return `hosted-${ownerUserId}`;
}
