import type { MetadataRoute } from "next";
import { topAgentSitemapEntries } from "@/lib/server/sitemapAgents";
import { runningTableSitemapEntries } from "@/lib/server/sitemapTables";
import { absoluteUrl } from "@/lib/server/siteUrl";

export const dynamic = "force-dynamic";

/** Static marketing & hub routes (exclude auth-only and dynamic IDs). */
const STATIC_ROUTES: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/tables", changeFrequency: "always", priority: 0.9 },
  { path: "/leaderboard", changeFrequency: "hourly", priority: 0.85 },
  { path: "/human-table", changeFrequency: "daily", priority: 0.8 },
  { path: "/journey", changeFrequency: "weekly", priority: 0.7 },
  { path: "/casino-org", changeFrequency: "monthly", priority: 0.5 },
];

function staticRouteLastModified(path: string): Date {
  const now = Date.now();
  switch (path) {
    case "/tables":
    case "/leaderboard":
      return new Date(now);
    case "/":
      return new Date(now - 60 * 60 * 1000);
    case "/human-table":
      return new Date(now - 24 * 60 * 60 * 1000);
    case "/journey":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "/casino-org":
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now);
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = STATIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified: staticRouteLastModified(path),
    changeFrequency,
    priority,
  }));

  const agentEntries = await topAgentSitemapEntries().catch(() => [] as MetadataRoute.Sitemap);
  const tableEntries = runningTableSitemapEntries();
  return [...staticEntries, ...tableEntries, ...agentEntries];
}
