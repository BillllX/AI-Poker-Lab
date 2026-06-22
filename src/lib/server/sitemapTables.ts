import type { MetadataRoute } from "next";
import { parseTablesLimit } from "@/lib/server/listLimits";
import { getSiteOrigin } from "@/lib/server/siteUrl";
import { absoluteUrl } from "@/lib/server/siteUrl";
import { getTableManager } from "@/lib/server/simulator";

export const TOP_RUNNING_TABLE_SITEMAP_LIMIT = 12;

/** Running spectator tables for sitemap discovery (ephemeral — top N by player count). */
export function runningTableSitemapEntries(limit = TOP_RUNNING_TABLE_SITEMAP_LIMIT): MetadataRoute.Sitemap {
  const safeLimit = parseTablesLimit(String(limit));
  const manager = getTableManager(getSiteOrigin());

  return [...manager.summaries()]
    .filter((table) => table.running)
    .sort((left, right) => right.playerCount - left.playerCount || left.id.localeCompare(right.id))
    .slice(0, safeLimit)
    .map((table) => ({
      url: absoluteUrl(`/tables/${encodeURIComponent(table.id)}`),
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.82,
    }));
}
