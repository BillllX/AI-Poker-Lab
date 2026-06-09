import type { AgentDecisionRequest, AgentDecisionResponse, LegalAction, PokerAction } from "../poker/types";
import { decideForAgent } from "../agents/strategies";
import { getAgentPrivateSettings } from "./agentPrivateSettings";
import type { RegisteredAgent } from "./agentRegistry";
import { validateDecisionResponse } from "./decisionBroker";
import { logger } from "./logger";
import { getRuntimeInstructions } from "./runtimeInstructions";

type MiniMaxContentBlock = {
  type?: unknown;
  text?: unknown;
  thinking?: unknown;
};

type MiniMaxResponse = {
  content?: MiniMaxContentBlock[];
};

const defaultMiniMaxBaseUrl = "https://api.minimaxi.com/anthropic/v1";
const defaultHostedModel = "MiniMax M2.7 Highspeed";
const defaultDecisionTimeoutMs = 45_000;
const defaultMaxTokens = 1024;
const defaultThinkingTokens = 0;

export async function decideForHostedAgent(agent: RegisteredAgent & { kind: "hosted" | "resident"; ownerUserId: string }, request: AgentDecisionRequest) {
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
    return fallbackHostedDecision(agent, request, userFacingHostedErrorReason(error));
  }
}

