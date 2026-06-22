import type { ActionHistoryItem, GameSnapshot, PublicPlayerState } from "@/lib/poker/types";
import type { HumanTableSnapshot } from "@/lib/server/humanTableManager";

function slimActionHistoryItem(item: ActionHistoryItem): ActionHistoryItem {
  const slim: ActionHistoryItem = {
    action: item.action,
    createdAt: item.createdAt,
    handId: item.handId,
    id: item.id,
    playerId: item.playerId,
    playerName: item.playerName,
    potAfter: item.potAfter,
    round: item.round,
  };

  if (item.amount !== undefined) {
    slim.amount = item.amount;
  }
  if (item.action === "win") {
    if (item.handLabel) {
      slim.handLabel = item.handLabel;
    }
    if (item.handRank) {
      slim.handRank = item.handRank;
    }
  }

  return slim;
}

function slimPublicPlayerForSse(player: PublicPlayerState): PublicPlayerState {
  const slim: PublicPlayerState = {
    currentBet: player.currentBet,
    holeCards: player.holeCards,
    id: player.id,
    name: player.name,
    stack: player.stack,
    status: player.status,
    totalCommitted: player.totalCommitted,
  };

  if (player.kind) {
    slim.kind = player.kind;
  }
  if (player.lastAction) {
    slim.lastAction = player.lastAction;
  }
  if (player.lastReasoning) {
    slim.lastReasoning = player.lastReasoning;
  }
  if (player.ownerUserId) {
    slim.ownerUserId = player.ownerUserId;
  }

  return slim;
}

export type SlimGameSnapshotForSse = Omit<GameSnapshot, "modelStats" | "stats" | "tableId" | "tableName">;

/** Match `SPECTATOR_LOG_DISPLAY_CAP` — trim SSE payloads on every tick. */
const SSE_LOG_CAP = 60;
const SSE_REACTION_CAP = 8;
const SSE_ACTION_HISTORY_CAP = 40;
const SSE_HAND_SUMMARIES_CAP = 5;

/** Strip fields that the spectator UI does not consume on every SSE tick. */
export function slimGameSnapshotForSse(snapshot: GameSnapshot): SlimGameSnapshotForSse {
  return {
    actionHistory: snapshot.actionHistory.slice(-SSE_ACTION_HISTORY_CAP).map(slimActionHistoryItem),
    bigBlind: snapshot.bigBlind,
    communityCards: snapshot.communityCards,
    currentBet: snapshot.currentBet,
    currentPlayerId: snapshot.currentPlayerId,
    dealerIndex: snapshot.dealerIndex,
    handId: snapshot.handId,
    handSummaries: snapshot.handSummaries?.slice(0, SSE_HAND_SUMMARIES_CAP),
    logs: snapshot.logs.slice(0, SSE_LOG_CAP),
    minRaise: snapshot.minRaise,
    phase: snapshot.phase,
    players: snapshot.players.map(slimPublicPlayerForSse),
    pot: snapshot.pot,
    recentReactions: snapshot.recentReactions?.slice(-SSE_REACTION_CAP),
    running: snapshot.running,
    smallBlind: snapshot.smallBlind,
    spectatorCount: snapshot.spectatorCount,
  };
}

/** Human-table SSE omits slow-changing aggregates; client merges with prior snapshot. */
export function slimHumanTableSnapshotForSse(
  snapshot: HumanTableSnapshot,
): Omit<HumanTableSnapshot, "game" | "playerStats"> & {
  game?: SlimGameSnapshotForSse;
  playerStats?: HumanTableSnapshot["playerStats"];
} {
  return {
    game: snapshot.game ? slimGameSnapshotForSse(snapshot.game) : undefined,
    handSummaries: snapshot.handSummaries?.slice(0, SSE_HAND_SUMMARIES_CAP),
    myPlayerId: snapshot.myPlayerId,
    mySeatStatus: snapshot.mySeatStatus,
    pendingDecision: snapshot.pendingDecision,
    tableStatus: snapshot.tableStatus,
  };
}
