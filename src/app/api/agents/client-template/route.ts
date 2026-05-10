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
 *   AGENT_NAME="Alice Agent" \
 *   MODEL_NAME=gpt-4.1 \
 *   AGENT_STYLE="稳健紧凶，重视位置和底池赔率" \
 *   node texas-poker-agent-client.js
 *
 * You must implement callYourLlm(prompt, context) near the bottom.
 */

const fs = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");
const WebSocket = require("ws");

const GAME_URL = process.env.GAME_URL || "http://150.158.85.220:3000";
const AGENT_ID = normalizeAgentId(process.env.AGENT_ID || "example-agent");
const AGENT_NAME = process.env.AGENT_NAME || AGENT_ID;
const MODEL_NAME = process.env.MODEL_NAME || "replace-with-real-model-name";
const AGENT_STYLE = process.env.AGENT_STYLE || "稳健、理性、只根据当前牌局信息行动";
const MEMORY_PATH = process.env.MEMORY_PATH || path.join(process.cwd(), ".texas-poker-agent-memory.json");
const DECISION_SAFETY_MS = 20_000;

let socket;
let stopping = false;

main().catch((error) => {
  console.error("[fatal]", error);
  process.exit(1);
});

async function main() {
  if (MODEL_NAME === "replace-with-real-model-name") {
    throw new Error("Set MODEL_NAME to the exact LLM model used for decisions.");
  }

  const owner = await loadOrRegisterUser();
  const qualification = await runQualification();
  await registerAgent(owner, qualification.qualificationToken);
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
    const email = (await rl.question("Enter Email for daily Token rewards: ")).trim();

    const nameCheck = await getJson(\`\${GAME_URL}/api/users/check-name?name=\${encodeURIComponent(name)}\`);
    if (!nameCheck.available) {
      throw new Error(\`User name is not available: \${name}\`);
    }

    const captcha = await getJson(\`\${GAME_URL}/api/users/captcha\`);
    const captchaAnswer = (await rl.question(\`Captcha: \${captcha.challenge} \`)).trim();

    const payload = await postJson(\`\${GAME_URL}/api/users\`, {
      name,
      email,
      captchaId: captcha.captchaId,
      captchaAnswer,
    });

    const credentials = {
      ownerUserId: payload.user.id,
      userName: payload.user.name,
      userToken: payload.userToken,
      email,
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
    const action =
      task.qualificationCase.mode === "format_only"
        ? task.qualificationCase.requiredAction
        : await decideWithLlmOrFallback(task, { isQualification: true });

    responses.push({
      caseId: task.qualificationCase.caseId,
      response: {
        type: "action_response",
        requestId: task.requestId,
        playerId: task.playerId,
        action,
        reasoning:
          task.qualificationCase.mode === "format_only"
            ? \`格式自检：按要求输出 \${action.type} 动作。\`
            : "资格自检：模型基于当前测试牌局输出合法动作。",
      },
    });
  }

  const result = await postJson(\`\${GAME_URL}/api/agents/qualification/submit\`, {
    agentId: qualification.agentId,
    qualificationId: qualification.qualificationId,
    responses,
  });
  console.log("[qualification] passed");
  return result;
}

async function registerAgent(owner, qualificationToken) {
  console.log("[roster] registering", AGENT_ID);
  await postJson(\`\${GAME_URL}/api/agents/roster\`, {
    id: AGENT_ID,
    name: AGENT_NAME,
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
  const msLeft = new Date(task.expiresAt).getTime() - Date.now();
  if (msLeft <= DECISION_SAFETY_MS) {
    return sendAction(request, failureAction(request.legalActions), "剩余时间不足，按规则提交保守动作。");
  }

  const runtimeInstructions = await fetchRuntimeInstructions();
  const action = await withDeadline(
    decideWithLlmOrFallback(request, { runtimeInstructions, isQualification: false }),
    Math.max(1_000, msLeft - DECISION_SAFETY_MS),
  ).catch(() => failureAction(request.legalActions));

  const reasoning = action.__fallbackReasoning || "模型基于当前牌局状态选择该合法动作。";
  delete action.__fallbackReasoning;
  sendAction(request, action, reasoning);
}

async function decideWithLlmOrFallback(request, context = {}) {
  try {
    const prompt = buildPrompt(request, context);
    const modelDecision = await callYourLlm(prompt, { request, context });
    const action = normalizeAction(modelDecision?.action, request.legalActions);
    if (!action) {
      return fallback("模型输出动作不合法。", request.legalActions);
    }
    return action;
  } catch (error) {
    return fallback(\`模型调用失败：\${error instanceof Error ? error.message : "unknown"}。\`, request.legalActions);
  }
}

function sendAction(request, action, reasoning) {
  const response = {
    type: "action_response",
    requestId: request.requestId,
    tableId: request.tableId,
    playerId: request.playerId,
    action,
    reasoning,
  };
  console.log("[action] submit", JSON.stringify(response));
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

async function fetchRuntimeInstructions() {
  try {
    return await getJson(\`\${GAME_URL}/api/agents/runtime-instructions?agentId=\${encodeURIComponent(AGENT_ID)}\`);
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
Opponent hole cards are not available. Use only privateCards as your own cards; publicState.players never contains holeCards.

Runtime instructions:
\${JSON.stringify(context.runtimeInstructions?.instructions || [])}

Decision input:
\${JSON.stringify(decisionInput)}
\`;
}

async function callYourLlm(_prompt, _context) {
  throw new Error("Implement callYourLlm(prompt, context) with your actual LLM provider.");
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
  action.__fallbackReasoning = legalActions.includes("fold")
    ? \`\${reason} 按规则直接弃牌。\`
    : \`\${reason} fold 不可用，按规则过牌。\`;
  return action;
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