async function buildHostedAgentPrompt(agent: RegisteredAgent, request: AgentDecisionRequest) {
  const settings = agent.ownerUserId ? await getAgentPrivateSettings(agent.ownerUserId) : undefined;
  const runtimeInstructions = getRuntimeInstructions(agent.id, { tableId: request.tableId, handId: request.handId });
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
    runtimeInstructions: runtimeInstructions.instructions,
  };

  return `你是 Texas Poker Club 的服务器托管 AI 牌手。请根据用户风格 Prompt 和当前牌桌信息选择一个合法动作。

用户风格 Prompt:
${playerPrompt}

现场 Coaching / Runtime Instructions:
${JSON.stringify(runtimeInstructions.instructions)}

输出要求:
- 只输出一个 JSON 对象，不要 Markdown，不要代码块，不要解释性前后缀。
- 不要输出思考过程、牌局分析正文、英文说明或自然语言段落；所有分析只能浓缩进 reasoning。
- 最终回复必须以 { 开始，以 } 结束。
- action.type 必须来自 legalActions。
- 如果 legalActions 包含 bet 但不包含 raise，只能用 bet，不能用 raise。
- 如果 legalActions 包含 raise 但不包含 bet，只能用 raise，不能用 bet。
- fold/check/call 不能包含 amount。
- bet/raise 必须包含正数 amount；raise 的 amount 是本轮目标总下注额，通常至少为 currentBet + minRaise。
- reasoning 必须是简短中文解释，最多 40 个中文字符。

牌力判断硬约束:
- decisionInput.handAnalysis 是当前手牌+公牌组合的权威牌力计算结果。
- 当前成牌必须以 handAnalysis.madeHand 为准；听牌必须以 handAnalysis.draws 为准；牌面结构必须以 handAnalysis.boardTexture 为准。
- privateCards 和 publicState.communityCards 只用于理解上下文、位置、下注和风险，不允许重新计算出与 handAnalysis 冲突的牌力结论。
- 如果你自己的直觉牌力判断与 handAnalysis 不一致，必须服从 handAnalysis，并在 reasoning 中按 handAnalysis 描述当前牌力。

合法输出示例，二选一参考格式：
{"action":{"type":"check"},"reasoning":"当前无需跟注，选择过牌控制底池。"}
{"action":{"type":"raise","amount":80},"reasoning":"牌力和位置支持加注施压。"}

注意：上面只是格式示例。最终 action.type 必须从本次 decisionInput.legalActions 中选择；只有 bet/raise 可以包含 amount。

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
    const body: Record<string, unknown> = {
      model: hostedAgentModel(),
      max_tokens: maxTokens(),
      messages: [{ role: "user", content: prompt }],
    };
    const thinkingBudget = thinkingTokens();
    if (thinkingBudget > 0) {
      body.thinking = {
        type: "enabled",
        max_tokens: thinkingBudget,
      };
    }

    const response = await fetch(`${miniMaxBaseUrl().replace(/\/$/, "")}/messages`, {
      body: JSON.stringify(body),
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
    const modelText = extractModelText(data);
    try {
      return parseModelJson(modelText);
    } catch (error) {
      logger.warn("hosted_agent.model_json_parse_failed", {
        error,
        outputPreview: previewText(modelText),
      });
      throw error;
    }
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeHostedDecision(modelDecision: unknown, request: AgentDecisionRequest): AgentDecisionResponse & { requestId?: string } {
  const source = isRecord(modelDecision) && isRecord(modelDecision.action) ? modelDecision.action : modelDecision;
  const action = normalizeAction(source, request.legalActions);
  if (!action) {
    throw new Error(
      `Hosted model returned an invalid action: ${previewText(JSON.stringify({ action: source, legalActions: request.legalActions }))}`,
    );
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

function userFacingHostedErrorReason(error: unknown) {
  if (!(error instanceof Error)) {
    return "模型决策失败";
  }

  if (
    error.message.includes("Model response did not contain") ||
    error.message.includes("Hosted model returned an invalid action") ||
    error.message.includes("JSON")
  ) {
    return "模型输出未能匹配当前合法动作";
  }

  return "模型决策失败";
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
  if (!isRecord(value)) {
    return null;
  }

  const actionType = normalizeActionType(value.type, legalActions);
  if (!actionType) {
    return null;
  }

  if (actionType === "bet" || actionType === "raise") {
    const amount = Number(value.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    return { type: actionType, amount };
  }

  return { type: actionType };
}

function normalizeActionType(type: unknown, legalActions: LegalAction[]): LegalAction | null {
  if (legalActions.includes(type as LegalAction)) {
    return type as LegalAction;
  }

  // Models often use poker table language loosely: an opening bet may be called a raise, and vice versa.
  if (type === "raise" && legalActions.includes("bet")) {
    return "bet";
  }
  if (type === "bet" && legalActions.includes("raise")) {
    return "raise";
  }
  if (type === "call" && legalActions.includes("check")) {
    return "check";
  }

  return null;
}

function extractModelText(data: MiniMaxResponse) {
  const contentBlocks = Array.isArray(data.content) ? data.content : [];
  const strings = collectStrings(contentBlocks).filter((text) => text.trim());
  const preferred = strings.find((text) => /\{[\s\S]*"action"[\s\S]*\}/.test(text)) ?? strings[0];
  if (preferred) {
    return preferred;
  }

  throw new Error("Model response did not contain JSON text.");
}

export function parseModelJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() || trimmed;

  for (const candidate of jsonCandidates(raw)) {
    for (const normalized of normalizeJsonCandidates(candidate)) {
      try {
        return JSON.parse(normalized);
      } catch {
        // Try the next candidate/normalization before surfacing the parse failure.
      }
    }
  }

  const partialJsonDecision = parsePartialJsonAction(raw);
  if (partialJsonDecision) {
    return partialJsonDecision;
  }

  const naturalDecision = parseNaturalLanguageDecision(raw);
  if (naturalDecision) {
    return naturalDecision;
  }

  throw new Error("Model response did not contain valid JSON.");
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

function collectStrings(value: unknown, depth = 0): string[] {
  if (depth > 8 || value === null || typeof value === "undefined") {
    return [];
  }

  if (typeof value === "string") {
    return [value];
  }

  if (typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStrings(item, depth + 1));
  }

  return Object.entries(value)
    .filter(([key]) => key !== "id" && key !== "model" && key !== "type" && key !== "role")
    .flatMap(([, item]) => collectStrings(item, depth + 1));
}

function jsonCandidates(raw: string) {
  const candidates: string[] = [];
  const balanced = firstBalancedJsonObject(raw);
  if (balanced) {
    candidates.push(balanced);
  }

  if (!candidates.includes(raw)) {
    candidates.push(raw);
  }

  return candidates;
}

function normalizeJsonCandidates(candidate: string) {
  const normalized = candidate.trim();
  const repaired = repairCommonJsonMistakes(normalized);
  return repaired === normalized ? [normalized] : [normalized, repaired];
}

function firstBalancedJsonObject(text: string) {
  const start = text.indexOf("{");
  if (start < 0) {
    return undefined;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return undefined;
}

function repairCommonJsonMistakes(text: string) {
  return text
    .replace(/([}\]"0-9])\s+("reasoning"\s*:)/g, "$1,$2")
    .replace(/([}\]"0-9])\s+("action"\s*:)/g, "$1,$2");
}

function parsePartialJsonAction(text: string) {
  const actionMatch = text.match(/"action"\s*:\s*\{[\s\S]*?"type"\s*:\s*"(fold|check|call|bet|raise)"/i);
  const type = actionMatch?.[1]?.toLowerCase();
  if (!type) {
    return undefined;
  }

  const reasoning = previewText(text) || "模型返回了不完整 JSON，服务端从 action 字段提取结构化决策。";
  if (type === "bet" || type === "raise") {
    const amount = Number(text.match(/"amount"\s*:\s*(\d+(?:\.\d+)?)/i)?.[1]);
    return Number.isFinite(amount) && amount > 0 ? { action: { type, amount }, reasoning } : undefined;
  }

  return { action: { type }, reasoning };
}

function parseNaturalLanguageDecision(text: string) {
  const normalized = text.toLowerCase();
  const amount = Number(text.match(/(?:amount|加注到|下注到|下注|加注|raise|bet)[^\d]*(\d+(?:\.\d+)?)/i)?.[1]);
  const reasoning = previewText(text) || "模型以自然语言给出动作，服务端提取为结构化决策。";

  if (/\braise\b|加注|raise\s+to/i.test(text)) {
    return Number.isFinite(amount) && amount > 0 ? { action: { type: "raise", amount }, reasoning } : undefined;
  }
  if (/\bbet\b|下注/i.test(text)) {
    return Number.isFinite(amount) && amount > 0 ? { action: { type: "bet", amount }, reasoning } : undefined;
  }
  if (/\bfold\b|弃牌/i.test(text)) {
    return { action: { type: "fold" }, reasoning };
  }
  if (/\bcall\b|跟注/i.test(text)) {
    return { action: { type: "call" }, reasoning };
  }
  if (/\bcheck\b|过牌/i.test(normalized)) {
    return { action: { type: "check" }, reasoning };
  }

  return undefined;
}

function previewText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}
