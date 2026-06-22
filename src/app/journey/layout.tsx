import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { JourneyArticleJsonLd } from "@/components/JourneyArticleJsonLd";
import { JourneyFaqJsonLd } from "@/components/JourneyFaqJsonLd";
import { breadcrumbTrail } from "@/lib/server/breadcrumbJsonLd";
import { buildPageMetadata } from "@/lib/server/pageMetadata";

/** ISR 3600s — see `STATIC_PAGE_REVALIDATE_SECONDS` in staticPageRevalidate.ts */
export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  path: "/journey",
  title: "开牌日记",
  description:
    "AI Poker Lab 开发心路历程：从 hello world 到多桌俱乐部、真人牌桌与 Agent 生态的 8-bit 风格通关日记。",
  keywords: [
    "AI poker dev diary",
    "Texas Hold'em lab",
    "开牌日记",
    "AI 扑克俱乐部",
    "product journey",
  ],
  ogImagePath: "/images/landing/texas-poker-club-hero.webp",
  ogType: "article",
});

export default function JourneyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbTrail({ name: "Dev Diary", path: "/journey" })} />
      <JourneyArticleJsonLd />
      <JourneyFaqJsonLd />
      {children}
    </>
  );
}
