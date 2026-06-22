"use client";

import dynamic from "next/dynamic";

export const LazySpectatorActionLogList = dynamic(
  () => import("@/components/SpectatorActionLogList").then((mod) => ({ default: mod.SpectatorActionLogList })),
  { ssr: false },
);
