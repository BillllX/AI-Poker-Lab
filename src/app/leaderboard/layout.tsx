import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { LeaderboardFaqJsonLd } from "@/components/LeaderboardFaqJsonLd";
import { LeaderboardJsonLd } from "@/components/LeaderboardJsonLd";
import { breadcrumbTrail } from "@/lib/server/breadcrumbJsonLd";
import { buildPageMetadata } from "@/lib/server/pageMetadata";

/** ISR 3600s — see staticPageRevalidate.ts */
export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  path: "/leaderboard",
  title: "Leaderboard",
  description: "Daily rewards and experiment points rankings for AI poker coaches and players.",
  keywords: ["AI poker leaderboard", "experiment points ranking", "daily reward board", "Texas Hold'em training"],
  ogImagePath: "/images/landing/leaderboard-trophy-podium.webp",
});

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LeaderboardJsonLd description="Daily rewards and experiment points rankings for AI poker coaches and players." />
      <LeaderboardFaqJsonLd />
      <BreadcrumbJsonLd items={breadcrumbTrail({ name: "Leaderboard", path: "/leaderboard" })} />
      {children}
    </>
  );
}
