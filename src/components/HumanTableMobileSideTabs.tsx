"use client";

import { memo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import styles from "./HumanTableMobileSideTabs.module.css";

type HumanTableMobileSideTab = "log" | "review";

type HumanTableMobileSideTabsProps = {
  activeTab?: HumanTableMobileSideTab;
  copy: {
    tabLog: string;
    tabReview: string;
  };
  logPanel: ReactNode;
  onTabChange?: (tab: HumanTableMobileSideTab) => void;
  reviewPanel: ReactNode;
};

export const HumanTableMobileSideTabs = memo(function HumanTableMobileSideTabs({
  activeTab,
  copy,
  logPanel,
  onTabChange,
  reviewPanel,
}: HumanTableMobileSideTabsProps) {
  const [uncontrolledTab, setUncontrolledTab] = useState<HumanTableMobileSideTab>("log");
  const tab = activeTab ?? uncontrolledTab;

  function selectTab(nextTab: HumanTableMobileSideTab) {
    if (activeTab === undefined) {
      setUncontrolledTab(nextTab);
    }
    onTabChange?.(nextTab);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const nextTab = tab === "log" ? "review" : "log";
    selectTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(`human-table-side-tab-${nextTab}`)?.focus();
    });
  }

  return (
    <div className={styles.root}>
      <div aria-label={`${copy.tabLog} / ${copy.tabReview}`} className={styles.tabList} role="tablist" onKeyDown={handleTabKeyDown}>
        <button
          aria-controls="human-table-side-panel-log"
          aria-selected={tab === "log"}
          className={tab === "log" ? styles.tabActive : styles.tab}
          id="human-table-side-tab-log"
          onClick={() => selectTab("log")}
          role="tab"
          type="button"
        >
          {copy.tabLog}
        </button>
        <button
          aria-controls="human-table-side-panel-review"
          aria-selected={tab === "review"}
          className={tab === "review" ? styles.tabActive : styles.tab}
          id="human-table-side-tab-review"
          onClick={() => selectTab("review")}
          role="tab"
          type="button"
        >
          {copy.tabReview}
        </button>
      </div>

      <div
        aria-labelledby="human-table-side-tab-log"
        className={styles.tabPanel}
        hidden={tab !== "log"}
        id="human-table-side-panel-log"
        role="tabpanel"
      >
        {logPanel}
      </div>
      <div
        aria-labelledby="human-table-side-tab-review"
        className={styles.tabPanel}
        hidden={tab !== "review"}
        id="human-table-side-panel-review"
        role="tabpanel"
      >
        {reviewPanel}
      </div>
    </div>
  );
});
