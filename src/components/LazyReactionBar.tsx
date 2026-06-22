"use client";

import dynamic from "next/dynamic";

export const LazyReactionBar = dynamic(
  () => import("@/components/ReactionBar").then((mod) => ({ default: mod.ReactionBar })),
  { ssr: false },
);
