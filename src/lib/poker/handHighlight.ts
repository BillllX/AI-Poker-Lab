import { compareHands, evaluateTexasHand } from "./handEvaluator";
import type { AgentHandSummaryPlayer, ActionHistoryItem, GameSnapshot } from "./types";

export type HandHighlightTag = "big-pot" | "river-battle" | "bad-beat" | "big-win" | "all-in-duel";

export type HandHighlightResult = {
  highlight: boolean;
  highlightTags: HandHighlightTag[];
};

export function resolveHandHighlights(
  snapshot: GameSnapshot,
  players: AgentHandSummaryPlayer[],
): HandHighlightResult {
  const tags = new Set<HandHighlightTag>();
  const actions = snapshot.actionHistory.filter((item) => item.handId === snapshot.handId);
  const seatedCount = Math.max(2, snapshot.players.filter((player) => player.status !== "out").length);
  const pot = snapshot.pot;

  if (pot >= 4 * snapshot.bigBlind * seatedCount) {
    tags.add("big-pot");
  }

  const allInCount = actions.filter((item) => item.isAllIn).length;
  if (allInCount >= 2) {
    tags.add("all-in-duel");
  }

  for (const player of players) {
    if (player.netChips >= 400) {
      tags.add("big-win");
    }

    if (player.netChips <= -150 && riverRaiseOrAllIn(actions, player.playerId)) {
      tags.add("river-battle");
    }

    if (player.netChips <= -200 && badBeatAtShowdown(snapshot, player.playerId, players)) {
      tags.add("bad-beat");
    }
  }

  return {
    highlight: tags.size > 0,
    highlightTags: [...tags],
  };
}

function riverRaiseOrAllIn(actions: ActionHistoryItem[], playerId: string) {
  return actions.some(
    (item) =>
      item.playerId === playerId &&
      item.round === "river" &&
      (item.action === "raise" || item.action === "bet" || item.isAllIn),
  );
}

function badBeatAtShowdown(snapshot: GameSnapshot, playerId: string, players: AgentHandSummaryPlayer[]) {
  if (snapshot.communityCards.length < 5) {
    return false;
  }

  const player = snapshot.players.find((entry) => entry.id === playerId);
  if (!player || player.status === "folded" || (player.holeCards?.length ?? 0) < 2) {
    return false;
  }

  const showdownPlayers = snapshot.players.filter(
    (entry) => entry.status !== "folded" && entry.status !== "out" && (entry.holeCards?.length ?? 0) === 2,
  );
  if (showdownPlayers.length < 2) {
    return false;
  }

  const ranked = showdownPlayers
    .map((entry) => ({
      playerId: entry.id,
      hand: evaluateTexasHand([...(entry.holeCards ?? []), ...snapshot.communityCards]),
    }))
    .sort((left, right) => compareHands(right.hand, left.hand));

  const topTwoIds = new Set(ranked.slice(0, 2).map((entry) => entry.playerId));
  if (!topTwoIds.has(playerId)) {
    return false;
  }

  const summaryPlayer = players.find((entry) => entry.playerId === playerId);
  if (!summaryPlayer || summaryPlayer.netChips > -200) {
    return false;
  }

  const topWinnerId = ranked[0]?.playerId;
  return topWinnerId !== playerId;
}

export const handHighlightLabels: Record<HandHighlightTag, { en: string; zh: string }> = {
  "all-in-duel": { en: "All-in duel", zh: "全下对决" },
  "bad-beat": { en: "Bad beat", zh: "Bad Beat" },
  "big-pot": { en: "Big pot", zh: "大底池" },
  "big-win": { en: "Big win", zh: "大赢" },
  "river-battle": { en: "River battle", zh: "河牌激斗" },
};
