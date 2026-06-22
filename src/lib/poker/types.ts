export type Suit = "s" | "h" | "d" | "c";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";

export type Card = {
  rank: Rank;
  suit: Suit;
};

export type BettingRound = "preflop" | "flop" | "turn" | "river" | "showdown";
export type PlayerStatus = "active" | "folded" | "all-in" | "out";
export type AgentStyle = "random" | "tight" | "aggressive" | "caller";

export type PokerAction =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "bet"; amount: number }
  | { type: "raise"; amount: number };

export type LegalAction = PokerAction["type"];

export type PlayerState = {
  id: string;
  name: string;
  ownerUserId?: string;
  modelName?: string;
  kind?: "external" | "hosted" | "human" | "resident" | "virtual";
  strategy?: AgentStyle;
  endpoint?: string;
  stack: number;
  holeCards: Card[];
  currentBet: number;
  totalCommitted: number;
  status: PlayerStatus;
  lastAction?: string;
  lastReasoning?: string;
};

export type PublicPlayerState = Omit<PlayerState, "holeCards"> & {
  holeCards?: Card[];
};

export type ActionLog = {
  id: string;
  handId: number;
  actor: string;
  message: string;
  createdAt: string;
};

export type ActionHistoryItem = {
  id: string;
  handId: number;
  round: BettingRound;
  playerId: string;
  playerName: string;
  action: LegalAction | "post-blind" | "deal" | "win";
  amount?: number;
  handRank?: HandRank;
  handLabel?: string;
  isAllIn?: boolean;
  targetBet?: number;
  potAfter: number;
  createdAt: string;
};

export type AgentHandSummaryWinner = {
  amount: number;
  handLabel?: string;
  handRank?: HandRank;
  name: string;
  playerId: string;
};

export type AgentHandSummaryPlayer = {
  endingStack: number;
  name: string;
  netChips: number;
  playerId: string;
  startingStack: number;
};

import type { HandHighlightTag } from "./handHighlight";

export type AgentHandSummary = {
  id: string;
  tableId: string;
  handId: number;
  completedAt: string;
  communityCards: Card[];
  totalAwarded: number;
  winners: AgentHandSummaryWinner[];
  players: AgentHandSummaryPlayer[];
  highlight?: boolean;
  highlightTags?: HandHighlightTag[];
};

export type GameSnapshot = {
  tableId?: string;
  tableName?: string;
  handId: number;
  running: boolean;
  phase: BettingRound;
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  pot: number;
  currentBet: number;
  minRaise: number;
  currentPlayerId?: string;
  communityCards: Card[];
  players: PublicPlayerState[];
  actionHistory: ActionHistoryItem[];
  logs: ActionLog[];
  stats: AgentStats[];
  modelStats: ModelStats[];
  handSummaries?: AgentHandSummary[];
  recentReactions?: TableReaction[];
  spectatorCount?: number;
};

export type TableReaction = {
  id: string;
  emoji: string;
  at: string;
};

export type AgentDecisionPlayerState = Pick<
  PlayerState,
  "id" | "name" | "kind" | "stack" | "currentBet" | "totalCommitted" | "status" | "lastAction"
>;

export type AgentDecisionPublicState = Pick<
  GameSnapshot,
  | "tableId"
  | "tableName"
  | "handId"
  | "running"
  | "phase"
  | "dealerIndex"
  | "smallBlind"
  | "bigBlind"
  | "pot"
  | "currentBet"
  | "minRaise"
  | "currentPlayerId"
  | "communityCards"
> & {
  players: AgentDecisionPlayerState[];
};

export type AgentStats = {
  playerId: string;
  modelName?: string;
  handsWon: number;
  handsPlayed: number;
  profit: number;
};

export type ModelStats = {
  modelName: string;
  handsPlayed: number;
  agents: number;
};

export type HandDrawType =
  | "flush-draw"
  | "open-ended-straight-draw"
  | "gutshot-straight-draw"
  | "overcards"
  | "backdoor-flush-draw";

export type AgentDecisionHandAnalysis = {
  madeHand: {
    rank: HandRank | "preflop";
    label: string;
    bestCards: Card[];
    summary: string;
  };
  draws: Array<{
    type: HandDrawType;
    label: string;
    outs?: number;
  }>;
  boardTexture: {
    paired: boolean;
    monotone: boolean;
    twoTone: boolean;
    connected: boolean;
    highCardRank?: Rank;
    summary: string;
  };
  tacticalNotes: string[];
};

export type AgentDecisionRequest = {
  type: "decision_request";
  requestId?: string;
  tableId?: string;
  handId: number;
  playerId: string;
  privateCards: Card[];
  publicState: AgentDecisionPublicState;
  actionHistory: ActionHistoryItem[];
  legalActions: LegalAction[];
  toCall: number;
  minRaise: number;
  stack: number;
  handAnalysis: AgentDecisionHandAnalysis;
};

export type AgentDecisionResponse = {
  type: "action_response";
  requestId?: string;
  tableId?: string;
  playerId: string;
  action: PokerAction;
  reasoning?: string;
};

export type HandRank =
  | "high-card"
  | "pair"
  | "two-pair"
  | "three-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-kind"
  | "straight-flush";

export type EvaluatedHand = {
  rank: HandRank;
  score: number[];
  cards: Card[];
};
