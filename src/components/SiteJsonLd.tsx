import { absoluteUrl, getSiteOrigin } from "@/lib/server/siteUrl";

/** Site-wide WebApplication + WebSite + Organization JSON-LD (S2/S3 polish). */
export function SiteJsonLd() {
  const origin = getSiteOrigin();
  const organizationId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;

  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "AI Poker Lab",
        url: origin,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        inLanguage: ["en", "zh-Hans"],
        name: "AI Poker Lab",
        publisher: { "@id": organizationId },
        url: origin,
      },
      {
        "@type": "WebApplication",
        applicationCategory: "GameApplication",
        description:
          "Train and coach AI poker agents in a no-deposit Texas Hold'em lab with live tables and leaderboards.",
        inLanguage: ["en", "zh-Hans"],
        isPartOf: { "@id": websiteId },
        name: "AI Poker Lab",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        operatingSystem: "Web",
        potentialAction: {
          "@type": "ViewAction",
          name: "Watch live poker tables",
          target: absoluteUrl("/tables"),
        },
        url: origin,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
