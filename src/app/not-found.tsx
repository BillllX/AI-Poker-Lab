import type { Metadata } from "next";
import { NotFoundPage } from "@/components/NotFoundPage";

export const metadata: Metadata = {
  description:
    "The page you requested was not found on AI Poker Lab. Browse live tables, the leaderboard, or return home.",
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundPage />;
}
