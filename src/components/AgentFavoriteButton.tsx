"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  agentFavoritesChangeEvent,
  isAgentFavorite,
  listFavoriteAgents,
  toggleAgentFavorite,
} from "@/lib/client/agentFavorites";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./AgentFavoriteButton.module.css";

function subscribe(onStoreChange: () => void) {
  const eventName = agentFavoritesChangeEvent();
  window.addEventListener(eventName, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(eventName, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

type AgentFavoriteButtonProps = {
  agentId: string;
  agentName: string;
  className?: string;
};

export function AgentFavoriteButton({ agentId, agentName, className }: AgentFavoriteButtonProps) {
  const { language } = useLanguage();
  const favorited = useSyncExternalStore(
    subscribe,
    () => isAgentFavorite(agentId),
    () => false,
  );

  const label = favorited
    ? language === "zh"
      ? "已收藏"
      : "Saved"
    : language === "zh"
      ? "收藏牌手"
      : "Save player";

  const handleToggle = useCallback(() => {
    const next = toggleAgentFavorite(agentId, agentName);
    trackEngagement({
      agentId,
      at: new Date().toISOString(),
      favorited: next,
      name: "engagement.favorite.toggle",
    });
    window.dispatchEvent(new Event(agentFavoritesChangeEvent()));
  }, [agentId, agentName]);

  return (
    <button
      aria-label={label}
      aria-pressed={favorited}
      className={[styles.favoriteButton, favorited ? styles.favoriteButtonActive : "", className]
        .filter(Boolean)
        .join(" ")}
      type="button"
      onClick={handleToggle}
    >
      {favorited ? "★" : "☆"} {label}
    </button>
  );
}

export function useFavoriteAgents() {
  return useSyncExternalStore(subscribe, listFavoriteAgents, () => []);
}
