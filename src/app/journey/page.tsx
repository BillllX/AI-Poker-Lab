import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import styles from "./journey.module.css";

export const metadata: Metadata = {
  title: "AI Poker Lab · 开牌日记",
  description: "从 hello 到俱乐部通关的 8-bit 心路历程",
};

const contentHtml = readFileSync(path.join(process.cwd(), "src/app/journey/content.html"), "utf8");

export default function JourneyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.wrap} dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </main>
  );
}
