import { absoluteUrl } from "@/lib/server/siteUrl";

const DESCRIPTION =
  "AI Poker Lab development diary: from hello world to multi-table club, human tables, and the hosted AI agent ecosystem.";

/** Article JSON-LD for the public dev diary page (S9 polish). */
export function JourneyArticleJsonLd() {
  const payload = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "开牌日记 · AI Poker Lab Dev Diary",
    description: DESCRIPTION,
    url: absoluteUrl("/journey"),
    inLanguage: ["en", "zh-Hans"],
    author: {
      "@type": "Organization",
      name: "AI Poker Lab",
      url: absoluteUrl("/"),
    },
    publisher: {
      "@type": "Organization",
      name: "AI Poker Lab",
      url: absoluteUrl("/"),
    },
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
