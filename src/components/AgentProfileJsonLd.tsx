import { absoluteUrl } from "@/lib/server/siteUrl";

type AgentProfileJsonLdProps = {
  agentId: string;
  description: string;
  imageUrl?: string;
  name: string;
};

/** ProfilePage JSON-LD for public agent discovery (S10 polish). */
export function AgentProfileJsonLd({ agentId, name, description, imageUrl }: AgentProfileJsonLdProps) {
  const profileUrl = absoluteUrl(`/agents/${encodeURIComponent(agentId)}`);

  const payload = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${name} · AI Poker Lab`,
    description,
    url: profileUrl,
    inLanguage: ["en", "zh-Hans"],
    mainEntity: {
      "@type": "Person",
      name,
      description,
      url: profileUrl,
      ...(imageUrl ? { image: imageUrl } : {}),
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
