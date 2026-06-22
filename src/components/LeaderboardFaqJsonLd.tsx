import { buildLeaderboardFaqJsonLd } from "@/lib/leaderboardStructuredData";

/** FAQ JSON-LD for the public leaderboard (S8 polish). */
export function LeaderboardFaqJsonLd() {
  const payload = buildLeaderboardFaqJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
