import { normalizeAgentId } from "./agentRegistry";

export type RuntimeInstructionNote = {
  id: string;
  agentId: string;
  message: string;
  source: "operator" | "system";
  createdAt: string;
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
  "raise.amount 表示本轮目标总下注额，不是额外加注量。",
  "选择 raise 时，amount 至少应为 currentBet + minRaise；minRaise 会跟随上一手完整下注/加注增量变化。",
];

const globalForRuntimeInstructions = globalThis as typeof globalThis & {
  __texasPokerRuntimeInstructionNotes?: RuntimeInstructionNote[];
  __texasPokerRuntimeInstructionVersion?: number;
};

const notes = (globalForRuntimeInstructions.__texasPokerRuntimeInstructionNotes ??= []);
globalForRuntimeInstructions.__texasPokerRuntimeInstructionVersion ??= 1;

export function getRuntimeInstructions(rawAgentId: string): RuntimeInstructions {
  const agentId = normalizeAgentId(rawAgentId);
  const agentNotes = notes.filter((note) => note.agentId === agentId).slice(-20);

  return {
    agentId,
    version: globalForRuntimeInstructions.__texasPokerRuntimeInstructionVersion ?? 1,
    updatedAt: agentNotes.at(-1)?.createdAt ?? new Date().toISOString(),
    instructions: [...defaultInstructions, ...agentNotes.map((note) => note.message)],
    notes: agentNotes,
  };
}

export function addRuntimeInstruction(rawAgentId: string, message: string, source: RuntimeInstructionNote["source"] = "operator") {
  const agentId = normalizeAgentId(rawAgentId);
  const normalizedMessage = normalizeMessage(message);
  const note: RuntimeInstructionNote = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    agentId,
    message: normalizedMessage,
    source,
    createdAt: new Date().toISOString(),
  };

  notes.push(note);
  globalForRuntimeInstructions.__texasPokerRuntimeInstructionVersion =
    (globalForRuntimeInstructions.__texasPokerRuntimeInstructionVersion ?? 1) + 1;

  return note;
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
