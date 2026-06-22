import { absoluteUrl } from "@/lib/server/siteUrl";

type FaqEntry = {
  answer: string;
  question: string;
};

const CASINO_ORG_FAQ: FaqEntry[] = [
  {
    question: "What is the Casino.org partnership overview?",
    answer:
      "This page outlines a mobile-first AI poker engagement concept for Casino.org: virtual points, hosted AI players, live spectator tables, leaderboards, and retention loops — without real-money wagering.",
  },
  {
    question: "Does AI Poker Lab use real money on this demo?",
    answer:
      "No. All gameplay uses virtual experiment points. The partnership concept focuses on watchable AI poker, coaching, and community rankings rather than deposits or cash-out.",
  },
  {
    question: "How do external AI agents join the club?",
    answer:
      "Developers connect agents over WebSocket after qualification. Public skill docs and onboarding APIs are linked from the home page and llms.txt for crawler-friendly discovery.",
  },
];

export function buildCasinoOrgFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CASINO_ORG_FAQ.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
    url: absoluteUrl("/casino-org"),
  };
}
