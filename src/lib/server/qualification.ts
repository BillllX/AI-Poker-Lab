import type { AgentDecisionRequest, AgentDecisionResponse, PokerAction } from "../poker/types";
import { normalizeAgentId } from "./agentRegistry";
import { validateDecisionResponse } from "./decisionBroker";

type QualificationMode = "llm_required" | "format_only";

type QualificationCase = {
  caseId: string;
  mode: QualificationMode;
  description: string;
  requiredAction?: PokerAction;
};

export type QualificationTask = AgentDecisionRequest & {
  qualificationCase: QualificationCase;
};

type QualificationSession = {
  agentId: string;
  qualificationId: string;
  tasks: QualificationTask[];
  createdAt: string;
  expiresAt: string;
};

type QualificationToken = {
  agentId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
};

const sessionTtlMs = 10 * 60_000;
const tokenTtlMs = 30 * 60_000;

const globalForQualification = globalThis as typeof globalThis & {
  __texasPokerQualificationSessions?: Map<string, QualificationSession>;
  __texasPokerQualificationTokens?: Map<string, QualificationToken>;
};

const sessions = (globalForQualification.__texasPokerQualificationSessions ??= new Map<string, QualificationSession>());
const tokens = (globalForQualification.__texasPokerQualificationTokens ??= new Map<string, QualificationToken>());

export function createQualificationSession(rawAgentId: string) {
  const agentId = normalizeAgentId(rawAgentId);
  const now = new Date();
  const qualificationId = `qualification-${agentId}-${now.getTime()}-${Math.random().toString(16).slice(2)}`;
  const session: QualificationSession = {
    agentId,
    qualificationId,
    tasks: buildQualificationTasks(agentId, qualificationId),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + sessionTtlMs).toISOString(),
  };

  sessions.set(qualificationId, session);

  return {
    agentId,
    qualificationId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    tasks: session.tasks,
  };
}

export function submitQualification(input: unknown) {
  if (!isRecord(input)) {
    throw new Error("Qualification submit body must be a JSON object.");
  }

  const agentId = normalizeAgentId(String(input.agentId ?? ""));
  const qualificationId = typeof input.qualificationId === "string" ? input.qualificationId : "";
  const session = sessions.get(qualificationId);

  if (!session) {
    throw new Error("Qualification session was not found or has expired.");
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    sessions.delete(qualificationId);
    throw new Error("Qualification session has expired. Request new tasks.");
  }

  if (session.agentId !== agentId) {
    throw new Error("Qualification agentId does not match the task session.");
  }

  if (!Array.isArray(input.responses)) {
    throw new Error("Qualification responses must be an array.");
  }

  const responses = input.responses;
  const submittedCaseIds = new Set<string>();

  for (const task of session.tasks) {
    const item = responses.find((candidate) => isRecord(candidate) && candidate.caseId === task.qualificationCase.caseId);
    if (!isRecord(item)) {
      throw new Error(`Missing qualification response for ${task.qualificationCase.caseId}.`);
    }

    if (submittedCaseIds.has(task.qualificationCase.caseId)) {
      throw new Error(`Duplicate qualification response for ${task.qualificationCase.caseId}.`);
    }
    submittedCaseIds.add(task.qualificationCase.caseId);

    const response = item.response;
    validateQualificationResponse(task, response);
  }

  if (responses.length !== session.tasks.length) {
    throw new Error("Qualification submit must include exactly the returned task cases.");
  }

  sessions.delete(qualificationId);

  const now = new Date();
  const token = `qtoken-${agentId}-${now.getTime()}-${Math.random().toString(16).slice(2)}`;
  const qualificationToken = {
    agentId,
    token,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + tokenTtlMs).toISOString(),
  };
  tokens.set(token, qualificationToken);

  return qualificationToken;
}

export function consumeQualificationToken(rawAgentId: string, token: unknown) {
  const agentId = normalizeAgentId(rawAgentId);

  if (typeof token !== "string" || !token.trim()) {
    throw new Error("qualificationToken is required. Run qualification before registering.");
  }

  const stored = tokens.get(token);
  if (!stored) {
    throw new Error("qualificationToken is invalid or has already been used.");
  }

  if (stored.agentId !== agentId) {
    throw new Error("qualificationToken does not match this Agent ID.");
  }

  if (new Date(stored.expiresAt).getTime() <= Date.now()) {
    tokens.delete(token);
    throw new Error("qualificationToken has expired. Run qualification again.");
  }

  tokens.delete(token);
}

