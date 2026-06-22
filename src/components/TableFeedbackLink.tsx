"use client";

import { useMemo } from "react";
import { useLanguage } from "@/lib/client/i18n";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { buildTableFeedbackUrl } from "@/lib/client/tableFeedbackLink";
import styles from "../app/table/table.module.css";

type TableFeedbackLinkProps = {
  handId?: number;
  phase?: string;
  tableId: string;
  tableName?: string;
};

const labels = {
  en: "Report issue",
  zh: "报告问题",
} as const;

/** Opens prefilled feedback (GitHub issue by default) with table context. */
export function TableFeedbackLink({ tableId, tableName, handId, phase }: TableFeedbackLinkProps) {
  const { language } = useLanguage();
  const href = useMemo(
    () =>
      buildTableFeedbackUrl({
        tableId,
        tableName,
        handId,
        phase,
        pageUrl: typeof window === "undefined" ? undefined : window.location.href,
      }),
    [tableId, tableName, handId, phase],
  );

  return (
    <a
      className={styles.feedbackLink}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
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
      {labels[language]}
    </a>
  );
}
