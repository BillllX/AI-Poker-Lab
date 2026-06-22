"use client";

import dynamic from "next/dynamic";

export const LazyDailyCheckInStrip = dynamic(
  () => import("@/components/DailyCheckInStrip").then((mod) => ({ default: mod.DailyCheckInStrip })),
  { ssr: false },
);