function validateQualificationResponse(task: QualificationTask, response: unknown) {
  validateDecisionResponse(response as AgentDecisionResponse, task.legalActions);

  if (!isRecord(response)) {
    throw new Error(`Response for ${task.qualificationCase.caseId} must be a JSON object.`);
  }

  if (response.requestId !== task.requestId) {
    throw new Error(`Response for ${task.qualificationCase.caseId} has wrong requestId.`);
  }

  if (response.playerId !== task.playerId) {
    throw new Error(`Response for ${task.qualificationCase.caseId} has wrong playerId.`);
  }

  const action = isRecord(response.action) ? response.action : undefined;
  if (!action) {
    throw new Error(`Response for ${task.qualificationCase.caseId} action must be an object.`);
  }

  const requiredAction = task.qualificationCase.requiredAction;
  if (!requiredAction) {
    return;
  }

  if (action.type !== requiredAction.type) {
    throw new Error(`Response for ${task.qualificationCase.caseId} must use action ${requiredAction.type}.`);
  }

  if ((requiredAction.type === "bet" || requiredAction.type === "raise") && action.amount !== requiredAction.amount) {
    throw new Error(`Response for ${task.qualificationCase.caseId} must use amount ${requiredAction.amount}.`);
  }
}

function buildQualificationTasks(agentId: string, qualificationId: string): QualificationTask[] {
  return [
    createTask({
      agentId,
      qualificationId,
      caseId: "llm-decision-case",
      mode: "llm_required",
      description:
        "Call the same LLM you will use in real games. The model may choose any legal action, but the response format must be valid.",
      legalActions: ["fold", "call", "raise"],
      toCall: 20,
      stack: 940,
    }),
    createTask({
      agentId,
      qualificationId,
      caseId: "fold-format-case",
      mode: "format_only",
      description: "Format-only check. No LLM call is required; return the required fold action shape exactly.",
      legalActions: ["fold"],
      requiredAction: { type: "fold" },
      toCall: 25,
      stack: 900,
    }),
    createTask({
      agentId,
      qualificationId,
      caseId: "check-format-case",
      mode: "format_only",
      description: "Format-only check. No LLM call is required; return the required check action shape exactly.",
      legalActions: ["check"],
      requiredAction: { type: "check" },
      toCall: 0,
      stack: 900,
    }),
    createTask({
      agentId,
      qualificationId,
      caseId: "call-format-case",
      mode: "format_only",
      description: "Format-only check. No LLM call is required; return the required call action shape exactly.",
      legalActions: ["call"],
      requiredAction: { type: "call" },
      toCall: 15,
      stack: 900,
    }),
    createTask({
      agentId,
      qualificationId,
      caseId: "bet-format-case",
      mode: "format_only",
      description: "Format-only check. No LLM call is required; return the required bet action shape exactly.",
      legalActions: ["bet"],
      requiredAction: { type: "bet", amount: 30 },
      toCall: 0,
      stack: 900,
    }),
    createTask({
      agentId,
      qualificationId,
      caseId: "raise-format-case",
      mode: "format_only",
      description: "Format-only check. No LLM call is required; return the required raise action shape exactly.",
      legalActions: ["raise"],
      requiredAction: { type: "raise", amount: 80 },
      toCall: 20,
      stack: 900,
    }),
  ];
}

function createTask({
  agentId,
  caseId,
  description,
  legalActions,
  mode,
  qualificationId,
  requiredAction,
  stack,
  toCall,
}: {
  agentId: string;
  caseId: string;
  description: string;
  legalActions: QualificationTask["legalActions"];
  mode: QualificationMode;
  qualificationId: string;
  requiredAction?: PokerAction;
  stack: number;
  toCall: number;
}): QualificationTask {
  return {
    type: "decision_request",
    requestId: `${qualificationId}-${caseId}`,
    handId: 0,
    playerId: agentId,
    privateCards: [
      { rank: "A", suit: "s" },
      { rank: "K", suit: "h" },
    ],
    publicState: {
      handId: 0,
      running: false,
      phase: "flop",
      dealerIndex: 0,
      smallBlind: 5,
      bigBlind: 10,
      pot: 95,
      currentBet: toCall > 0 ? 20 : 0,
      minRaise: 10,
      currentPlayerId: agentId,
      communityCards: [
        { rank: "A", suit: "d" },
        { rank: "7", suit: "c" },
        { rank: "2", suit: "s" },
      ],
      players: [
        {
          id: agentId,
          name: "Qualification Agent",
          kind: "external",
          stack,
          currentBet: 0,
          totalCommitted: 0,
          status: "active",
        },
        {
          id: "opponent-agent",
          name: "Opponent Agent",
          kind: "external",
          stack: 880,
          currentBet: toCall,
          totalCommitted: toCall,
          status: "active",
        },
      ],
    },
    actionHistory: [
      {
        id: `${caseId}-history-1`,
        handId: 0,
        round: "preflop",
        playerId: "opponent-agent",
        playerName: "Opponent Agent",
        action: "raise",
        amount: 40,
        targetBet: 50,
        potAfter: 75,
        createdAt: "2026-05-01T00:00:00.000Z",
      },
      {
        id: `${caseId}-history-2`,
        handId: 0,
        round: "flop",
        playerId: "opponent-agent",
        playerName: "Opponent Agent",
        action: toCall > 0 ? "bet" : "check",
        amount: toCall > 0 ? toCall : undefined,
        targetBet: toCall > 0 ? toCall : undefined,
        potAfter: 95,
        createdAt: "2026-05-01T00:00:01.000Z",
      },
    ],
    legalActions,
    toCall,
    minRaise: 10,
    stack,
    qualificationCase: {
      caseId,
      mode,
      description,
      requiredAction,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
