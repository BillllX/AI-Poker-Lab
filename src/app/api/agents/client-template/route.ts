export const runtime = "nodejs";

const rawClientTemplate = String.raw`#!/usr/bin/env node
"use strict";

/**
 * Texas Poker Club Agent Client Template
 *
 * Usage:
 *   npm install ws
 *   GAME_URL=http://150.158.85.220:3000 \
 *   AGENT_ID=alice-agent \
 *   MODEL_NAME=gpt-4.1 \
 *   AGENT_STYLE="稳健紧凶，重视位置和底池赔率" \
 *   node texas-poker-agent-client.js
 *
 * Preferred onboarding is subagent-first. Use this file as a fallback local
 * process when your host cannot keep a dedicated subagent alive.
 *
 * Optional MiniMax/OpenClaw fallback:
 *   MINIMAX_API_KEY=... MODEL_NAME=MiniMax-M2.7-highspeed node texas-poker-agent-client.js
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const WebSocket = require("ws");

const GAME_URL = process.env.GAME_URL || "http://150.158.85.220:3000";
const AGENT_ID = normalizeAgentId(process.env.AGENT_ID || "example-agent");
const MODEL_NAME = process.env.MODEL_NAME || "replace-with-real-model-name";
const AGENT_STYLE = process.env.AGENT_STYLE || "稳健、理性、只根据当前牌局信息行动";
const MEMORY_PATH = process.env.MEMORY_PATH || path.join(process.cwd(), ".texas-poker-agent-memory.json");
const DECISION_SAFETY_MS = 20_000;
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/anthropic/v1";
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "";
const MINIMAX_MAX_TOKENS = Number(process.env.MINIMAX_MAX_TOKENS || 1800);
const MINIMAX_THINKING_TOKENS = Number(process.env.MINIMAX_THINKING_TOKENS || 1024);

let socket;
let stopping = false;
const inFlightRequestIds = new Set();
const submittedRequestIds = new Set();

main().catch((error) => {
  console.error("[fatal]", error);
  process.exit(1);
});

async function main() {
  if (MODEL_NAME === "replace-with-real-model-name") {
    throw new Error("Set MODEL_NAME to the exact LLM model used for decisions.");
  }

  const owner = await loadOrRegisterUser();
  const healthcheck = await runHealthcheck(owner);
  if (healthcheck.nextAction === "open_websocket" || healthcheck.nextAction === "already_connected") {
    console.log("[healthcheck]", healthcheck.nextAction, "skipping qualification");
  } else {
    const qualificationToken =
      healthcheck.nextAction === "register_agent" && healthcheck.issuedQualificationToken?.token
        ? healthcheck.issuedQualificationToken.token
        : (await runQualification()).qualificationToken;
    await registerAgent(owner, qualificationToken);
  }
  connectWebSocket();
  installShutdownHandlers();
}

async function loadOrRegisterUser() {
  const memory = await readMemory();
  if (memory.ownerUserId && memory.userToken) {
    console.log("[user] reusing saved ownerUserId from memory:", memory.ownerUserId);
    return memory;
  }

  const rl = readline.createInterface({ input, output });
  try {
    const name = (await rl.question("Choose a Texas Poker Club user name: ")).trim();
    const password = (await rl.question("Choose a Texas Poker Club password (at least 8 characters): ")).trim();

    const nameCheck = await getJson(\`\${GAME_URL}/api/users/check-name?name=\${encodeURIComponent(name)}\`);
    if (!nameCheck.available) {
      throw new Error(\`User name is not available: \${name}\`);
    }

    const captcha = await getJson(\`\${GAME_URL}/api/users/captcha\`);
    const captchaAnswer = (await rl.question(\`Captcha: \${captcha.challenge} \`)).trim();

    const payload = await postJson(\`\${GAME_URL}/api/users\`, {
      name,
      password,
      captchaId: captcha.captchaId,
      captchaAnswer,
    });

    const credentials = {
      ownerUserId: payload.user.id,
      userName: payload.user.name,
      userToken: payload.userToken,
    };
    await writeMemory(credentials);
    console.log("[user] saved ownerUserId/userToken to memory:", credentials.ownerUserId);
    return credentials;
  } finally {
    rl.close();
  }
}

async function runQualification() {
  console.log("[qualification] fetching tasks");
  const qualification = await getJson(\`\${GAME_URL}/api/agents/qualification/tasks?agentId=\${encodeURIComponent(AGENT_ID)}\`);
  const responses = [];

  for (const task of qualification.tasks) {
    const decision =
      task.qualificationCase.mode === "format_only"
        ? { action: task.qualificationCase.requiredAction, reasoning: \`格式自检：按要求输出 \${task.qualificationCase.requiredAction.type} 动作。\` }
        : await decideWithLlmOrFallback(task, { isQualification: true });

    responses.push({
      caseId: task.qualificationCase.caseId,
      response: {
        type: "action_response",
        requestId: task.requestId,
        playerId: task.playerId,
        action: decision.action,
        reasoning: decision.reasoning,
      },
    });
  }

  await runQualificationSandbox(qualification);

  const result = await postJson(\`\${GAME_URL}/api/agents/qualification/submit\`, {
    agentId: qualification.agentId,
    qualificationId: qualification.qualificationId,
    responses,
  });
  console.log("[qualification] passed");
  return result;
}

async function runHealthcheck(owner) {
  const healthcheck = await postJson(\`\${GAME_URL}/api/agents/healthcheck\`, {
    agentId: AGENT_ID,
    modelName: MODEL_NAME,
    ownerUserId: owner.ownerUserId,
    userToken: owner.userToken,
  });
  console.log("[healthcheck]", healthcheck.nextAction);
  if (healthcheck.nextAction === "register_agent" && healthcheck.issuedQualificationToken?.token) {
    console.log("[healthcheck] persisted qualification found; reusing issued token");
  }
  if (healthcheck.nextAction === "run_qualification" || healthcheck.nextAction === "register_agent" || healthcheck.nextAction === "open_websocket" || healthcheck.nextAction === "already_connected") {
    return healthcheck;
  }
  throw new Error(\`Healthcheck requires manual action: \${healthcheck.nextAction} \${JSON.stringify(healthcheck.issues || [])}\`);
}

async function runQualificationSandbox(qualification) {
  const wsUrl =
    GAME_URL.replace(/^http/, "ws") +
    \`/api/agents/qualification/ws?agentId=\${encodeURIComponent(qualification.agentId)}&qualificationId=\${encodeURIComponent(qualification.qualificationId)}\`;
  console.log("[qualification:ws] connecting", wsUrl);

  await new Promise((resolve, reject) => {
    const sandbox = new WebSocket(wsUrl);
    const submittedSandboxRequestIds = new Set();
    const timer = setTimeout(() => {
      sandbox.close();
      reject(new Error("WebSocket qualification timed out."));
    }, 35_000);

    sandbox.on("open", () => console.log("[qualification:ws] open"));
    sandbox.on("error", reject);
    sandbox.on("close", (code, reason) => {
      if (code !== 1000) {
        reject(new Error(\`WebSocket qualification closed: \${code} \${reason.toString()}\`));
      }
    });
    sandbox.on("message", (raw) => {
      void (async () => {
        const payload = JSON.parse(raw.toString());
        switch (payload.type) {
          case "ws_welcome":
          case "table_assigned":
          case "heartbeat":
            console.log("[qualification:ws]", payload.type, payload.tableUrl || "");
            return;
          case "action_ack":
            console.log("[qualification:ws] ack", payload.requestId);
            return;
          case "action_error":
            if (payload.recoverable) {
              console.warn("[qualification:ws] recoverable", payload.code || "", payload.error);
              return;
            }
            throw new Error(payload.error || "WebSocket qualification action_error.");
          case "decision_task": {
            const request = payload.task?.request;
            if (!request) {
              throw new Error("WebSocket qualification decision_task is missing task.request.");
            }
            if (submittedSandboxRequestIds.has(request.requestId)) {
              console.log("[qualification:ws] duplicate request ignored", request.requestId);
              return;
            }
            const decision = await decideWithLlmOrFallback(request, { isQualification: true });
            submittedSandboxRequestIds.add(request.requestId);
            sandbox.send(
              JSON.stringify({
                type: "action_response",
                requestId: request.requestId,
                tableId: request.tableId,
                playerId: request.playerId,
                action: decision.action,
                reasoning: decision.reasoning,
              }),
            );
            return;
          }
          case "agent_stop":
            clearTimeout(timer);
            if (!payload.shouldStop || !payload.ok) {
              throw new Error(payload.reason || "WebSocket qualification stopped before passing.");
            }
            console.log("[qualification:ws] passed");
            sandbox.close(1000, "qualification passed");
            resolve(undefined);
            return;
          default:
            console.log("[qualification:ws] ignored", payload.type);
        }
      })().catch((error) => {
        clearTimeout(timer);
        sandbox.close();
        reject(error);
      });
    });
  });
}

async function registerAgent(owner, qualificationToken) {
  console.log("[roster] registering", AGENT_ID);
  await postJson(\`\${GAME_URL}/api/agents/roster\`, {
    id: AGENT_ID,
    modelName: MODEL_NAME,
    ownerUserId: owner.ownerUserId,
    userToken: owner.userToken,
    qualificationToken,
  });
  console.log("[roster] registered");
}

function connectWebSocket() {
  const wsUrl = GAME_URL.replace(/^http/, "ws") + \`/api/agents/ws?agentId=\${encodeURIComponent(AGENT_ID)}\`;
  console.log("[ws] connecting", wsUrl);
  socket = new WebSocket(wsUrl);

  socket.on("open", () => console.log("[ws] open"));
  socket.on("message", (raw) => {
    void handleSocketMessage(JSON.parse(raw.toString())).catch((error) => {
      console.error("[ws] message handling failed", error);
    });
  });
  socket.on("close", (code, reason) => {
    console.log("[ws] closed", code, reason.toString());
    if (!stopping) {
      setTimeout(connectWebSocket, 3_000);
    }
  });
  socket.on("error", (error) => console.error("[ws] error", error.message));
}

async function handleSocketMessage(payload) {
  switch (payload.type) {
    case "ws_welcome":
    case "heartbeat":
    case "queue_status":
    case "table_assigned":
    case "table_settled":
      console.log("[ws]", payload.type, payload.tableUrl || payload.previousTableUrl || payload.tableId || payload.previousTableId || "");
      return;
    case "action_ack":
      console.log("[action] ack", payload.requestId);
      return;
    case "action_error":
      if (payload.code === "stale_request" || payload.recoverable) {
        console.warn("[action] recoverable error", payload.code || "", payload.error);
        return;
      }
      console.warn("[action] error", payload.error);
      return;
    case "agent_stop":
      console.log("[ws] agent_stop", payload.reason || "");
      stopping = true;
      socket?.close();
      return;
    case "decision_task":
      if (payload.task?.request) {
        if (payload.tableUrl) {
          console.log("[table] watch your Agent here:", payload.tableUrl);
        }
        await handleDecisionTask(payload.task);
      }
      return;
    default:
      console.log("[ws] ignored message", payload.type);
  }
}

async function handleDecisionTask(task) {
  const request = task.request;
  if (submittedRequestIds.has(request.requestId) || inFlightRequestIds.has(request.requestId)) {
    console.log("[decision] duplicate request ignored", request.requestId);
    return;
  }

  const msLeft = new Date(task.expiresAt).getTime() - Date.now();
  if (msLeft <= DECISION_SAFETY_MS) {
    return sendAction(request, failureAction(request.legalActions), "剩余时间不足，按规则提交保守动作。");
  }

  inFlightRequestIds.add(request.requestId);
  try {
    const runtimeInstructions = await fetchRuntimeInstructions(request);
    const decision = await withDeadline(
      decideWithLlmOrFallback(request, { runtimeInstructions, isQualification: false }),
      Math.max(1_000, msLeft - DECISION_SAFETY_MS),
    ).catch(() => fallback("模型调用超时。", request.legalActions));

    sendAction(request, decision.action, decision.reasoning);
  } finally {
    inFlightRequestIds.delete(request.requestId);
  }
}

async function decideWithLlmOrFallback(request, context = {}) {
  try {
    const prompt = buildPrompt(request, context);
    const modelDecision = await callYourLlm(prompt, { request, context });
    const decision = normalizeDecision(modelDecision, request.legalActions);
    if (!decision) {
      return fallback("模型输出动作不合法。", request.legalActions);
    }
    return decision;
  } catch (error) {
    return fallback(\`模型调用失败：\${error instanceof Error ? error.message : "unknown"}。\`, request.legalActions);
  }
}

function sendAction(request, action, reasoning) {
  if (submittedRequestIds.has(request.requestId)) {
    console.log("[action] duplicate submit ignored", request.requestId);
    return;
  }

  const response = {
    type: "action_response",
    requestId: request.requestId,
    tableId: request.tableId,
    playerId: request.playerId,
    action,
    reasoning,
  };
  console.log("[action] submit", JSON.stringify(response));
  submittedRequestIds.add(request.requestId);
  socket.send(JSON.stringify(response));
}

async function leaveGame() {
  stopping = true;
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "agent_leave", agentId: AGENT_ID }));
  } else {
    const memory = await readMemory();
    await postJson(\`\${GAME_URL}/api/agents/leave\`, { agentId: AGENT_ID, userToken: memory.userToken });
  }
}

function installShutdownHandlers() {
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      console.log("[shutdown]", signal);
      void leaveGame().finally(() => setTimeout(() => process.exit(0), 500));
    });
  }
}

async function fetchRuntimeInstructions(request) {
  try {
    const params = new URLSearchParams({ agentId: AGENT_ID });
    if (request?.tableId) {
      params.set("tableId", request.tableId);
    }
    if (Number.isFinite(Number(request?.handId))) {
      params.set("handId", String(request.handId));
    }
    return await getJson(\`\${GAME_URL}/api/agents/runtime-instructions?\${params.toString()}\`);
  } catch {
    return { instructions: [] };
  }
}

function buildPrompt(request, context) {
  const decisionInput = {
    privateCards: request.privateCards,
    communityCards: request.publicState.communityCards,
    phase: request.publicState.phase,
    pot: request.publicState.pot,
    currentBet: request.publicState.currentBet,
    toCall: request.toCall,
    minRaise: request.minRaise,
    stack: request.stack,
    handAnalysis: request.handAnalysis,
    legalActions: request.legalActions,
    players: request.publicState.players,
    recentActionHistory: request.actionHistory,
  };

  return \`
You are playing no-limit Texas Hold'em as \${request.playerId}.
Agent style: \${AGENT_STYLE}
Model name: \${MODEL_NAME}

Return exactly one JSON object and nothing else.
No Markdown. No code fences. No comments.
The reasoning field must be concise Chinese.
Use only facts in the request. Do not invent opponent hole cards, prior hands, player tendencies, or unavailable actions.
The request.handAnalysis field is the authoritative server-computed result for your current made hand, draws, board texture, and tactical facts.
You must treat handAnalysis.madeHand as the current made hand, handAnalysis.draws as the current draws, and handAnalysis.boardTexture as the board texture.
privateCards and communityCards are included for context only; do not override or contradict handAnalysis with your own card reading.
If your intuition conflicts with handAnalysis, follow handAnalysis and explain the decision using handAnalysis.

Current legalActions for this exact decision:
\${JSON.stringify(request.legalActions)}

You must choose action.type from legalActions only. Any action type outside legalActions is invalid, even if it appears in the general action schema below.

Required JSON schema:
{"action":{"type":"fold|check|call|bet|raise","amount":number_if_and_only_if_bet_or_raise},"reasoning":"中文简短解释"}

General action shapes:
- fold:  {"type":"fold"}
- check: {"type":"check"}
- call:  {"type":"call"}
- bet:   {"type":"bet","amount": positive_number}
- raise: {"type":"raise","amount": positive_number}

Only use bet if "bet" is present in legalActions. Only use raise if "raise" is present in legalActions.
Never include amount for fold/check/call. In particular, call must be exactly {"type":"call"}, even when toCall is greater than 0.
If legalActions includes "call", {"type":"call"} is legal even when toCall is greater than stack. The game service will commit the remaining stack and mark the player all-in. Do not fold only because stack is smaller than toCall.
For raise, amount is the target total bet for this betting round and should be at least currentBet + minRaise.
minRaise starts at the big blind for each betting round and then tracks the previous full bet or raise increment.
Opponent hole cards are not available. Use only privateCards as your own cards; publicState.players never contains holeCards.

Runtime instructions:
\${JSON.stringify(context.runtimeInstructions?.instructions || [])}

Decision input:
\${JSON.stringify(decisionInput)}
\`;
}

async function callYourLlm(prompt, _context) {
  if (MINIMAX_API_KEY) {
    return callMiniMax(prompt);
  }

  throw new Error("No LLM provider configured. Prefer the subagent-first flow, or set MINIMAX_API_KEY for this fallback client.");
}

async function callMiniMax(prompt) {
  const response = await fetch(\`\${MINIMAX_BASE_URL.replace(/\\/$/, "")}/messages\`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": MINIMAX_API_KEY,
      authorization: \`Bearer \${MINIMAX_API_KEY}\`,
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      max_tokens: MINIMAX_MAX_TOKENS,
      thinking: {
        type: "enabled",
        max_tokens: MINIMAX_THINKING_TOKENS,
      },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(\`MiniMax request failed: \${response.status} \${await response.text()}\`);
  }

  const data = await response.json();
  return parseModelJson(extractModelText(data));
}

function extractModelText(data) {
  const contentBlocks = Array.isArray(data?.content) ? data.content : [];
  const textBlock = contentBlocks.find((block) => block?.type === "text" && typeof block.text === "string" && block.text.trim());
  if (textBlock) {
    return textBlock.text;
  }

  const thinkingText = contentBlocks
    .filter((block) => block?.type === "thinking")
    .map((block) => block.text || block.thinking || "")
    .join("\\n");
  const jsonMatch = thinkingText.match(/\\{[^{}]*"action"[^{}]*\\}/s) || thinkingText.match(/\\{[^{}]*"type"[^{}]*\\}/s);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  throw new Error("Model response did not contain a text block or recoverable JSON in thinking.");
}

function parseModelJson(text) {
  const trimmed = String(text).trim();
  const fence = String.fromCharCode(96).repeat(3);
  const fenced = trimmed.match(new RegExp(\`\${fence}(?:json)?\\\\s*([\\\\s\\\\S]*?)\${fence}\`, "i"));
  const raw = fenced?.[1]?.trim() || trimmed;
  try {
    return JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\\{[\\s\\S]*\\}/);
    if (!jsonMatch) {
      throw new Error("Model response did not contain JSON.");
    }
    return JSON.parse(jsonMatch[0]);
  }
}

function normalizeDecision(modelDecision, legalActions) {
  const actionSource = modelDecision?.action && typeof modelDecision.action === "object" ? modelDecision.action : modelDecision;
  const action = normalizeAction(actionSource, legalActions);
  if (!action) {
    return null;
  }

  const reasoning =
    typeof modelDecision?.reasoning === "string" && modelDecision.reasoning.trim()
      ? modelDecision.reasoning.trim()
      : typeof actionSource?.reasoning === "string" && actionSource.reasoning.trim()
        ? actionSource.reasoning.trim()
        : "模型基于当前牌局状态选择该合法动作。";

  return { action, reasoning };
}

function normalizeAction(action, legalActions) {
  if (!action || !legalActions.includes(action.type)) {
    return null;
  }
  if (action.type === "bet" || action.type === "raise") {
    const amount = Number(action.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    return { type: action.type, amount };
  }
  return { type: action.type };
}

function fallback(reason, legalActions) {
  const action = failureAction(legalActions);
  return {
    action,
    reasoning: legalActions.includes("fold") ? \`\${reason} 按规则直接弃牌。\` : \`\${reason} fold 不可用，按规则过牌。\`,
  };
}

function failureAction(legalActions) {
  return legalActions.includes("fold") ? { type: "fold" } : { type: "check" };
}

async function getJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(\`GET \${url} failed: \${response.status} \${await response.text()}\`);
  }
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(\`POST \${url} failed: \${response.status} \${await response.text()}\`);
  }
  return response.json();
}

async function readMemory() {
  try {
    return JSON.parse(await fs.readFile(MEMORY_PATH, "utf8"));
  } catch {
    return {};
  }
}

async function writeMemory(memory) {
  await fs.writeFile(MEMORY_PATH, JSON.stringify(memory, null, 2));
}

function normalizeAgentId(value) {
  const id = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  if (!id) {
    throw new Error("AGENT_ID must contain lowercase letters or numbers.");
  }
  return id;
}

function withDeadline(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("LLM decision deadline exceeded.")), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
`;

const clientTemplate = rawClientTemplate.replaceAll("\\`", "`").replaceAll("\\${", "${");

export async function GET() {
  return new Response(clientTemplate, {
    headers: {
      "cache-control": "no-store",
      "content-disposition": 'attachment; filename="texas-poker-agent-client.js"',
      "content-type": "text/javascript; charset=utf-8",
    },
  });
}
