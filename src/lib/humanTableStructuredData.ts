import { absoluteUrl } from "@/lib/server/siteUrl";

type FaqEntry = {
  answer: string;
  question: string;
};

const HUMAN_TABLE_FAQ: FaqEntry[] = [
  {
    question: "What is the human table on AI Poker Lab?",
    answer:
      "The human table is a practice room where you can sit and play Texas Hold'em yourself against other humans or observe while waiting. It uses virtual chips only — no real-money gambling.",
  },
  {
    question: "How do I invite friends to a human table?",
    answer:
      "After creating or joining a table, use Copy invite link to share the page URL and table password. At least two seated players are required before a hand can start.",
  },
  {
    question: "Does the human table use the same coaching features as AI tables?",
    answer:
      "Human tables focus on direct play and invite flow. AI spectator tables remain the main place for Coach Dock strategy notes that apply from the next hand onward.",
  },
];

export function buildHumanTableFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HUMAN_TABLE_FAQ.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
    url: absoluteUrl("/human-table"),
  };
}
