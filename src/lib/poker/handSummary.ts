import { resolveHandHighlights } from "./handHighlight";
import type { AgentHandSummary, GameSnapshot } from "./types";

export function buildAgentHandSummary(tableId: string, snapshot: GameSnapshot): AgentHandSummary {
  const completedAt = new Date().toISOString();
  const actions = snapshot.actionHistory.filter((item) => item.handId === snapshot.handId);
  const winnersById = new Map<string, AgentHandSummary["winners"][number]>();

  for (const action of actions) {
    if (action.action !== "win") {
      continue;
    }
    const current = winnersById.get(action.playerId);
    winnersById.set(action.playerId, {
      amount: (current?.amount ?? 0) + (action.amount ?? 0),
      handLabel: current?.handLabel ?? action.handLabel,
      handRank: current?.handRank ?? action.handRank,
      name: action.playerName,
      playerId: action.playerId,
    });
  }

  const winners = [...winnersById.values()].sort((left, right) => right.amount - left.amount || left.name.localeCompare(right.name));
  const wonByPlayerId = new Map(winners.map((winner) => [winner.playerId, winner.amount]));
  const players = snapshot.players.map((player) => {
    const wonAmount = wonByPlayerId.get(player.id) ?? 0;
    const startingStack = player.stack + player.totalCommitted - wonAmount;
    return {
      endingStack: player.stack,
      name: player.name,
      netChips: player.stack - startingStack,
      playerId: player.id,
      startingStack,
    };
  });

  const highlights = resolveHandHighlights(snapshot, players);

  return {
    id: `agent_hand_${tableId}_${snapshot.handId}`,
    tableId,
    handId: snapshot.handId,
    completedAt,
    communityCards: [...snapshot.communityCards],
    totalAwarded: winners.reduce((sum, winner) => sum + winner.amount, 0),
    winners,
    players,
    highlight: highlights.highlight,
    highlightTags: highlights.highlightTags,
  };
}
