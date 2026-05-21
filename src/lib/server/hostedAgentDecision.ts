import type { AgentDecisionRequest, AgentDecisionResponse, LegalAction, PokerAction } from "../poker/types";
import { decideForAgent } from "../agents/strategies";
import { getAgentPrivateSettings } from "./agentPrivateSettings";
import type { RegisteredAgent } from "./agentRegistry";
import { validateDecisionResponse } from "./decisionBroker";
import { logger } from "./logger";

type MiniMaxContentBlock = {
  type?: unknown;
  text?: unknown;
  thinking?: unknown;
};

type MiniMaxResponse = {
  content?: MiniMaxContentBlock[];
};

const defaultMiniMaxBaseUrl = "https://api.minimaxi.com/anthropic/v1";
const defaultHostedModel = "MiniMax-M1";
const defaultDecisionTimeoutMs = 45_000;
const defaultMaxTokens = 1024;
const defaultThinkingTokens = 512;

export async function decideForHostedAgent(agent: RegisteredAgent & { kind: "hosted"; ownerUserId: string }, request: AgentDecisionRequest) {
  const prompt = await buildHostedAgentPrompt(agent, request);

  try {
    const modelDecision = await callMiniMax(prompt);
    const response = normalizeHostedDecision(modelDecision, request);
    validateDecisionResponse(response, request.legalActions);
    logger.info("hosted_agent.decision_completed", {
      agentId: agent.id,
      tableId: request.tableId,
      handId: request.handId,
      actionType: response.action.type,
      amount: "amount" in response.action ? response.action.amount : undefined,
    });
    return response;
  } catch (error) {
    logger.warn("hosted_agent.decision_failed", {
      agentId: agent.id,
      tableId: request.tableId,
      handId: request.handId,
      error,
    });
    return fallbackHostedDecision(agent, request, error instanceof Error ? error.message : "模型决策失败");
  }
}

async function buildHostedAgentPrompt(agent: RegisteredAgent, request: AgentDecisionRequest) {
  const settings = agent.ownerUserId ? await getAgentPrivateSettings(agent.ownerUserId) : undefined;
  const playerPrompt = settings?.agentPrompt?.trim() || "你是一名稳健、纪律性强的德州扑克 AI 牌手。优先做合法、可解释、风险可控的决策。";
  const decisionInput = {
    requestId: request.requestId,
    tableId: request.tableId,
    handId: request.handId,
    playerId: request.playerId,
    agentName: agent.name,
    modelName: agent.modelName,
    privateCards: request.privateCards,
    publicState: request.publicState,
    actionHistory: request.actionHistory.slice(-20),
    legalActions: request.legalActions,
    toCall: request.toCall,
    minRaise: request.minRaise,
    stack: request.stack,
    handAnalysis: request.handAnalysis,
  };

  return `你是 Texas Poker Club 的服务器托管 AI 牌手。请根据用户风格 Prompt 和当前牌桌信息选择一个合法动作。

用户风格 Prompt:
${playerPrompt}

输出要求:
- 只输出 JSON，不要 Markdown，不要代码块。
- action.type 必须来自 legalActions。
- fold/check/call 不能包含 amount。
- bet/raise 必须包含正数 amount；raise 的 amount 是本轮目标总下注额，通常至少为 currentBet + minRaise。
- reasoning 必须是简短中文解释。

JSON schema:
{"action":{"type":"fold|check|call|bet|raise","amount":number_if_and_only_if_bet_or_raise},"reasoning":"中文简短解释"}

决策输入:
${JSON.stringify(decisionInput)}
`;
}

