"use client";

import { memo, useCallback, useSyncExternalStore } from "react";
import styles from "./SpectatorSideTabs.module.css";

export type SpectatorSideTab = "log" | "coach" | "insight";

type SpectatorSideTabsCopy = {
  tabCoach: string;
  tabInsight: string;
  tabLog: string;
};

type SpectatorSideTabsProps = {
  tableId: string;
  copy: SpectatorSideTabsCopy;
  coachPanel: React.ReactNode;
  insightPanel: React.ReactNode;
  logPanel: React.ReactNode;
  insightReady?: boolean;
  coachAvailable?: boolean;
};

function storageKey(tableId: string) {
  return `spectator-side-tab:${tableId}`;
}

function readTab(tableId: string, fallback: SpectatorSideTab): SpectatorSideTab {
  if (typeof sessionStorage === "undefined") {
    return fallback;
  }
  const stored = sessionStorage.getItem(storageKey(tableId));
  if (stored === "coach" || stored === "insight" || stored === "log") {
    return stored;
  }
  return fallback;
}

export const SpectatorSideTabs = memo(function SpectatorSideTabs({
  tableId,
  copy,
  logPanel,
  coachPanel,
  insightPanel,
  insightReady = false,
  coachAvailable = false,
}: SpectatorSideTabsProps) {
  const defaultTab: SpectatorSideTab = coachAvailable ? "coach" : "log";
  const tab = useSyncExternalStore(
    useCallback((onStoreChange) => {
      const handler = () => onStoreChange();
      window.addEventListener("storage", handler);
      window.addEventListener("spectator-side-tab", handler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener("spectator-side-tab", handler);
      };
    }, []),
    () => readTab(tableId, defaultTab),
    () => defaultTab,
  );
  const coachTabClass = [
    tab === "coach" ? styles.tabActive : styles.tab,
    coachAvailable ? styles.coachTabReady : "",
  ]
    .filter(Boolean)
    .join(" ");

  function selectTab(next: SpectatorSideTab) {
    sessionStorage.setItem(storageKey(tableId), next);
    window.dispatchEvent(new Event("spectator-side-tab"));
  }

  return (
    <div className={styles.root}>
      <div aria-label={copy.tabLog} className={styles.tabList} role="tablist">
        <button
          aria-selected={tab === "log"}
          className={tab === "log" ? styles.tabActive : styles.tab}
          id="side-tab-log"
          role="tab"
          type="button"
          onClick={() => selectTab("log")}
        >
          {copy.tabLog}
        </button>
        <button
          aria-selected={tab === "coach"}
          className={coachTabClass}
          id="side-tab-coach"
          role="tab"
          type="button"
          onClick={() => selectTab("coach")}
        >
          {copy.tabCoach}
          {coachAvailable ? <span className={styles.dot} aria-hidden="true" /> : null}
        </button>
        <button
          aria-selected={tab === "insight"}
          className={tab === "insight" ? styles.tabActive : styles.tab}
          id="side-tab-insight"
          role="tab"
          type="button"
          onClick={() => selectTab("insight")}
        >
          {copy.tabInsight}
          {insightReady ? <span className={styles.dot} aria-hidden="true" /> : null}
        </button>
      </div>

      <div
        aria-labelledby="side-tab-log"
        className={styles.tabPanel}
        hidden={tab !== "log"}
        id="side-panel-log"
        role="tabpanel"
      >
        {logPanel}
      </div>
      <div
        aria-labelledby="side-tab-coach"
        className={styles.tabPanel}
        hidden={tab !== "coach"}
        id="side-panel-coach"
        role="tabpanel"
      >
        {coachPanel}
      </div>
      <div
        aria-labelledby="side-tab-insight"
        className={styles.tabPanel}
        hidden={tab !== "insight"}
        id="side-panel-insight"
        role="tabpanel"
      >
        {insightPanel}
      </div>
    </div>
  );
});
