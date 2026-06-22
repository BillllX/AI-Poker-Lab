"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  activityStripChangeEvent,
  dismissActivityStrip,
  getActivityStrip,
  isActivityStripDismissed,
  resolveActivityStripCtaLabel,
  resolveActivityStripMessage,
} from "@/lib/client/activityStrip";
import { pickOperationalCopy } from "@/lib/client/localizedCopy";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./ActivityStrip.module.css";

const HIDDEN_PREFIXES = ["/login"];

function subscribe(onStoreChange: () => void) {
  const eventName = activityStripChangeEvent();
  window.addEventListener(eventName, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(eventName, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getDismissSnapshot(stripId: string) {
  return isActivityStripDismissed(stripId);
}

function getServerDismissSnapshot() {
  return false;
}

export function ActivityStrip() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const config = getActivityStrip();

  const dismissed = useSyncExternalStore(
    subscribe,
    () => (config ? getDismissSnapshot(config.id) : true),
    getServerDismissSnapshot,
  );

  if (!config || dismissed) {
    return null;
  }

  if (HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  const message = resolveActivityStripMessage(language, config);
  const ctaLabel = resolveActivityStripCtaLabel(language, config);

  function handleDismiss() {
    dismissActivityStrip(config!.id);
    window.dispatchEvent(new Event(activityStripChangeEvent()));
  }

  function handleCtaClick() {
    trackEngagement({
      at: new Date().toISOString(),
      name: "engagement.activity_strip.click",
      stripId: config!.id,
    });
  }

  return (
    <aside
      aria-label={pickOperationalCopy(language, "uiActivityStripAria")}
      className={styles.strip}
      role="region"
    >
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        {config.ctaHref && ctaLabel ? (
          <Link className={styles.cta} href={config.ctaHref} onClick={handleCtaClick}>
            {ctaLabel}
          </Link>
        ) : null}
        <button
          aria-label={pickOperationalCopy(language, "uiDismissActivityStrip")}
          className={styles.dismiss}
          type="button"
          onClick={handleDismiss}
        >
          {pickOperationalCopy(language, "uiDismiss")}
        </button>
      </div>
    </aside>
  );
}
