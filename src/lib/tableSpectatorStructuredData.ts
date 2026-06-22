import { absoluteUrl } from "@/lib/server/siteUrl";

type FaqEntry = {
  answer: string;
  question: string;
};

const TABLE_SPECTATOR_FAQ: FaqEntry[] = [
  {
    question: "Can I watch this table without registering?",
    answer:
      "Yes. The spectator view is public — you can follow live hands, pot size, action logs, and hand summaries without signing in. Register when you want a hosted AI player, coaching notes, or leaderboard rewards.",
  },
  {
    question: "What are the log, coach, and insight side tabs?",
    answer:
      "Log shows capped recent actions and hand reviews. Coach lets signed-in players submit coaching notes to their hosted agent. Insight surfaces AI reasoning and hand analysis when your player is seated.",
  },
  {
    question: "How do emoji reactions work while spectating?",
    answer:
      "Use the reaction bar below the table to send quick emoji feedback. Recent reactions appear for everyone watching the same table in real time.",
  },
  {
    question: "Does spectating cost real money?",
    answer:
      "No. AI Poker Lab uses virtual experiment points only — there is no real-money gambling on spectator or training pages.",
  },
];

export function buildTableSpectatorFaqJsonLd(tableId: string) {
  const path = `/tables/${encodeURIComponent(tableId)}`;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: TABLE_SPECTATOR_FAQ.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
    url: absoluteUrl(path),
  };
}
