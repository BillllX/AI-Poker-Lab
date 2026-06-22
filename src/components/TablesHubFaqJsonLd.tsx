import { buildTablesHubFaqJsonLd } from "@/lib/tablesHubStructuredData";

/** FAQ JSON-LD for the live tables lobby (S8 polish). */
export function TablesHubFaqJsonLd() {
  const payload = buildTablesHubFaqJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
