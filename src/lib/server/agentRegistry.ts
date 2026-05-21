export type RegisteredAgent = {
  id: string;
  name: string;
  ownerUserId?: string;
  modelName?: string;
  kind: AgentKind;
  strategy?: VirtualAgentStrategy;
  registeredAt: string;
  lastSeenAt?: string;
  tableId?: string;
  assignmentStatus: AgentAssignmentStatus;
  queueEnteredAt?: string;
};

const pollingReadyWindowMs = 20_000;
type AgentRegistrySubscriber = () => void;
export type AgentAssignmentStatus = "registered" | "queued" | "seated" | "playing" | "disconnected";
export type AgentKind = "external" | "virtual";
export type VirtualAgentStrategy = "random" | "tight" | "aggressive" | "caller";

export type AgentRegistrationInput = {
  id?: string;
  name?: string;
  modelName?: string;
  ownerUserId?: string;
  userToken?: string;
  qualificationToken?: string;
};

const globalForAgents = globalThis as typeof globalThis & {
  __texasPokerAgents?: RegisteredAgent[];
  __texasPokerAgentRegistrySubscribers?: Set<AgentRegistrySubscriber>;
};

const subscribers = (globalForAgents.__texasPokerAgentRegistrySubscribers ??= new Set<AgentRegistrySubscriber>());

if (!globalForAgents.__texasPokerAgents) {
  globalForAgents.__texasPokerAgents = loadAgentsFromEnv();
}

export function listAgents() {
  return globalForAgents.__texasPokerAgents ?? [];
}

export function findOwnerExternalAgent(ownerUserId: string, exceptAgentId?: string) {
  return listAgents().find(
    (agent) =>
      agent.kind === "external" &&
      agent.ownerUserId === ownerUserId &&
      (!exceptAgentId || agent.id !== exceptAgentId),
  );
}

export function listPollingAgents(now = new Date()) {
  return listAgents().filter((agent) => isAgentPolling(agent, now));
}

export function listQueuedAgents(now = new Date()) {
  return listAgents()
    .filter((agent) => agent.kind === "external" && agent.assignmentStatus === "queued" && isAgentPolling(agent, now))
    .sort((left, right) => (left.queueEnteredAt ?? left.registeredAt).localeCompare(right.queueEnteredAt ?? right.registeredAt));
}

export function listTableAgents(tableId: string) {
  return listAgents().filter((agent) => agent.tableId === tableId && (agent.assignmentStatus === "seated" || agent.assignmentStatus === "playing"));
}

export function registerAgent(input: AgentRegistrationInput) {
  const id = normalizeAgentId(input.id || input.name || "");
  const name = normalizeName(input.name || id);
  const agents = listAgents();
  const existingAgent = agents.find((item) => item.id === id);
  const modelName = normalizeModelName(input.modelName ?? existingAgent?.modelName ?? "");
  const agent: RegisteredAgent = {
    id,
    name,
    modelName,
    kind: existingAgent?.kind ?? "external",
    strategy: existingAgent?.strategy,
    ownerUserId: input.ownerUserId ?? existingAgent?.ownerUserId,
    registeredAt: existingAgent?.registeredAt ?? new Date().toISOString(),
    lastSeenAt: existingAgent?.lastSeenAt,
    tableId: existingAgent?.tableId,
    assignmentStatus: existingAgent?.assignmentStatus ?? "registered",
    queueEnteredAt: existingAgent?.queueEnteredAt,
  };

  globalForAgents.__texasPokerAgents = [...agents.filter((item) => item.id !== id), agent];
  notifyAgentRegistrySubscribers();
  return agent;
}

export function syncOwnerAgentNames(ownerUserId: string, ownerName: string) {
  const displayName = normalizeName(ownerName);
  const ownerAgents = listAgents()
    .filter((agent) => agent.kind === "external" && agent.ownerUserId === ownerUserId)
    .sort((left, right) => left.registeredAt.localeCompare(right.registeredAt) || left.id.localeCompare(right.id));
  const nameByAgentId = new Map(ownerAgents.map((agent) => [agent.id, displayName]));

  if (nameByAgentId.size === 0) {
    return [];
  }

  globalForAgents.__texasPokerAgents = listAgents().map((agent) => {
    const name = nameByAgentId.get(agent.id);
    return name ? { ...agent, name } : agent;
  });
  notifyAgentRegistrySubscribers();
  return listAgents().filter((agent) => nameByAgentId.has(agent.id));
}

export function upsertVirtualAgent(input: {
  id: string;
  name: string;
  strategy: VirtualAgentStrategy;
  modelName?: string;
}) {
  const id = normalizeAgentId(input.id);
  const name = normalizeName(input.name);
  const existingAgent = listAgents().find((item) => item.id === id);
  if (existingAgent && existingAgent.kind !== "virtual") {
    return existingAgent;
  }
  const agent: RegisteredAgent = {
    id,
    name,
    modelName: input.modelName ?? `virtual-${input.strategy}`,
    kind: "virtual",
    strategy: input.strategy,
    registeredAt: existingAgent?.registeredAt ?? new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    tableId: existingAgent?.tableId,
    assignmentStatus: existingAgent?.assignmentStatus ?? "registered",
    queueEnteredAt: existingAgent?.queueEnteredAt,
  };

  globalForAgents.__texasPokerAgents = [...listAgents().filter((item) => item.id !== id), agent];
  notifyAgentRegistrySubscribers();
  return agent;
}

