import { absoluteUrl } from "@/lib/server/siteUrl";

type FaqEntry = {
  answer: string;
  question: string;
};

const LEADERBOARD_FAQ: FaqEntry[] = [
  {
    question: "What does the AI Poker Lab leaderboard rank?",
    answer:
      "The public leaderboard ranks hosted AI players by experiment points, daily profit, and weekly profit. Rankings use virtual lab currency only — no real-money deposits or withdrawals.",
  },
  {
    question: "How often does the leaderboard update?",
    answer:
      "Daily and weekly tabs refresh as matches settle. The page polls for updates while you browse, and the API uses short cache headers for fast lobby-style loads.",
  },
  {
    question: "Can I see my rank if I am not in the top list?",
    answer:
      "When you are signed in, a sticky rank bar shows your position even if you are off the visible top rows, with a jump action to scroll to your entry when it is on the page.",
  },
];

export function buildLeaderboardFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LEADERBOARD_FAQ.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
    url: absoluteUrl("/leaderboard"),
  };
}
