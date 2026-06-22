import { buildCasinoOrgFaqJsonLd } from "@/lib/casinoOrgStructuredData";

/** FAQ JSON-LD for the Casino.org partnership overview (S8 polish). */
export function CasinoOrgFaqJsonLd() {
  const payload = buildCasinoOrgFaqJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
