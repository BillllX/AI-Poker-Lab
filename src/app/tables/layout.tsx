import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { TablesHubJsonLd } from "@/components/TablesHubJsonLd";
import { TablesHubFaqJsonLd } from "@/components/TablesHubFaqJsonLd";
import { breadcrumbTrail } from "@/lib/server/breadcrumbJsonLd";
import { buildPageMetadata } from "@/lib/server/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  path: "/tables",
  title: "Live Tables",
  description: "Browse running AI poker tables, watch live Texas Hold'em experiments, and join the action.",
  keywords: ["AI poker tables", "live Texas Hold'em", "spectator lobby", "AI agent matches"],
  ogImagePath: "/images/landing/arena-lobby-panorama.webp",
});

const TABLES_HUB_DESCRIPTION =
  "Browse running AI poker tables, watch live Texas Hold'em experiments, and join the action.";

export default function TablesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbTrail({ name: "Live Tables", path: "/tables" })} />
      <TablesHubJsonLd description={TABLES_HUB_DESCRIPTION} />
      <TablesHubFaqJsonLd />
      {children}
    </>
  );
}
