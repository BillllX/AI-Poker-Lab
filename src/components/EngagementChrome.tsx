"use client";

import { useEffect, useRef, useState } from "react";
import { EngagementChromeErrorBoundary } from "@/components/EngagementChromeErrorBoundary";
import { LazyActivityStrip } from "@/components/LazyActivityStrip";
import { LazyDailyTasksStrip } from "@/components/LazyDailyTasksStrip";
import { LazyMobileQuestHub } from "@/components/LazyMobileQuestHub";
import { withBasePath } from "@/lib/client/basePath";
import { setCurrentStorageUserId } from "@/lib/client/userScopedStorage";

const MOBILE_MAX_WIDTH = 640;
const authChangedEvent = "texas-poker-auth-changed";

type SessionUser = {
  id: string;
  name: string;
};

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

/** undefined = loading, null = guest, object = signed in */
function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const requestId = ++requestSeqRef.current;
      try {
        const response = await fetch(withBasePath("/api/users/me"), { cache: "no-store" });
        const payload = await response.json();
        if (cancelled || requestId !== requestSeqRef.current) {
          return;
        }
        const nextUser = response.ok ? payload.user ?? null : null;
        setUser((current) =>
          current?.id === nextUser?.id && current?.name === nextUser?.name ? current : nextUser,
        );
      } catch {
        if (cancelled || requestId !== requestSeqRef.current) {
          return;
        }
        setUser((current) => (current === null ? current : null));
      }
    }

    void loadSession();
    window.addEventListener("focus", loadSession);
    window.addEventListener(authChangedEvent, loadSession);
    return () => {
      cancelled = true;
      requestSeqRef.current += 1;
      window.removeEventListener("focus", loadSession);
      window.removeEventListener(authChangedEvent, loadSession);
    };
  }, []);

  return user;
}

/** Global engagement strips — isolated from page content via error boundaries. */
export function EngagementChrome() {
  const isMobile = useIsMobileViewport();
  const sessionUser = useSessionUser();
  const showQuestChrome = sessionUser != null;

  useEffect(() => {
    if (sessionUser === undefined) {
      setCurrentStorageUserId(null);
      return;
    }
    setCurrentStorageUserId(sessionUser?.id ?? null);
  }, [sessionUser]);

  return (
    <>
      <EngagementChromeErrorBoundary>
        <LazyActivityStrip />
      </EngagementChromeErrorBoundary>
      {showQuestChrome ? (
        <EngagementChromeErrorBoundary>
          <LazyMobileQuestHub />
        </EngagementChromeErrorBoundary>
      ) : null}
      {showQuestChrome && !isMobile ? (
        <EngagementChromeErrorBoundary>
          <LazyDailyTasksStrip />
        </EngagementChromeErrorBoundary>
      ) : null}
    </>
  );
}
