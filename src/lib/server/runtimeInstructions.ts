import { normalizeAgentId } from "./agentRegistry";

export type RuntimeInstructionNote = {
  id: string;
  agentId: string;
  message: string;
  source: "operator" | "system";
  sourceType?: "coaching" | "operator";
  displayMessage?: string;
  createdAt: string;
  tableId?: string;
  appliesFromHandId?: number;
};

export type RuntimeInstructions = {
  agentId: string;
  version: number;
  updatedAt: string;
  instructions: string[];
  notes: RuntimeInstructionNote[];
};

const defaultInstructions = [
  "每次正式游戏决策都必须调用真实 LLM；qualification 的 format-only 逻辑不能用于正式牌局。",
  "每次处理 task.request 前，先读取最新 runtime instructions，并把这些提示放入 LLM prompt。",
  "actionHistory 只包含公开行动路线，不包含任何玩家手牌或模型 reasoning；不要猜测对手手牌。",
  "LLM 输出必须是单个 JSON 对象；reasoning 必须是中文。",
  "fold/check/call 不允许带 amount；bet/raise 必须带正数 JSON number amount。",
  "如果 legalActions 包含 call，即使 toCall 大于当前 stack，也可以选择 {\"type\":\"call\"}；服务端会自动投入剩余全部筹码并标记 all-in。不要因为筹码不足以完整跟注就认为只能 fold。",
  "raise.amount 表示本轮目标总下注额，不是额外加注量。",
  "选择 raise 时，amount 至少应为 currentBet + minRaise；minRaise 会跟随上一手完整下注/加注增量变化。",
];
const maxNotesPerAgent = 50;
const maxTotalNotes = 1_000;

const globalForRuntimeInstructions = globalThis as typeof globalThis & {
  __texasPokerRuntimeInstructionNotes?: RuntimeInstructionNote[];
  __texasPokerRuntimeInstructionVersion?: number;
};

const notes = (globalForRuntimeInstructions.__texasPokerRuntimeInstructionNotes ??= []);
globalForRuntimeInstructions.__texasPokerRuntimeInstructionVersion ??= 1;

export function getRuntimeInstructions(rawAgentId: string, context?: { tableId?: string; handId?: number }): RuntimeInstructions {
  const agentId = normalizeAgentId(rawAgentId);
  const agentNotes = notes
    .filter((note) => note.agentId === agentId)
    .filter((note) => isInstructionVisible(note, context))
    .slice(-20);

  return {
    agentId,
    version: globalForRuntimeInstructions.__texasPokerRuntimeInstructionVersion ?? 1,
    updatedAt: agentNotes.at(-1)?.createdAt ?? new Date().toISOString(),
    instructions: [...defaultInstructions, ...agentNotes.map((note) => note.message)],
    notes: agentNotes,
  };
}

export function addRuntimeInstruction(
  rawAgentId: string,
  message: string,
  source: RuntimeInstructionNote["source"] = "operator",
  options: { tableId?: string; appliesFromHandId?: number; sourceType?: RuntimeInstructionNote["sourceType"]; displayMessage?: string } = {},
) {
  const agentId = normalizeAgentId(rawAgentId);
  const normalizedMessage = normalizeMessage(message);
  const note: RuntimeInstructionNote = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    agentId,
    message: normalizedMessage,
    source,
    sourceType: options.sourceType,
    displayMessage: options.displayMessage?.trim() || undefined,
    createdAt: new Date().toISOString(),
    tableId: options.tableId,
    appliesFromHandId: options.appliesFromHandId,
  };

  notes.push(note);
  trimInstructionNotes(agentId);
  globalForRuntimeInstructions.__texasPokerRuntimeInstructionVersion =
    (globalForRuntimeInstructions.__texasPokerRuntimeInstructionVersion ?? 1) + 1;

  return note;
}

function trimInstructionNotes(agentId: string) {
  let agentSeen = 0;
  for (let index = notes.length - 1; index >= 0; index -= 1) {
    if (notes[index].agentId !== agentId) {
      continue;
    }

    agentSeen += 1;
    if (agentSeen > maxNotesPerAgent) {
      notes.splice(index, 1);
    }
  }

  if (notes.length > maxTotalNotes) {
    notes.splice(0, notes.length - maxTotalNotes);
  }
}

export function addRuntimeFeedback(rawAgentId: string, message: string) {
  return addRuntimeInstruction(rawAgentId, message, "system");
}

function normalizeMessage(message: string) {
  const normalized = message.trim().replace(/\s+/g, " ").slice(0, 500);

  if (!normalized) {
    throw new Error("Runtime instruction message is required.");
  }

  return normalized;
}

function isInstructionVisible(note: RuntimeInstructionNote, context?: { tableId?: string; handId?: number }) {
  if (!note.appliesFromHandId) {
    return true;
  }
  if (note.tableId && context?.tableId && note.tableId !== context.tableId) {
    return false;
  }
  if (typeof context?.handId !== "number") {
    return false;
  }
  return context.handId >= note.appliesFromHandId;
}
