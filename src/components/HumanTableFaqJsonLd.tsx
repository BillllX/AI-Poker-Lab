import { buildHumanTableFaqJsonLd } from "@/lib/humanTableStructuredData";

/** FAQ JSON-LD for the human practice table hub (S8 polish). */
export function HumanTableFaqJsonLd() {
  const payload = buildHumanTableFaqJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