async function callMiniMax(prompt: string) {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), hostedDecisionTimeoutMs());
  try {
    const response = await fetch(`${miniMaxBaseUrl().replace(/\/$/, "")}/messages`, {
      body: JSON.stringify({
        model: hostedAgentModel(),
        max_tokens: maxTokens(),
        thinking: {
          type: "enabled",
          max_tokens: thinkingTokens(),
        },
        messages: [{ role: "user", content: prompt }],
      }),
      headers: {
        "anthropic-version": "2023-06-01",
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`MiniMax request failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as MiniMaxResponse;
    return parseModelJson(extractModelText(data));
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeHostedDecision(modelDecision: unknown, request: AgentDecisionRequest): AgentDecisionResponse & { requestId?: string } {
  const source = isRecord(modelDecision) && isRecord(modelDecision.action) ? modelDecision.action : modelDecision;
  const action = normalizeAction(source, request.legalActions);
  if (!action) {
    throw new Error("Hosted model returned an invalid action.");
  }

  const reasoning =
    isRecord(modelDecision) && typeof modelDecision.reasoning === "string" && modelDecision.reasoning.trim()
      ? modelDecision.reasoning.trim()
      : isRecord(source) && typeof source.reasoning === "string" && source.reasoning.trim()
        ? source.reasoning.trim()
        : "模型基于当前牌局状态选择该合法动作。";

  return {
    type: "action_response",
    requestId: request.requestId,
    tableId: request.tableId,
    playerId: request.playerId,
    action,
    reasoning,
  };
}

function fallbackHostedDecision(agent: RegisteredAgent, request: AgentDecisionRequest, reason: string): AgentDecisionResponse {
  const strategyResponse = decideForAgent(agent.id, request, "tight");
  const action = normalizeAction(strategyResponse.action, request.legalActions) ?? safeFallbackAction(request.legalActions);
  return {
    type: "action_response",
    requestId: request.requestId,
    tableId: request.tableId,
    playerId: request.playerId,
    action,
    reasoning: `${reason}，托管服务使用保守兜底策略选择 ${action.type}。`,
  };
}

function safeFallbackAction(legalActions: LegalAction[]): PokerAction {
  if (legalActions.includes("check")) {
    return { type: "check" };
  }
  if (legalActions.includes("call")) {
    return { type: "call" };
  }
  return { type: "fold" };
}

function normalizeAction(value: unknown, legalActions: LegalAction[]): PokerAction | null {
  if (!isRecord(value) || !legalActions.includes(value.type as LegalAction)) {
    return null;
  }

  if (value.type === "bet" || value.type === "raise") {
    const amount = Number(value.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    return { type: value.type, amount };
  }

  return { type: value.type as "call" | "check" | "fold" };
}

function extractModelText(data: MiniMaxResponse) {
  const contentBlocks = Array.isArray(data.content) ? data.content : [];
  const textBlock = contentBlocks.find((block) => block.type === "text" && typeof block.text === "string" && block.text.trim());
  if (textBlock && typeof textBlock.text === "string") {
    return textBlock.text;
  }

  const thinkingText = contentBlocks
    .filter((block) => block.type === "thinking")
    .map((block) => (typeof block.text === "string" ? block.text : typeof block.thinking === "string" ? block.thinking : ""))
    .join("\n");
  const jsonMatch = thinkingText.match(/\{[\s\S]*"action"[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  throw new Error("Model response did not contain JSON text.");
}

function parseModelJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() || trimmed;
  try {
    return JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Model response did not contain JSON.");
    }
    return JSON.parse(jsonMatch[0]);
  }
}

function miniMaxBaseUrl() {
  return process.env.MINIMAX_BASE_URL || defaultMiniMaxBaseUrl;
}

export function hostedAgentModel() {
  return process.env.HOSTED_AGENT_MODEL || process.env.MODEL_NAME || defaultHostedModel;
}

function hostedDecisionTimeoutMs() {
  return positiveIntegerEnv("HOSTED_AGENT_DECISION_TIMEOUT_MS", defaultDecisionTimeoutMs);
}

function maxTokens() {
  return positiveIntegerEnv("HOSTED_AGENT_MAX_TOKENS", defaultMaxTokens);
}

function thinkingTokens() {
  return positiveIntegerEnv("HOSTED_AGENT_THINKING_TOKENS", defaultThinkingTokens);
}

function positiveIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
