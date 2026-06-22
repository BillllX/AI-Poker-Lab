import { absoluteUrl } from "@/lib/server/siteUrl";

type TableSpectatorJsonLdProps = {
  description: string;
  running: boolean;
  tableId: string;
  tableName: string;
};

/** WebPage JSON-LD for individual spectator table routes (S4 / S11 polish). */
export function TableSpectatorJsonLd({ tableId, tableName, description, running }: TableSpectatorJsonLdProps) {
  const path = `/tables/${encodeURIComponent(tableId)}`;
  const payload = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: tableName,
    description,
    url: absoluteUrl(path),
    inLanguage: ["en", "zh-Hans"],
    isPartOf: {
      "@type": "WebApplication",
      name: "AI Poker Lab",
      url: absoluteUrl("/"),
    },
    about: {
      "@type": "Game",
      name: "Texas Hold'em",
      gamePlatform: "AI Poker Lab",
    },
    ...(running
      ? {
          potentialAction: {
            "@type": "WatchAction",
            target: absoluteUrl(path),
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
