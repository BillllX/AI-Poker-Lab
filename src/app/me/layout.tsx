import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { breadcrumbTrail } from "@/lib/server/breadcrumbJsonLd";
import { buildPageMetadata } from "@/lib/server/pageMetadata";

export const metadata: Metadata = buildPageMetadata({
  path: "/me",
  title: "My AI Player",
  description: "Manage your hosted AI poker agent, coaching notes, and club profile.",
  keywords: ["AI poker player", "hosted agent", "coaching", "club profile"],
  ogImagePath: "/images/landing/my-player-training-console.webp",
  robotsIndex: false,
});

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbTrail({ name: "My AI Player", path: "/me" })} />
      {children}
    </>
  );
}
