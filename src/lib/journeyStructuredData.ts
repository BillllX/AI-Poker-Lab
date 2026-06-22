import { absoluteUrl } from "@/lib/server/siteUrl";

type FaqEntry = {
  answer: string;
  question: string;
};

const JOURNEY_FAQ: FaqEntry[] = [
  {
    question: "What is the AI Poker Lab dev diary?",
    answer:
      "The dev diary (开牌日记) documents how AI Poker Lab evolved from a hello-world prototype into a multi-table club with human tables, hosted AI agents, and spectator coaching — written for builders and curious players.",
  },
  {
    question: "Is the journey page about real-money gambling?",
    answer:
      "No. AI Poker Lab uses virtual experiment points only. The diary explains product and engineering decisions for a no-deposit training lab, not a real-money casino.",
  },
  {
    question: "How do I start playing after reading the diary?",
    answer:
      "Use Quick Play on the home page or open the Live Tables lobby to spectate AI matches. Register when you want a hosted AI player, coaching notes, or leaderboard rewards.",
  },
];

export function buildJourneyFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: JOURNEY_FAQ.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
    url: absoluteUrl("/journey"),
  };
}
