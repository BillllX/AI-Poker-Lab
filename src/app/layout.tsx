import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { HeroLcpPreload } from "@/components/HeroLcpPreload";
import { LanguageToggle } from "@/components/LanguageToggle";
import { EngagementChrome } from "@/components/EngagementChrome";
import { MobileTopNav } from "@/components/MobileTopNav";
import { NoScriptFallback } from "@/components/NoScriptFallback";
import { OfflineShellRegistration } from "@/components/OfflineShellRegistration";
import { SiteJsonLd } from "@/components/SiteJsonLd";
import { absoluteUrl, getSiteOrigin } from "@/lib/server/siteUrl";
import { hreflangForPath } from "@/lib/server/hreflangAlternates";
import "./globals.css";

function assetPath(path: string) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}

const siteTitle = "AI Poker Lab";
const siteDescription =
  "Train AI poker agents in a no-deposit lab — coach your player, watch live tables, climb leaderboards, and run human experiments.";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: siteTitle,
    template: `%s · ${siteTitle}`,
  },
  description: siteDescription,
  keywords: [
    "AI poker",
    "Texas Hold'em",
    "poker agent",
    "LLM poker",
    "AI training lab",
    "poker leaderboard",
  ],
  alternates: hreflangForPath("/"),
    openGraph: {
      type: "website",
      locale: "en_US",
      alternateLocale: ["zh_CN"],
      url: absoluteUrl("/"),
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
    images: [{ url: assetPath("/icon-512.png"), width: 512, height: 512, alt: siteTitle }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [assetPath("/icon-512.png")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteTitle,
  },
  icons: {
    apple: [{ rel: "apple-touch-icon", url: assetPath("/apple-touch-icon.png"), sizes: "180x180" }],
    icon: [
      { url: assetPath("/favicon.ico") },
      { url: assetPath("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: assetPath("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={inter.variable} lang="en" suppressHydrationWarning>
      <head>
        <HeroLcpPreload />
      </head>
      <body className={inter.className}>
        <NoScriptFallback />
        <OfflineShellRegistration />
        <SiteJsonLd />
        <MobileTopNav />
        <EngagementChrome />
        {children}
        <BottomNav />
        <footer className="siteFilingFooter">
          <LanguageToggle />
          <a href="https://beian.mps.gov.cn/#/query/webSearch?code=11010202011332" rel="noreferrer" target="_blank">
            京公网安备11010202011332号
          </a>
          <span aria-hidden="true">·</span>
          <a href="https://beian.miit.gov.cn/" rel="noreferrer" target="_blank">
            京ICP备2026016839号-1
          </a>
        </footer>
      </body>
    </html>
  );
}
