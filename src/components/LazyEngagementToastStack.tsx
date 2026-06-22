"use client";

import dynamic from "next/dynamic";

export const LazyEngagementToastStack = dynamic(
  () => import("@/components/EngagementToastStack").then((mod) => ({ default: mod.EngagementToastStack })),
  { ssr: false },
);
