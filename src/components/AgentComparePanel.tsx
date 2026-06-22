"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/client/basePath";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { agentProfilePath, prefetchAppRoute } from "@/lib/client/prefetchTableRoutes";
import { publicApiFetchInit } from "@/lib/client/publicApiFetch";
import styles from "@/app/agents/agent-profile.module.css";

type LeaderboardUser = {
  id: string;
  name: string;
  pointsBalance: number;
};

type AgentSummary = {
  id: string;
  ownerUserId?: string;
};

type AgentComparePanelCopy = {
  leaderboard: string;
  points: string;
  text: string;
  title: string;
  you: string;
};

type AgentComparePanelProps = {
  copy: AgentComparePanelCopy;
  currentAgentId: string;
  currentOwnerUserId?: string;
  currentPoints?: number;
};

function agentForUser(agents: AgentSummary[], ownerUserId: string) {
  return (
    agents.find((agent) => agent.ownerUserId === ownerUserId) ?? {
      id: ownerUserId,
      ownerUserId,
    }
  );
}

export function AgentComparePanel({
  copy,
  currentAgentId,
  currentOwnerUserId,
  currentPoints = 0,
}: AgentComparePanelProps) {
  const router = useRouter();
  const [peers, setPeers] = useState<Array<{ agentId: string; name: string; pointsBalance: number }>>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPeers() {
      try {
        const [leaderboardResponse, tablesResponse] = await Promise.all([
          fetch(withBasePath("/api/leaderboard?limit=12&sort=points"), publicApiFetchInit),
          fetch(withBasePath("/api/tables?limit=1&agentLimit=48"), publicApiFetchInit),
        ]);
        if (!leaderboardResponse.ok || !tablesResponse.ok || cancelled) {
          return;
        }

        const leaderboardPayload = await leaderboardResponse.json();
        const tablesPayload = await tablesResponse.json();
        const users = Array.isArray(leaderboardPayload.users) ? (leaderboardPayload.users as LeaderboardUser[]) : [];
        const agents = Array.isArray(tablesPayload.agents) ? (tablesPayload.agents as AgentSummary[]) : [];

        const nextPeers = users
          .map((user) => {
            const agent = agentForUser(agents, user.id);
            return {
              agentId: agent.id,
              name: user.name,
              pointsBalance: user.pointsBalance,
            };
          })
          .filter((entry) => entry.agentId !== currentAgentId && entry.agentId !== currentOwnerUserId)
          .slice(0, 3);

        if (!cancelled) {
          setPeers(nextPeers);
        }
      } catch {
        if (!cancelled) {
          setPeers([]);
        }
      }
    }

    void loadPeers();
    return () => {
      cancelled = true;
    };
  }, [currentAgentId, currentOwnerUserId]);

  if (peers.length === 0) {
    return null;
  }

  return (
    <section aria-label={copy.title} className={styles.compareCard}>
      <div className={styles.compareHeader}>
        <div>
          <h2>{copy.title}</h2>
          <p className={styles.muted}>{copy.text}</p>
        </div>
        <Link className={styles.compareLeaderboardLink} href="/leaderboard">
          {copy.leaderboard}
        </Link>
      </div>
      <ul className={styles.compareList}>
        {peers.map((peer) => {
          const delta = peer.pointsBalance - currentPoints;
          return (
            <li key={peer.agentId}>
              <Link
                className={styles.comparePeerLink}
                href={agentProfilePath(peer.agentId)}
                onClick={() => {
                  trackEngagement({
                    agentId: peer.agentId,
                    at: new Date().toISOString(),
                    name: "engagement.agent_compare.click",
                    sourceAgentId: currentAgentId,
                  });
                }}
                onMouseEnter={() => prefetchAppRoute(router, agentProfilePath(peer.agentId))}
              >
                <strong>{peer.name}</strong>
                <span>
                  {copy.points} {peer.pointsBalance.toLocaleString()}
                </span>
                <span className={delta >= 0 ? styles.positive : styles.negative}>
                  {delta >= 0 ? "+" : ""}
                  {delta.toLocaleString()} {copy.you}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
