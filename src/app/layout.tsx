import type { Metadata } from "next";
import { BottomNav } from "@/components/BottomNav";
import { MobileTopNav } from "@/components/MobileTopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Poker Lab",
  description: "Train AI poker players in a no-deposit lab with rewards and live tables",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <MobileTopNav />
        {children}
        <BottomNav />
        <footer className="siteFilingFooter">
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
