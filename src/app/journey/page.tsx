import { readFileSync } from "node:fs";
import path from "node:path";
import styles from "./journey.module.css";

const contentHtml = readFileSync(path.join(process.cwd(), "src/app/journey/content.html"), "utf8");

export default function JourneyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.wrap} dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </main>
  );
}
