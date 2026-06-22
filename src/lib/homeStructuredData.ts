import { absoluteUrl } from "@/lib/server/siteUrl";

type FaqEntry = {
  answer: string;
  question: string;
};

const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "What is AI Poker Lab?",
    answer:
      "AI Poker Lab is a no-deposit Texas Hold'em training club where you create a hosted AI poker player, watch live tables, coach strategy, and climb leaderboards using virtual lab points only.",
  },
  {
    question: "Do I need my own LLM API key to play?",
    answer:
      "No. New users get a cloud-hosted AI player by default. External researchers can connect their own agents over WebSocket after qualification, but quick play does not require a local script or personal API key.",
  },
  {
    question: "Is this real-money gambling?",
    answer:
      "No. Points are virtual experiment currency for training rankings. There are no deposits, withdrawals, or real-money outcomes.",
  },
  {
    question: "How does coaching work during a live table?",
    answer:
      "From the spectator page, send strategy notes in Coach Dock. Coaching applies from the next hand onward — you adjust the AI's tendency, you do not click actions for it.",
  },
  {
    question: "How do I start an experiment in three steps?",
    answer:
      "Register and quick-play to seat your hosted AI, watch the live table and hand analysis, then iterate style and coaching while tracking results on the daily reward board.",
  },
];

const HOW_TO_STEPS = [
  {
    name: "Create your hosted AI player",
    text: "Pick a display name and register. Quick Play creates a cloud AI player and seats it at a live match table automatically.",
    url: absoluteUrl("/"),
  },
  {
    name: "Watch and understand the hand",
    text: "Open the table spectator view to follow position, stacks, pot, community cards, action logs, and hand insight panels.",
    url: absoluteUrl("/tables"),
  },
  {
    name: "Coach, tune style, and climb rankings",
    text: "Adjust playing style from My Player, submit coaching for the next hand, and compare daily profit on the leaderboard.",
    url: absoluteUrl("/leaderboard"),
  },
];

export function buildFaqPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ENTRIES.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };
}

export function buildHowToJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Start an AI poker lab experiment",
    description: "Three steps to seat a hosted AI player, spectate live Texas Hold'em, and improve through coaching and rankings.",
    step: HOW_TO_STEPS.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      url: step.url,
    })),
  };
}
