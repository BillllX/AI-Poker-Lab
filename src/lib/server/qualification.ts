import { randomUUID } from "node:crypto";
import { analyzeDecisionHand } from "../poker/handAnalysis";
import type { AgentDecisionRequest, AgentDecisionResponse, PokerAction } from "../poker/types";
import { normalizeAgentId } from "./agentRegistry";
import { validateDecisionResponse } from "./decisionBroker";
import { logger } from "./logger";
import { prisma } from "./prisma";

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
  wsPassed?: boolean;
};

type QualificationToken = {
  agentId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
};

export class QualificationSubmissionError extends Error {
  readonly details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "QualificationSubmissionError";
    this.details = details;
  }
}

const sessionTtlMs = 30 * 60_000;
const tokenTtlMs = 30 * 60_000;
export const qualificationProtocolVersion = "ws-sandbox-v2";

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
  logger.info("qualification.session_created", { agentId, qualificationId, expiresAt: session.expiresAt });

  return {
    agentId,
    qualificationId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    tasks: session.tasks,
    submissionContract: buildSubmissionContract(session.tasks),
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

  if (!session.wsPassed) {
    throw new Error("WebSocket qualification is required before submitting qualification responses.");
  }

  const responses = input.responses;
  const submittedCaseIds = new Set<string>();
  const expectedCaseIds = session.tasks.map((task) => task.qualificationCase.caseId);
  const receivedCaseIds = responses
    .filter((candidate) => isRecord(candidate) && typeof candidate.caseId === "string")
    .map((candidate) => String(candidate.caseId));
  const missingCaseIds = expectedCaseIds.filter((caseId) => !receivedCaseIds.includes(caseId));

  for (const task of session.tasks) {
    const item = responses.find((candidate) => isRecord(candidate) && candidate.caseId === task.qualificationCase.caseId);
    if (!isRecord(item)) {
      throw new QualificationSubmissionError(`Missing qualification response for ${task.qualificationCase.caseId}.`, {
        code: "missing_qualification_response",
        missingCaseIds,
        expectedCaseIds,
        receivedCaseIds,
        repairHint:
          "Build responses by mapping every returned qualification.tasks item to one response. Preserve each task.qualificationCase.caseId exactly. llm_required tasks still need a response; call the host model once or use a legal fallback if the model fails.",
        exampleResponseShape: {
          caseId: task.qualificationCase.caseId,
          response: {
            type: "action_response",
            requestId: task.requestId,
            playerId: task.playerId,
            action: task.qualificationCase.requiredAction ?? { type: task.legalActions[0] },
            reasoning: "中文理由，必须非空。",
          },
        },
      });
    }

    if (submittedCaseIds.has(task.qualificationCase.caseId)) {
      throw new QualificationSubmissionError(`Duplicate qualification response for ${task.qualificationCase.caseId}.`, {
        code: "duplicate_qualification_response",
        duplicateCaseId: task.qualificationCase.caseId,
        expectedCaseIds,
        receivedCaseIds,
        repairHint: "Submit exactly one response for each expected caseId. Do not submit duplicate caseId entries.",
      });
    }
    submittedCaseIds.add(task.qualificationCase.caseId);

    const response = item.response;
    validateQualificationResponse(task, response);
  }

  if (responses.length !== session.tasks.length) {
    throw new QualificationSubmissionError("Qualification submit must include exactly the returned task cases.", {
      code: "qualification_response_count_mismatch",
      expectedCaseIds,
      receivedCaseIds,
      expectedCount: session.tasks.length,
      receivedCount: responses.length,
      repairHint: "Submit exactly one response for every expected caseId and no extra cases.",
    });
  }

  sessions.delete(qualificationId);

  const qualificationToken = issueQualificationToken(agentId);
  logger.info("qualification.passed", { agentId, qualificationId, expiresAt: qualificationToken.expiresAt });

  return qualificationToken;
}

export async function recordPersistentQualification(input: { agentId: string; modelName: string; ownerUserId: string }) {
  const agentId = normalizeAgentId(input.agentId);
  const modelName = input.modelName.trim();
  const ownerUserId = input.ownerUserId.trim();

  if (!modelName) {
    throw new Error("modelName is required to persist qualification.");
  }
  if (!ownerUserId) {
    throw new Error("ownerUserId is required to persist qualification.");
  }

  const ownerAgent = await findPersistentOwnerAgent(ownerUserId, agentId);
  if (ownerAgent) {
    throw new Error(`Each club user can only have one Agent. Reuse existing Agent ${ownerAgent.agentId} instead of registering another Agent.`);
  }

  const result = await prisma.agentQualification.upsert({
    create: {
      id: `agent_qualification_${randomUUID().replace(/-/g, "")}`,
      agentId,
      modelName,
      ownerUserId,
      protocolVersion: qualificationProtocolVersion,
    },
    update: {
      passedAt: new Date(),
      expiresAt: null,
    },
    where: {
      agentId_ownerUserId_modelName_protocolVersion: {
        agentId,
        modelName,
        ownerUserId,
        protocolVersion: qualificationProtocolVersion,
      },
    },
  });
  logger.info("qualification.persisted", { agentId, ownerUserId, modelName, protocolVersion: qualificationProtocolVersion });
  return result;
}