export function removeAgent(id: string) {
  const agents = listAgents();
  const before = agents.length;
  globalForAgents.__texasPokerAgents = agents.filter((agent) => agent.id !== id);
  notifyAgentRegistrySubscribers();
  return listAgents().length !== before;
}

export function markAgentSeen(id: string) {
  const now = new Date().toISOString();
  globalForAgents.__texasPokerAgents = listAgents().map((agent) => (agent.id === id ? { ...agent, lastSeenAt: now } : agent));
  notifyAgentRegistrySubscribers();
  return listAgents().find((agent) => agent.id === id);
}

export function queueAgent(id: string) {
  const now = new Date().toISOString();
  let queued: RegisteredAgent | undefined;
  globalForAgents.__texasPokerAgents = listAgents().map((agent) => {
    if (agent.id !== id) {
      return agent;
    }

    if (agent.assignmentStatus === "seated" || agent.assignmentStatus === "playing") {
      queued = agent;
      return agent;
    }

    queued = {
      ...agent,
      assignmentStatus: "queued",
      queueEnteredAt: agent.queueEnteredAt ?? now,
      tableId: undefined,
    };
    return queued;
  });
  notifyAgentRegistrySubscribers();
  return queued;
}

export function assignAgentToTable(id: string, tableId: string, status: Extract<AgentAssignmentStatus, "seated" | "playing"> = "seated") {
  let assigned: RegisteredAgent | undefined;
  globalForAgents.__texasPokerAgents = listAgents().map((agent) => {
    if (agent.id !== id) {
      return agent;
    }

    if (agent.tableId && agent.tableId !== tableId && (agent.assignmentStatus === "seated" || agent.assignmentStatus === "playing")) {
      assigned = agent;
      return agent;
    }

    assigned = {
      ...agent,
      assignmentStatus: status,
      queueEnteredAt: undefined,
      tableId,
    };
    return assigned;
  });
  notifyAgentRegistrySubscribers();
  return assigned;
}

export function releaseAgentFromTable(id: string, status: Extract<AgentAssignmentStatus, "registered" | "disconnected"> = "registered") {
  let released: RegisteredAgent | undefined;
  globalForAgents.__texasPokerAgents = listAgents().map((agent) => {
    if (agent.id !== id) {
      return agent;
    }

    released = {
      ...agent,
      assignmentStatus: status,
      queueEnteredAt: undefined,
      tableId: undefined,
    };
    return released;
  });
  notifyAgentRegistrySubscribers();
  return released;
}

export function releaseTableAgentsToQueue(tableId: string, activeAgentIds: string[]) {
  const activeSet = new Set(activeAgentIds);
  const now = new Date().toISOString();
  globalForAgents.__texasPokerAgents = listAgents().map((agent) => {
    if (agent.tableId !== tableId) {
      return agent;
    }

    if (agent.kind === "virtual") {
      return {
        ...agent,
        assignmentStatus: "registered" as const,
        queueEnteredAt: undefined,
        tableId: undefined,
      };
    }

    if (!activeSet.has(agent.id)) {
      return {
        ...agent,
        assignmentStatus: "disconnected" as const,
        queueEnteredAt: undefined,
        tableId: undefined,
      };
    }

    return {
      ...agent,
      assignmentStatus: "queued" as const,
      queueEnteredAt: now,
      tableId: undefined,
    };
  });
  notifyAgentRegistrySubscribers();
}

export function markAgentDisconnected(id: string) {
  globalForAgents.__texasPokerAgents = listAgents().map((agent) => {
    if (agent.id !== id) {
      return agent;
    }

    return {
      ...agent,
      assignmentStatus: "disconnected" as const,
      queueEnteredAt: undefined,
      tableId: agent.assignmentStatus === "playing" ? agent.tableId : undefined,
    };
  });
  notifyAgentRegistrySubscribers();
}

export function isAgentPolling(agent: RegisteredAgent, now = new Date()) {
  if (agent.kind === "virtual") {
    return true;
  }

  if (!agent.lastSeenAt) {
    return false;
  }

  return now.getTime() - new Date(agent.lastSeenAt).getTime() <= pollingReadyWindowMs;
}

export function clearAgents() {
  globalForAgents.__texasPokerAgents = [];
  notifyAgentRegistrySubscribers();
}

export function subscribeAgentRegistry(subscriber: AgentRegistrySubscriber) {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

function notifyAgentRegistrySubscribers() {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

function loadAgentsFromEnv() {
  const raw = process.env.EXTERNAL_AGENTS_JSON;
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as AgentRegistrationInput[];
    return parsed.map(registerAgentFromEnv);
  } catch {
    return [];
  }
}

function registerAgentFromEnv(input: AgentRegistrationInput): RegisteredAgent {
  const id = normalizeAgentId(input.id || input.name || "");
  const name = normalizeName(input.name || id);
  const modelName = normalizeModelName(input.modelName ?? "");

  return {
    id,
    name,
    modelName,
    kind: "external",
    ownerUserId: input.ownerUserId,
    registeredAt: new Date().toISOString(),
    assignmentStatus: "registered",
  };
}

export function normalizeAgentId(value: string) {
  const id = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  if (!id) {
    throw new Error("Agent id must contain letters or numbers.");
  }

  return id;
}

function normalizeName(value: string) {
  return value.trim().slice(0, 64) || "External Agent";
}

function normalizeModelName(value: string) {
  const modelName = value.trim().slice(0, 96);

  if (!modelName) {
    throw new Error("modelName is required.");
  }

  return modelName;
}
