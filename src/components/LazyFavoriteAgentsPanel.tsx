"use client";

import dynamic from "next/dynamic";

export const LazyFavoriteAgentsPanel = dynamic(
  () => import("@/components/FavoriteAgentsPanel").then((mod) => ({ default: mod.FavoriteAgentsPanel })),
  { ssr: false },
);
