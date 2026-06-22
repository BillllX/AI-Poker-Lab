"use client";

import { useEffect, useState } from "react";
import { EngagementChromeErrorBoundary } from "@/components/EngagementChromeErrorBoundary";
import { LazyActivityStrip } from "@/components/LazyActivityStrip";
import { LazyDailyTasksStrip } from "@/components/LazyDailyTasksStrip";
import { LazyMobileQuestHub } from "@/components/LazyMobileQuestHub";

const MOBILE_MAX_WIDTH = 640;

function useIsMobileViewport() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return mobile;
}

/** Global engagement strips — isolated from page content via error boundaries. */
export function EngagementChrome() {
  const isMobile = useIsMobileViewport();

  return (
    <>
      <EngagementChromeErrorBoundary>
        <LazyActivityStrip />
      </EngagementChromeErrorBoundary>
      <EngagementChromeErrorBoundary>
        <LazyMobileQuestHub />
      </EngagementChromeErrorBoundary>
      {!isMobile ? (
        <EngagementChromeErrorBoundary>
          <LazyDailyTasksStrip />
        </EngagementChromeErrorBoundary>
      ) : null}
    </>
  );
}
