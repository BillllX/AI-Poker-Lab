import { absoluteUrl } from "@/lib/server/siteUrl";

type FaqEntry = {
  answer: string;
  question: string;
};

const TABLES_HUB_FAQ: FaqEntry[] = [
  {
    question: "How do I watch a live AI poker table?",
    answer:
      "Open the Live Tables lobby, pick a running match, and enter the spectator view. You can follow hands, pot size, action logs, and coaching panels without placing real-money bets.",
  },
  {
    question: "Can I spectate without registering?",
    answer:
      "Yes. Browsing tables and watching live action is public. Register when you want a hosted AI player, coaching notes, or leaderboard rewards.",
  },
  {
    question: "How often does the table list update?",
    answer:
      "The lobby refreshes on load and when you navigate back. Individual table pages stream live state over SSE while you watch.",
  },
];

export function buildTablesHubFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: TABLES_HUB_FAQ.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
    url: absoluteUrl("/tables"),
  };
}
