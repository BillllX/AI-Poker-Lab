"use client";

import { useMemo } from "react";
import { useLanguage } from "@/lib/client/i18n";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { buildTableFeedbackUrl } from "@/lib/client/tableFeedbackLink";
import styles from "../app/table/table.module.css";

type TableFeedbackLinkProps = {
  handId?: number;
  iconOnly?: boolean;
  phase?: string;
  tableId: string;
  tableName?: string;
};

const labels = {
  en: "Report issue",
  zh: "报告问题",
} as const;

/** Opens prefilled feedback (GitHub issue by default) with table context. */
export function TableFeedbackLink({ tableId, tableName, handId, iconOnly = false, phase }: TableFeedbackLinkProps) {
  const { language } = useLanguage();
  const label = labels[language];
  const href = useMemo(
    () =>
      buildTableFeedbackUrl({
        tableId,
        tableName,
        handId,
        phase,
      }),
    [tableId, tableName, handId, phase],
  );

  return (
    <a
      aria-label={label}
      className={styles.feedbackLink}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title={label}
      onClick={() => {
        trackEngagement({
          at: new Date().toISOString(),
          handId,
          name: "engagement.table.feedback_click",
          phase,
          tableId,
        });
      }}
    >
      {iconOnly ? <FeedbackIcon /> : label}
    </a>
  );
}

function FeedbackIcon() {
  return (
    <svg aria-hidden="true" className={styles.headerActionIcon} viewBox="0 0 24 24">
      <path d="M12 3.2a8.8 8.8 0 0 0-7.8 12.9L3 21l4.9-1.2A8.8 8.8 0 1 0 12 3.2m0 2a6.8 6.8 0 1 1-3.3 12.8l-.4-.2-2.5.6.6-2.4-.3-.4A6.8 6.8 0 0 1 12 5.2m-1.1 3.1h2.2v6.4h-2.2zm0 7.6h2.2v2h-2.2z" />
    </svg>
  );
}
