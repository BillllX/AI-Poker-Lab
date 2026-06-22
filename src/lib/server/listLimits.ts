const DEFAULT_TABLES_LIMIT = 24;
const MAX_TABLES_LIMIT = 48;
const DEFAULT_AGENTS_LIMIT = 40;
const MAX_AGENTS_LIMIT = 80;

export function parseListLimit(
  raw: string | null,
  { fallback, max }: { fallback: number; max: number },
): number {
  const parsed = Number(raw ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
}

export function parseTablesLimit(raw: string | null) {
  return parseListLimit(raw, { fallback: DEFAULT_TABLES_LIMIT, max: MAX_TABLES_LIMIT });
}

export function parseAgentsLimit(raw: string | null) {
  return parseListLimit(raw, { fallback: DEFAULT_AGENTS_LIMIT, max: MAX_AGENTS_LIMIT });
}

type TableSummaryLike = {
  id: string;
  playerCount: number;
  running: boolean;
};

/** Running tables first, then fuller tables — keeps lobby payloads small. */
export function prioritizeTableSummaries<T extends TableSummaryLike>(tables: T[], limit: number): T[] {
  return [...tables]
    .sort((left, right) => {
      if (left.running !== right.running) {
        return left.running ? -1 : 1;
      }
      if (right.playerCount !== left.playerCount) {
        return right.playerCount - left.playerCount;
      }
      return left.id.localeCompare(right.id);
    })
    .slice(0, limit);
}
