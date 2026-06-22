import type { MetadataRoute } from "next";
import { listAgents } from "@/lib/server/agentRegistry";
import { listLeaderboardUsers } from "@/lib/server/userRegistry";
import { absoluteUrl } from "@/lib/server/siteUrl";

export const TOP_AGENT_SITEMAP_LIMIT = 25;

/** Top leaderboard owners mapped to public /agents/[id] URLs for sitemap discovery. */
export async function topAgentSitemapEntries(limit = TOP_AGENT_SITEMAP_LIMIT): Promise<MetadataRoute.Sitemap> {
  const [users, agents] = await Promise.all([
    listLeaderboardUsers(limit, "points"),
    Promise.resolve(listAgents()),
  ]);

  const agentIdByOwner = new Map<string, (typeof agents)[number]>();
  for (const agent of agents) {
    if (agent.ownerUserId) {
      agentIdByOwner.set(agent.ownerUserId, agent);
    }
  }

  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];

  for (const user of users) {
    const agent = agentIdByOwner.get(user.id);
    const agentId = agent?.id ?? user.id;
    if (seen.has(agentId)) {
      continue;
    }
    seen.add(agentId);

    const createdAt = new Date(user.createdAt);
    const lastSeenAt = agent?.lastSeenAt ? new Date(agent.lastSeenAt) : undefined;
    const lastModified =
      lastSeenAt && !Number.isNaN(lastSeenAt.getTime()) && lastSeenAt > createdAt ? lastSeenAt : createdAt;

    entries.push({
      url: absoluteUrl(`/agents/${encodeURIComponent(agentId)}`),
      lastModified,
      changeFrequency: "daily",
      priority: 0.75,
    });
  }

  return entries;
}
