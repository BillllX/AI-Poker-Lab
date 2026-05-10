import { rankValue } from "../poker/cards";
import type { AgentDecisionRequest, AgentDecisionResponse, Card, PokerAction } from "../poker/types";
import type { VirtualAgentStrategy } from "../server/agentRegistry";

export function decideForAgent(agentId: string, request: AgentDecisionRequest, explicitStrategy?: VirtualAgentStrategy): AgentDecisionResponse {
  const action = strategyFor(agentId, explicitStrategy)(request);

  return {
    type: "action_response",
    tableId: request.tableId,
    playerId: request.playerId,
    action,
    reasoning: `${agentId} 使用内置 ${explicitStrategy ?? "auto"} 策略选择 ${action.type}。`,
  };
}

function strategyFor(agentId: string, explicitStrategy?: VirtualAgentStrategy) {
  if (explicitStrategy === "tight") {
    return tightStrategy;
  }

  if (explicitStrategy === "aggressive") {
    return aggressiveStrategy;
  }

  if (explicitStrategy === "caller") {
    return callerStrategy;
  }

  if (explicitStrategy === "random") {
    return randomStrategy;
  }

  if (agentId.includes("tight")) {
    return tightStrategy;
  }

  if (agentId.includes("aggressive")) {
    return aggressiveStrategy;
  }

  if (agentId.includes("caller")) {
    return callerStrategy;
  }

  return randomStrategy;
}

function randomStrategy(request: AgentDecisionRequest): PokerAction {
  const legal = request.legalActions;
  const choice = legal[Math.floor(Math.random() * legal.length)];

  if (choice === "bet" || choice === "raise") {
    return { type: choice, amount: boundedRaise(request, 2 + Math.floor(Math.random() * 3)) };
  }

  return { type: choice };
}

function tightStrategy(request: AgentDecisionRequest): PokerAction {
  const strength = estimateStrength(request.privateCards, request.publicState.communityCards);

  if (request.toCall > 0 && strength < 0.42) {
    return { type: "fold" };
  }

  if (strength > 0.72 && request.legalActions.includes("raise")) {
    return { type: "raise", amount: boundedRaise(request, 3) };
  }

  if (strength > 0.68 && request.legalActions.includes("bet")) {
    return { type: "bet", amount: boundedRaise(request, 2) };
  }

  return request.toCall > 0 ? { type: "call" } : { type: "check" };
}

function aggressiveStrategy(request: AgentDecisionRequest): PokerAction {
  const strength = estimateStrength(request.privateCards, request.publicState.communityCards);

  if (strength > 0.55 && request.legalActions.includes("raise")) {
    return { type: "raise", amount: boundedRaise(request, 4) };
  }

  if (strength > 0.45 && request.legalActions.includes("bet")) {
    return { type: "bet", amount: boundedRaise(request, 3) };
  }

  if (request.toCall > request.stack * 0.25 && strength < 0.38) {
    return { type: "fold" };
  }

  return request.toCall > 0 ? { type: "call" } : { type: "check" };
}

function callerStrategy(request: AgentDecisionRequest): PokerAction {
  const strength = estimateStrength(request.privateCards, request.publicState.communityCards);

  if (request.toCall > request.stack * 0.35 && strength < 0.45) {
    return { type: "fold" };
  }

  return request.toCall > 0 ? { type: "call" } : { type: "check" };
}

function boundedRaise(request: AgentDecisionRequest, multiplier: number) {
  const target = request.publicState.currentBet + request.minRaise * multiplier;
  return Math.min(request.publicState.currentBet + request.stack, Math.max(request.minRaise, target));
}

function estimateStrength(holeCards: Card[], communityCards: Card[]) {
  const values = holeCards.map((card) => rankValue[card.rank]);
  const highCard = Math.max(...values) / 14;
  const pairBonus = values[0] === values[1] ? 0.35 : 0;
  const suitedBonus = holeCards[0]?.suit === holeCards[1]?.suit ? 0.08 : 0;
  const connectedBonus = Math.abs(values[0] - values[1]) <= 2 ? 0.06 : 0;
  const boardPairBonus = communityCards.some((card) => values.includes(rankValue[card.rank])) ? 0.18 : 0;

  return Math.min(1, highCard * 0.55 + pairBonus + suitedBonus + connectedBonus + boardPairBonus);
}
