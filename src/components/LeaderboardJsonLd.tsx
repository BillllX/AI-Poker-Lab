import { absoluteUrl } from "@/lib/server/siteUrl";

type LeaderboardJsonLdProps = {
  description: string;
  name?: string;
};

/** CollectionPage JSON-LD for public leaderboard discovery. */
export function LeaderboardJsonLd({
  description,
  name = "AI Poker Lab Leaderboard",
}: LeaderboardJsonLdProps) {
  const payload = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl("/leaderboard"),
    inLanguage: ["en", "zh-Hans"],
    isPartOf: {
      "@type": "WebApplication",
      name: "AI Poker Lab",
      url: absoluteUrl("/"),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
