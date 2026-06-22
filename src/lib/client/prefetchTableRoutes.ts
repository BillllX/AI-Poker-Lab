import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export const TABLE_SPECTATOR_PREFETCH_LIMIT = 4;
export const LEADERBOARD_AGENT_PREFETCH_LIMIT = 4;
export const LOBBY_ROUTE_PATH = "/tables";
export const LEADERBOARD_ROUTE_PATH = "/leaderboard";
export const HUMAN_TABLE_ROUTE_PATH = "/human-table";

export function tableSpectatorPath(tableId: string) {
  return `/tables/${encodeURIComponent(tableId)}`;
}

export function agentProfilePath(agentId: string) {
  return `/agents/${encodeURIComponent(agentId)}`;
}

export function prefetchLobbyRoute(router: Pick<AppRouterInstance, "prefetch">) {
  router.prefetch(LOBBY_ROUTE_PATH);
}

export function prefetchLeaderboardRoute(router: Pick<AppRouterInstance, "prefetch">) {
  router.prefetch(LEADERBOARD_ROUTE_PATH);
}

export function prefetchHumanTableRoute(router: Pick<AppRouterInstance, "prefetch">) {
  router.prefetch(HUMAN_TABLE_ROUTE_PATH);
}

export function prefetchAppRoute(router: Pick<AppRouterInstance, "prefetch">, path: string) {
  router.prefetch(path);
}

/** Bottom-nav likely next hops — practice table + profile. */
export function prefetchBottomNavRoutes(router: Pick<AppRouterInstance, "prefetch">, profilePath: string) {
  router.prefetch(HUMAN_TABLE_ROUTE_PATH);
  router.prefetch(profilePath);
}

/** Prefetch top public agent profiles from leaderboard rows (owner → agent id). */
export function prefetchAgentProfileRoutes(
  router: Pick<AppRouterInstance, "prefetch">,
  entries: Array<{ agentId?: string; ownerUserId: string }>,
  limit = LEADERBOARD_AGENT_PREFETCH_LIMIT,
) {
  const seen = new Set<string>();
  for (const entry of entries) {
    const agentId = entry.agentId ?? entry.ownerUserId;
    if (seen.has(agentId)) {
      continue;
    }
    seen.add(agentId);
    router.prefetch(agentProfilePath(agentId));
    if (seen.size >= limit) {
      break;
    }
  }
}

type PrefetchableTable = {
  id: string;
  playerCount?: number;
  running?: boolean;
};

/** Rank live tables first (by players), then waiting — for lobby → spectator prefetch. */
export function rankTablesForSpectatorPrefetch<T extends PrefetchableTable>(tables: T[], limit = TABLE_SPECTATOR_PREFETCH_LIMIT) {
  return [...tables]
    .sort(
      (left, right) =>
        Number(Boolean(right.running)) - Number(Boolean(left.running)) ||
        (right.playerCount ?? 0) - (left.playerCount ?? 0) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, limit);
}

export function prefetchTableSpectatorRoutes(
  router: Pick<AppRouterInstance, "prefetch">,
  tables: PrefetchableTable[],
  limit = TABLE_SPECTATOR_PREFETCH_LIMIT,
) {
  for (const table of rankTablesForSpectatorPrefetch(tables, limit)) {
    router.prefetch(tableSpectatorPath(table.id));
  }
}

export function prefetchTableSpectatorRoute(router: Pick<AppRouterInstance, "prefetch">, tableId: string) {
  router.prefetch(tableSpectatorPath(tableId));
}
