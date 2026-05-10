import type { AgentDecisionRequest, AgentDecisionResponse, LegalAction } from "../poker/types";

type PendingDecision = {
  request: AgentDecisionRequest & { requestId: string };
  createdAt: string;
  expiresAt: string;
  resolve: (response: AgentDecisionResponse) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
type PublicPendingDecision = {
  request: AgentDecisionRequest & { requestId: string };
  createdAt: string;
  expiresAt: string;
};
type DecisionSubscriber = (decision: PublicPendingDecision | null) => void;

const globalForDecisions = globalThis as typeof globalThis & {
  __texasPokerPendingDecisions?: Map<string, PendingDecision>;
  __texasPokerDecisionSubscribers?: Map<string, Set<DecisionSubscriber>>;
};

const pending = (globalForDecisions.__texasPokerPendingDecisions ??= new Map<string, PendingDecision>());
const subscribers = (globalForDecisions.__texasPokerDecisionSubscribers ??= new Map<string, Set<DecisionSubscriber>>());
const timeoutMs = 180_000;

export function enqueueDecision(request: AgentDecisionRequest) {
  const requestId = `${request.tableId ?? "table"}-${request.handId}-${request.playerId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + timeoutMs);

  return new Promise<AgentDecisionResponse>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      notifyAgent(request.playerId);
      reject(new Error(`Agent ${request.playerId} did not submit an action before timeout.`));
    }, timeoutMs);

    pending.set(requestId, {
      request: { ...request, requestId },
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      resolve,
      reject,
      timer,
    });
    notifyAgent(request.playerId);
  });
}

export function getPendingDecision(agentId: string, tableId?: string) {
  const now = Date.now();
  const decision = [...pending.values()]
    .filter(
      (item) =>
        item.request.playerId === agentId &&
        (!tableId || item.request.tableId === tableId) &&
        new Date(item.expiresAt).getTime() > now,
    )
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .at(0);

  if (!decision) {
    return undefined;
  }

  return publicDecision(decision);
}

export function subscribePendingDecision(agentId: string, subscriber: DecisionSubscriber) {
  const agentSubscribers = subscribers.get(agentId) ?? new Set<DecisionSubscriber>();
  agentSubscribers.add(subscriber);
  subscribers.set(agentId, agentSubscribers);
  subscriber(getPendingDecision(agentId) ?? null);

  return () => {
    agentSubscribers.delete(subscriber);
    if (agentSubscribers.size === 0) {
      subscribers.delete(agentId);
    }
  };
}

function publicDecision(decision: PendingDecision): PublicPendingDecision {
  return {
    request: decision.request,
    createdAt: decision.createdAt,
    expiresAt: decision.expiresAt,
  };
}

export function submitDecision(response: AgentDecisionResponse & { requestId?: string }) {
  if (!isRecord(response) || typeof response.requestId !== "string" || !response.requestId.trim()) {
    throw new Error("requestId is required.");
  }

  const decision = pending.get(response.requestId);
  if (!decision) {
    throw new Error("Decision request was not found or has expired.");
  }

  if (decision.request.playerId !== response.playerId) {
    throw new Error("Decision response playerId does not match the pending request.");
  }

  if (response.tableId && decision.request.tableId && response.tableId !== decision.request.tableId) {
    throw new Error("Decision response tableId does not match the pending request.");
  }

  validateDecisionResponse(response, decision.request.legalActions);

  clearTimeout(decision.timer);
  pending.delete(response.requestId);
  decision.resolve(response);
  notifyAgent(decision.request.playerId);
}

export function listPendingDecisions() {
  return [...pending.values()].map((decision) => ({
    requestId: decision.request.requestId,
    tableId: decision.request.tableId,
    playerId: decision.request.playerId,
    handId: decision.request.handId,
    createdAt: decision.createdAt,
    expiresAt: decision.expiresAt,
  }));
}

export function clearPendingDecisions(reason = "Decision queue was cleared.", tableId?: string, playerId?: string) {
  for (const [requestId, decision] of pending) {
    if (tableId && decision.request.tableId !== tableId) {
      continue;
    }
    if (playerId && decision.request.playerId !== playerId) {
      continue;
    }
    clearTimeout(decision.timer);
    decision.reject(new Error(reason));
    pending.delete(requestId);
    notifyAgent(decision.request.playerId);
  }
}

function notifyAgent(agentId: string) {
  const decision = getPendingDecision(agentId) ?? null;
  for (const subscriber of subscribers.get(agentId) ?? []) {
    subscriber(decision);
  }
}

export function validateDecisionResponse(response: AgentDecisionResponse, legalActions: LegalAction[]) {
  if (!isRecord(response)) {
    throw new Error("Decision response must be a JSON object.");
  }

  if (response.type !== "action_response") {
    throw new Error('Decision response type must be "action_response".');
  }

  if (typeof response.playerId !== "string" || !response.playerId.trim()) {
    throw new Error("Decision response playerId must be a non-empty string.");
  }

  if (!isRecord(response.action)) {
    throw new Error("Decision response action must be an object.");
  }

  const action = response.action;
  if (!isLegalActionType(action.type)) {
    throw new Error("Decision response action.type is invalid.");
  }

  if (!legalActions.includes(action.type)) {
    throw new Error(`Action ${action.type} is not legal for this decision.`);
  }

  if (typeof response.reasoning !== "string" || !response.reasoning.trim()) {
    throw new Error("Decision response reasoning must be a non-empty Chinese string.");
  }

  if (action.type === "bet" || action.type === "raise") {
    if (typeof action.amount !== "number" || !Number.isFinite(action.amount) || action.amount <= 0) {
      throw new Error(`Action ${action.type} requires a positive numeric amount.`);
    }
    return;
  }

  if ("amount" in action) {
    throw new Error(`Action ${action.type} must not include amount. Use exactly {"type":"${action.type}"} for fold/check/call; only bet and raise may include amount.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLegalActionType(value: unknown): value is LegalAction {
  return value === "fold" || value === "check" || value === "call" || value === "bet" || value === "raise";
}
