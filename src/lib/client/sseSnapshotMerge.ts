import type { GameSnapshot } from "@/lib/poker/types";
import type { SlimGameSnapshotForSse } from "@/lib/server/sseSnapshot";

export function mergeGameSnapshotForSse(
  previous: GameSnapshot | undefined,
  incoming: SlimGameSnapshotForSse | GameSnapshot,
): GameSnapshot {
  return {
    ...previous,
    ...incoming,
    handSummaries: incoming.handSummaries ?? previous?.handSummaries,
    logs: incoming.logs ?? previous?.logs ?? [],
    recentReactions: incoming.recentReactions ?? previous?.recentReactions,
    stats: previous?.stats ?? [],
    modelStats: previous?.modelStats ?? [],
  };
}

type MergeableHumanTableSnapshot = {
  game?: GameSnapshot;
  handSummaries?: unknown[];
  playerStats?: unknown[];
};

export function mergeHumanTableSnapshotForSse<T extends MergeableHumanTableSnapshot>(
  previous: T | undefined,
  incoming: T,
): T {
  return {
    ...previous,
    ...incoming,
    game: incoming.game ?? previous?.game,
    handSummaries: (incoming.handSummaries ?? previous?.handSummaries ?? []) as T["handSummaries"],
    playerStats: (incoming.playerStats ?? previous?.playerStats ?? []) as T["playerStats"],
  };
}
