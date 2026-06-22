"use client";

import { memo, useMemo } from "react";
import type { ActionLog } from "@/lib/poker/types";
import { capSpectatorLogs } from "@/lib/client/spectatorLogs";
import styles from "@/app/table/table.module.css";

type SpectatorActionLogListCopy = {
  logCapHint: string;
  noActions: string;
  recentActions: string;
};

type SpectatorActionLogListProps = {
  copy: SpectatorActionLogListCopy;
  highlightHandId?: number;
  logs: ActionLog[];
  myPlayerName?: string;
};

export const SpectatorActionLogList = memo(function SpectatorActionLogList({
  copy,
  highlightHandId,
  logs,
  myPlayerName,
}: SpectatorActionLogListProps) {
  const { logs: visibleLogs, hiddenCount } = useMemo(
    () => capSpectatorLogs(logs, { highlightHandId }),
    [highlightHandId, logs],
  );

  return (
    <section className={styles.panel} id="hand-action-logs">
      <h2>{copy.recentActions}</h2>
      <div
        className={styles.logList}
        id="hand-action-log-list"
        tabIndex={highlightHandId !== undefined ? -1 : undefined}
      >
        {visibleLogs.map((log) => (
          <article
            className={[
              styles.logItem,
              highlightHandId !== undefined && log.handId === highlightHandId ? styles.logItemCurrentHand : "",
              myPlayerName && log.message.includes(myPlayerName) ? styles.logItemMine : "",
            ].filter(Boolean).join(" ")}
            key={log.id}
          >
            <time>{new Date(log.createdAt).toLocaleTimeString()}</time>
            <span>{log.message}</span>
          </article>
        ))}
        {!visibleLogs.length ? <p className={styles.muted}>{copy.noActions}</p> : null}
      </div>
      {hiddenCount > 0 ? (
        <p className={styles.logCapHint}>
          {copy.logCapHint
            .replace("{shown}", String(visibleLogs.length))
            .replace("{hidden}", String(hiddenCount))}
        </p>
      ) : null}
    </section>
  );
});
