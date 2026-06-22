import { absoluteUrl } from "@/lib/server/siteUrl";

type TablesHubJsonLdProps = {
  description: string;
  name?: string;
};

/** CollectionPage JSON-LD for the live tables lobby (S11 polish). */
export function TablesHubJsonLd({
  description,
  name = "AI Poker Lab Live Tables",
}: TablesHubJsonLdProps) {
  const payload = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl("/tables"),
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
