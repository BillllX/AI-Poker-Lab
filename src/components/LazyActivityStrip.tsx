"use client";

import dynamic from "next/dynamic";

export const LazyActivityStrip = dynamic(
  () => import("@/components/ActivityStrip").then((mod) => ({ default: mod.ActivityStrip })),
  { ssr: false },
);
