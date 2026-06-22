"use client";

import dynamic from "next/dynamic";

export const LazyDailyTasksStrip = dynamic(
  () => import("@/components/DailyTasksStrip").then((mod) => ({ default: mod.DailyTasksStrip })),
  { ssr: false },
);
