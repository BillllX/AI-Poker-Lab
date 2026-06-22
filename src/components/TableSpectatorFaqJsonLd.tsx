import { buildTableSpectatorFaqJsonLd } from "@/lib/tableSpectatorStructuredData";

type TableSpectatorFaqJsonLdProps = {
  tableId: string;
};

/** FAQ JSON-LD for individual spectator table routes (S8 polish). */
export function TableSpectatorFaqJsonLd({ tableId }: TableSpectatorFaqJsonLdProps) {
  const payload = buildTableSpectatorFaqJsonLd(tableId);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
