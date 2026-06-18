export type RankTrend = "up" | "down" | "same" | "new";

export type RankChange = {
  currentRank: number;
  previousRank?: number;
  rankDelta: number;
  rankTrend: RankTrend;
};

export function rankChangeFor(currentRank: number, previousRank?: number): RankChange {
  if (!Number.isInteger(currentRank) || currentRank < 1) {
    throw new Error("currentRank must be a positive integer.");
  }
  if (previousRank === undefined) {
    return { currentRank, rankDelta: 0, rankTrend: "new" };
  }
  if (!Number.isInteger(previousRank) || previousRank < 1) {
    throw new Error("previousRank must be a positive integer.");
  }

  const rankDelta = previousRank - currentRank;
  return {
    currentRank,
    previousRank,
    rankDelta,
    rankTrend: rankDelta > 0 ? "up" : rankDelta < 0 ? "down" : "same",
  };
}
