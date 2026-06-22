"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useFavoriteAgents } from "@/components/AgentFavoriteButton";
import {
  agentFavoritesChangeEvent,
  removeAgentFavorite,
} from "@/lib/client/agentFavorites";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { agentProfilePath, prefetchAppRoute } from "@/lib/client/prefetchTableRoutes";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./FavoriteAgentsPanel.module.css";

const copy = {
  zh: {
    eyebrow: "我的收藏",
    title: "关注的 AI 牌手",
    empty: "还没有收藏。在牌手主页点星标，把常看的 Agent 留在这里。",
    remove: "移除",
  },
  en: {
    eyebrow: "Saved players",
    title: "Favorite AI players",
    empty: "No saved players yet. Tap the star on an agent profile to pin them here.",
    remove: "Remove",
  },
} as const;

export function FavoriteAgentsPanel() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = copy[language];
  const favorites = useFavoriteAgents();

  const handleRemove = useCallback((agentId: string) => {
    removeAgentFavorite(agentId);
    window.dispatchEvent(new Event(agentFavoritesChangeEvent()));
  }, []);

  return (
    <section aria-label={t.title} className={styles.panel}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 className={styles.title}>{t.title}</h2>
      </div>
      {favorites.length > 0 ? (
        <ul className={styles.list}>
          {favorites.map((entry) => (
            <li className={styles.item} key={entry.id}>
              <div>
                <Link
                  className={styles.link}
                  href={agentProfilePath(entry.id)}
                  onClick={() => {
                    trackEngagement({
                      agentId: entry.id,
                      at: new Date().toISOString(),
                      name: "engagement.favorite.open",
                    });
                  }}
                  onMouseEnter={() => prefetchAppRoute(router, agentProfilePath(entry.id))}
                >
                  {entry.name}
                </Link>
                <span className={styles.meta}>{entry.id}</span>
              </div>
              <button className={styles.remove} type="button" onClick={() => handleRemove(entry.id)}>
                {t.remove}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{t.empty}</p>
      )}
    </section>
  );
}
