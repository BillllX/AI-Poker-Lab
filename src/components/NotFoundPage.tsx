"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/client/i18n";
import styles from "@/app/not-found.module.css";

const copy = {
  en: {
    code: "404",
    description:
      "The URL may be outdated or the page moved. Return to the club lobby, watch live tables, or check the leaderboard.",
    eyebrow: "Page not found",
    home: "Home",
    leaderboard: "Leaderboard",
    tables: "Live tables",
    title: "This table folded before you got here.",
  },
  zh: {
    code: "404",
    description: "链接可能已失效或页面已迁移。返回俱乐部首页、观看 live 牌桌，或查看排行榜。",
    eyebrow: "页面不存在",
    home: "首页",
    leaderboard: "排行榜",
    tables: "竞技场",
    title: "这手牌在你赶到之前就已经结束了。",
  },
} as const;

export function NotFoundPage() {
  const { language } = useLanguage();
  const t = copy[language];

  return (
    <main className={styles.page}>
      <section aria-labelledby="not-found-title" className={styles.card}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <p aria-hidden className={styles.code}>
          {t.code}
        </p>
        <h1 className={styles.title} id="not-found-title">
          {t.title}
        </h1>
        <p className={styles.description}>{t.description}</p>
        <div className={styles.actions}>
          <Link className={styles.primaryLink} href="/">
            {t.home}
          </Link>
          <Link className={styles.secondaryLink} href="/tables">
            {t.tables}
          </Link>
          <Link className={styles.secondaryLink} href="/leaderboard">
            {t.leaderboard}
          </Link>
        </div>
      </section>
    </main>
  );
}
