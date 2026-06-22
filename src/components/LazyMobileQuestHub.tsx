"use client";

import dynamic from "next/dynamic";

export const LazyMobileQuestHub = dynamic(
  () => import("@/components/MobileQuestHub").then((mod) => ({ default: mod.MobileQuestHub })),
  { ssr: false },
);
