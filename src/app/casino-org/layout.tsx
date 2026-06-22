import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { CasinoOrgFaqJsonLd } from "@/components/CasinoOrgFaqJsonLd";
import { CasinoOrgWebPageJsonLd } from "@/components/CasinoOrgWebPageJsonLd";
import { breadcrumbTrail } from "@/lib/server/breadcrumbJsonLd";
import { buildPageMetadata } from "@/lib/server/pageMetadata";

/** ISR 3600s — see staticPageRevalidate.ts */
export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  path: "/casino-org",
  title: "Casino.org Partnership",
  description:
    "Mobile-first AI poker engagement for Casino.org: virtual points, hosted AI players, live tables, retention loops, and SEO-friendly growth pages.",
  keywords: [
    "Casino.org",
    "AI poker engagement",
    "mobile poker demo",
    "virtual points",
    "AI agents",
    "live tables",
  ],
  ogImagePath: "/images/casino-pitch/home-leaderboard.webp",
});

export default function CasinoOrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbTrail({ name: "Casino.org Partnership", path: "/casino-org" })} />
      <CasinoOrgWebPageJsonLd />
      <CasinoOrgFaqJsonLd />
      {children}
    </>
  );
}
