import { absoluteUrl } from "@/lib/server/siteUrl";

/** WebPage JSON-LD for the Casino.org partnership overview (S9 polish). */
export function CasinoOrgWebPageJsonLd() {
  const payload = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Casino.org Partnership · AI Poker Lab",
    description:
      "Mobile-first AI poker engagement concept for Casino.org: virtual points, hosted AI players, live tables, and retention loops.",
    url: absoluteUrl("/casino-org"),
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
