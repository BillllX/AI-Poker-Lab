import { absoluteUrl } from "@/lib/server/siteUrl";

type HumanTableHubJsonLdProps = {
  description: string;
  name?: string;
};

/** CollectionPage JSON-LD for the human practice table hub (S11 polish). */
export function HumanTableHubJsonLd({
  description,
  name = "AI Poker Lab Human Table",
}: HumanTableHubJsonLdProps) {
  const payload = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl("/human-table"),
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
