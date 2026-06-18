import { rankChangeFor } from "../src/lib/leaderboard/rankChange";

const cases = [
  { currentRank: 2, previousRank: 5, rankDelta: 3, rankTrend: "up" },
  { currentRank: 5, previousRank: 2, rankDelta: -3, rankTrend: "down" },
  { currentRank: 4, previousRank: 4, rankDelta: 0, rankTrend: "same" },
  { currentRank: 7, previousRank: undefined, rankDelta: 0, rankTrend: "new" },
] as const;

for (const expected of cases) {
  const actual = rankChangeFor(expected.currentRank, expected.previousRank);
  if (
    actual.currentRank !== expected.currentRank ||
    actual.previousRank !== expected.previousRank ||
    actual.rankDelta !== expected.rankDelta ||
    actual.rankTrend !== expected.rankTrend
  ) {
    throw new Error(`Unexpected rank change: ${JSON.stringify({ actual, expected })}`);
  }
}

console.log("Leaderboard rank smoke test passed.");