export async function findPersistentOwnerAgent(ownerUserId: string, exceptAgentId?: string) {
  const trimmedOwnerUserId = ownerUserId.trim();
  if (!trimmedOwnerUserId) {
    return null;
  }

  return prisma.agentQualification.findFirst({
    where: {
      ownerUserId: trimmedOwnerUserId,
      ...(exceptAgentId ? { NOT: { agentId: normalizeAgentId(exceptAgentId) } } : {}),
    },
    orderBy: { passedAt: "desc" },
    select: {
      agentId: true,
      ownerUserId: true,
      modelName: true,
      passedAt: true,
      protocolVersion: true,
    },
  });
}

export async function issueQualificationTokenFromPersistentResult(input: { agentId: string; modelName: string; ownerUserId: string }) {
  const agentId = normalizeAgentId(input.agentId);
  const modelName = input.modelName.trim();
  const ownerUserId = input.ownerUserId.trim();

  if (!modelName || !ownerUserId) {
    return undefined;
  }

  const result = await prisma.agentQualification.findFirst({
    where: {
      agentId,
      modelName,
      ownerUserId,
      protocolVersion: qualificationProtocolVersion,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { passedAt: "desc" },
  });

  if (!result) {
    return undefined;
  }

  const qualificationToken = issueQualificationToken(agentId);
  logger.info("qualification.token_issued_from_persistent_result", {
    agentId,
    ownerUserId,
    modelName,
    protocolVersion: qualificationProtocolVersion,
    expiresAt: qualificationToken.expiresAt,
  });
  return { qualification: result, qualificationToken };
}

export function getQualificationSession(rawQualificationId: string) {
  const session = sessions.get(rawQualificationId);
  if (!session) {
    return undefined;
  }

  return session;
}

export function assertQualificationSession(rawAgentId: string, rawQualificationId: string) {
  const agentId = normalizeAgentId(rawAgentId);
  const qualificationId = typeof rawQualificationId === "string" ? rawQualificationId : "";
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

  return session;
}

export function createQualificationWsTask(rawAgentId: string, rawQualificationId: string) {
  const session = assertQualificationSession(rawAgentId, rawQualificationId);

  return createTask({
    agentId: session.agentId,
    qualificationId: session.qualificationId,
    caseId: "ws-decision-case",
    mode: "llm_required",
    description: "WebSocket qualification check. Receive a decision_task, call the host model, and submit action_response on the same WebSocket.",
    legalActions: ["fold", "call", "raise"],
    toCall: 20,
    stack: 900,
  });
}

export function markQualificationWsPassed(rawAgentId: string, rawQualificationId: string) {
  const session = assertQualificationSession(rawAgentId, rawQualificationId);
  session.wsPassed = true;
  logger.info("qualification.ws_passed", { agentId: session.agentId, qualificationId: session.qualificationId });
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
  logger.info("qualification.token_consumed", { agentId });
}

function issueQualificationToken(agentId: string) {
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
  const privateCards = [
    { rank: "A", suit: "s" },
    { rank: "K", suit: "h" },
  ] satisfies AgentDecisionRequest["privateCards"];
  const communityCards = [
    { rank: "A", suit: "d" },
    { rank: "7", suit: "c" },
    { rank: "2", suit: "s" },
  ] satisfies AgentDecisionRequest["publicState"]["communityCards"];

  return {
    type: "decision_request",
    requestId: `${qualificationId}-${caseId}`,
    handId: 0,
    playerId: agentId,
    privateCards,
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
      communityCards,
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
    handAnalysis: analyzeDecisionHand(privateCards, communityCards),
    qualificationCase: {
      caseId,
      mode,
      description,
      requiredAction,
    },
  };
}

function buildSubmissionContract(tasks: QualificationTask[]) {
  return {
    rule: "Map every item in tasks to exactly one responses[] entry. Preserve qualificationCase.caseId exactly. Do not skip llm_required tasks.",
    responseArrayShape: {
      agentId: "<agentId returned by this response>",
      qualificationId: "<qualificationId returned by this response>",
      responses: [
        {
          caseId: "<task.qualificationCase.caseId>",
          response: {
            type: "action_response",
            requestId: "<task.requestId>",
            playerId: "<task.playerId>",
            action: "<model action or qualificationCase.requiredAction>",
            reasoning: "non-empty Chinese reasoning",
          },
        },
      ],
    },
    expectedResponses: tasks.map((task) => ({
      caseId: task.qualificationCase.caseId,
      mode: task.qualificationCase.mode,
      requiredAction: task.qualificationCase.requiredAction ?? null,
      requestId: task.requestId,
      playerId: task.playerId,
      legalActions: task.legalActions,
      instruction:
        task.qualificationCase.mode === "format_only"
          ? "Do not call the model. Use qualificationCase.requiredAction exactly."
          : "Call the host model once using this exact task. If the model fails, still submit a legal fallback action with Chinese reasoning.",
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
