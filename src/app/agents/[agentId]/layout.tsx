import type { Metadata } from "next";
import { AgentProfileJsonLd } from "@/components/AgentProfileJsonLd";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { hreflangForPath } from "@/lib/server/hreflangAlternates";
import { resolveAgentProfileById } from "@/lib/server/agentProfile";
import { breadcrumbTrail } from "@/lib/server/breadcrumbJsonLd";
import { absoluteUrl, getSiteOrigin } from "@/lib/server/siteUrl";

type AgentLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ agentId: string }>;
};

export async function generateMetadata({ params }: Pick<AgentLayoutProps, "params">): Promise<Metadata> {
  const { agentId } = await params;
  const origin = getSiteOrigin();
  const profile = await resolveAgentProfileById(agentId, origin);

  if (!profile) {
    return {
      title: "Agent Not Found",
      robots: { index: false, follow: false },
    };
  }

  const name = profile.identity?.ownerName ?? profile.agent.name;
  const model = profile.identity?.modelName ?? profile.agent.modelName;
  const status = profile.live.online ? profile.live.assignmentStatus : "offline";
  const description =
    profile.agent.strategy?.trim().slice(0, 155) ||
    `${name} is an AI poker agent on AI Poker Lab${model ? ` (${model})` : ""}. Status: ${status}.`;

  const agentPath = `/agents/${encodeURIComponent(profile.agent.id)}`;
  const { canonical, languages } = hreflangForPath(agentPath);
  const ogImage = absoluteUrl(`${agentPath}/opengraph-image`);

  return {
    title: name,
    description,
    keywords: ["AI poker agent", name, model ?? "Texas Hold'em", "leaderboard", "AI Poker Lab"].filter(Boolean),
    alternates: { canonical, languages },
    openGraph: {
      title: `${name} · AI Poker Lab`,
      description,
      url: canonical,
      type: "profile",
      alternateLocale: ["zh_CN"],
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${name} · AI Poker Lab` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} · AI Poker Lab`,
      description,
      images: [ogImage],
    },
  };
}

export default async function AgentLayout({ children, params }: AgentLayoutProps) {
  const { agentId } = await params;
  const profile = await resolveAgentProfileById(agentId, getSiteOrigin());
  const name = profile?.identity?.ownerName ?? profile?.agent.name;
  const model = profile?.identity?.modelName ?? profile?.agent.modelName;
  const status = profile?.live.online ? profile.live.assignmentStatus : "offline";
  const description =
    profile?.agent.strategy?.trim().slice(0, 155) ||
    (name
      ? `${name} is an AI poker agent on AI Poker Lab${model ? ` (${model})` : ""}. Status: ${status}.`
      : undefined);
  const ogImage = name ? absoluteUrl(`/agents/${encodeURIComponent(agentId)}/opengraph-image`) : undefined;

  return (
    <>
      {name && description ? (
        <AgentProfileJsonLd agentId={agentId} description={description} imageUrl={ogImage} name={name} />
      ) : null}
      {name ? (
        <BreadcrumbJsonLd
          items={breadcrumbTrail(
            { name: "Leaderboard", path: "/leaderboard" },
            { name, path: `/agents/${encodeURIComponent(agentId)}` },
          )}
        />
      ) : null}
      {children}
    </>
  );
}
