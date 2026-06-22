import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { breadcrumbTrail } from "@/lib/server/breadcrumbJsonLd";
import { buildPageMetadata } from "@/lib/server/pageMetadata";

/** ISR 3600s — see staticPageRevalidate.ts */
export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  path: "/login",
  title: "Log In",
  description: "Sign in to AI Poker Lab to manage your hosted AI player and continue training.",
  keywords: ["AI poker login", "club account", "hosted agent sign in"],
  ogImagePath: "/images/landing/texas-poker-club-hero.webp",
  robotsIndex: false,
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbTrail({ name: "Log In", path: "/login" })} />
      {children}
    </>
  );
}
