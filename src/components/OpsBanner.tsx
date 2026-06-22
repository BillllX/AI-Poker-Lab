"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  dismissOpsBanner,
  getOpsBanner,
  getOpsBannerDismissSnapshot,
  getServerOpsBannerDismissSnapshot,
  resolveOpsBannerCtaLabel,
  resolveOpsBannerMessage,
  subscribeOpsBanner,
} from "@/lib/client/opsBanner";
import { pickOperationalCopy } from "@/lib/client/localizedCopy";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./OpsBanner.module.css";

function subscribe(onStoreChange: () => void) {
  return subscribeOpsBanner(onStoreChange);
}

function getDismissSnapshot() {
  return getOpsBannerDismissSnapshot();
}

type OpsBannerProps = {
  className?: string;
};

export function OpsBanner({ className }: OpsBannerProps) {
  const { language } = useLanguage();
  const config = getOpsBanner();

  const dismissed = useSyncExternalStore(
    subscribe,
    getDismissSnapshot,
    getServerOpsBannerDismissSnapshot,
  );

  if (!config || dismissed) {
    return null;
  }

  const message = resolveOpsBannerMessage(language, config);
  const ctaLabel = resolveOpsBannerCtaLabel(language, config);

  function handleDismiss() {
    dismissOpsBanner(config!.id);
  }

  return (
    <aside
      aria-label={pickOperationalCopy(language, "uiAnnouncementAria")}
      className={[styles.banner, className].filter(Boolean).join(" ")}
      role="region"
    >
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        {config.ctaHref && ctaLabel ? (
          <Link className={styles.cta} href={config.ctaHref}>
            {ctaLabel}
          </Link>
        ) : null}
        <button
          aria-label={pickOperationalCopy(language, "uiDismissAnnouncement")}
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
