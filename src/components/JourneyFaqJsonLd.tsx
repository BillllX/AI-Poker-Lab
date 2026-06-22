import { buildJourneyFaqJsonLd } from "@/lib/journeyStructuredData";

/** FAQ JSON-LD for the public dev diary page (S8 polish). */
export function JourneyFaqJsonLd() {
  const payload = buildJourneyFaqJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
