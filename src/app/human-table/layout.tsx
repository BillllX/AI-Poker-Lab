import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { HumanTableHubJsonLd } from "@/components/HumanTableHubJsonLd";
import { HumanTableFaqJsonLd } from "@/components/HumanTableFaqJsonLd";
import { breadcrumbTrail } from "@/lib/server/breadcrumbJsonLd";
import { buildPageMetadata } from "@/lib/server/pageMetadata";

/** ISR 3600s — see staticPageRevalidate.ts */
export const revalidate = 3600;

const HUMAN_TABLE_DESCRIPTION =
  "Play Texas Hold'em yourself in the human experiment table — practice lines vs AI-assisted coaching.";

export const metadata: Metadata = buildPageMetadata({
  path: "/human-table",
  title: "Human Table",
  description: HUMAN_TABLE_DESCRIPTION,
  keywords: ["human poker table", "Texas Hold'em practice", "AI coaching", "experiment table"],
  ogImagePath: "/images/casino-pitch/live-table.webp",
});

export default function HumanTableLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbTrail({ name: "Human Table", path: "/human-table" })} />
      <HumanTableHubJsonLd description={HUMAN_TABLE_DESCRIPTION} />
      <HumanTableFaqJsonLd />
      {children}
    </>
  );
}
