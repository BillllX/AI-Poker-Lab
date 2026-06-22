import { buildFaqPageJsonLd, buildHowToJsonLd } from "@/lib/homeStructuredData";

/** FAQ + HowTo JSON-LD for the homepage experiment flow (SSR-safe). */
export function HomeExperimentJsonLd() {
  const payloads = [buildFaqPageJsonLd(), buildHowToJsonLd()];

  return (
    <>
      {payloads.map((payload) => (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
          key={payload["@type"] as string}
          type="application/ld+json"
        />
      ))}
    </>
  );
}
