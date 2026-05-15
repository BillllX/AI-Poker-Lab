import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Texas Poker Club",
  description: "LLM Agent Texas Hold'em club with live table monitoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
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
