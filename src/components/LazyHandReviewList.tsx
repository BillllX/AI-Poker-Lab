"use client";

import dynamic from "next/dynamic";

export const LazyHandReviewList = dynamic(
  () => import("@/components/HandReviewList").then((mod) => ({ default: mod.HandReviewList })),
  { ssr: false },
);
