"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { isCoachingNote, resolveCoachingDisplayMessage } from "@/lib/coachingNoteDisplay";
import { FormFieldError, FormFieldHint } from "@/components/FormFieldMessage";
import { incrementCoachingSubmissionTotal } from "@/lib/client/coachingMilestones";
import {
  readCoachDockCollapsed,
  subscribeCoachDockCollapse,
  writeCoachDockCollapsed,
} from "@/lib/client/coachDockCollapse";
import { getCoachingStreak, recordCoachingSubmission } from "@/lib/client/coachingStreak";
import {
  DAILY_TASKS_COMPLETE_COPY,
  getDailyTasksProgress,
  recordDailyCoachingSubmission,
} from "@/lib/client/dailyTasks";
import { useLanguage } from "@/lib/client/i18n";
import { pushEngagementToast } from "@/lib/client/engagementToast";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { withBasePath } from "@/lib/client/basePath";
import { liveRegionProps } from "@/lib/client/liveRegion";
import { prefersReducedMotion } from "@/lib/client/motionPreference";
import styles from "@/app/table/table.module.css";

type CoachingNote = {
  id: string;
  message: string;
  displayMessage?: string;
  sourceType?: string;
  createdAt: string;
  appliesFromHandId?: number;
};

type CoachDockCopy = {
  title: string;
  hint: string;
  placeholder: string;
  submit: string;
  submitting: string;
  appliedFromHand: (handId: number) => string;
  recentTitle: string;
  loginRequired: string;
  failed: string;
  noCoachingHistory: string;
  coachingHistoryLoading: string;
  coachingHistoryLoadFailed: string;
  coachingStreakActive: string;
  coachingStreakProgress: (count: number, target: number) => string;
  coachingMilestoneToast: (count: number) => string;
  coachingStreakMilestoneToast: string;
  collapse: string;
  expand: string;
  collapsedSummary: string;
};

type CoachDockProps = {
  agentId: string;
  tableId: string;
  currentHandId: number;
  coachingStreakVersion?: number;
  copy: CoachDockCopy;
  onCoachingApplied?: (handId: number) => void;
};

export function CoachDock({ agentId, tableId, currentHandId, coachingStreakVersion = 0, copy, onCoachingApplied }: CoachDockProps) {
  const { language } = useLanguage();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "alert" | "status"; message: string }>();
  const [history, setHistory] = useState<CoachingNote[]>([]);
  const [historyLoadState, setHistoryLoadState] = useState<"error" | "loading" | "ready">("loading");
  const [submitCount, setSubmitCount] = useState(0);
  void coachingStreakVersion;
  void submitCount;
  const streak = getCoachingStreak(tableId);
  const collapsed = useSyncExternalStore(
    subscribeCoachDockCollapse,
    readCoachDockCollapsed,
    () => false,
  );

  const setCollapsed = useCallback((next: boolean) => {
    writeCoachDockCollapsed(next);
  }, []);

  useEffect(() => {
    function revealCoachDockFromHash() {
      if (window.location.hash !== "#coach-dock") {
        return;
      }
      setCollapsed(false);
      requestAnimationFrame(() => {
        document.getElementById("coach-dock")?.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        });
      });
    }

    revealCoachDockFromHash();
    window.addEventListener("hashchange", revealCoachDockFromHash);
    return () => window.removeEventListener("hashchange", revealCoachDockFromHash);
  }, [setCollapsed]);

  const refreshHistory = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setHistoryLoadState("loading");
    }
    try {
      const params = new URLSearchParams({ agentId, tableId });
      const response = await fetch(withBasePath(`/api/agents/runtime-instructions?${params.toString()}`), { cache: "no-store" });
      if (!response.ok) {
        setHistoryLoadState((current) => (current === "ready" ? "ready" : "error"));
        return;
      }
      const payload = await response.json();
      const notes = Array.isArray(payload.notes) ? payload.notes : [];
      const coachingNotes = notes
        .filter((note: CoachingNote) => typeof note.message === "string" && isCoachingNote(note))
        .slice(-3)
        .reverse();
      setHistory(coachingNotes);
      setHistoryLoadState("ready");
    } catch {
      setHistoryLoadState((current) => (current === "ready" ? "ready" : "error"));
    }
  }, [agentId, tableId]);

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      setHistoryLoadState("loading");
      try {
        const params = new URLSearchParams({ agentId, tableId });
        const response = await fetch(withBasePath(`/api/agents/runtime-instructions?${params.toString()}`), { cache: "no-store" });
        if (!active) {
          return;
        }
        if (!response.ok) {
          setHistoryLoadState("error");
          return;
        }
        const payload = await response.json();
        const notes = Array.isArray(payload.notes) ? payload.notes : [];
        const coachingNotes = notes
          .filter((note: CoachingNote) => typeof note.message === "string" && isCoachingNote(note))
          .slice(-3)
          .reverse();
        setHistory(coachingNotes);
        setHistoryLoadState("ready");
      } catch {
        if (active) {
          setHistoryLoadState("error");
        }
      }
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, [agentId, tableId, currentHandId]);

  async function submitCoaching(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setBusy(true);
    setStatus(undefined);
    try {
      const response = await fetch(withBasePath("/api/users/me/agent/coaching"), {
        body: JSON.stringify({ message: trimmed, tableId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus({ kind: "alert", message: payload.error ?? copy.failed });
        return;
      }
      const appliesFromHandId = typeof payload.appliesFromHandId === "number" ? payload.appliesFromHandId : currentHandId + 1;
      setStatus({ kind: "status", message: copy.appliedFromHand(appliesFromHandId) });
      onCoachingApplied?.(appliesFromHandId);
      trackEngagement({
        appliesFromHandId,
        at: new Date().toISOString(),
        handId: currentHandId,
        name: "engagement.coaching.submit",
        tableId,
      });
      const streakResult = recordCoachingSubmission(tableId, currentHandId);
      const dailyTasksBefore = getDailyTasksProgress();
      recordDailyCoachingSubmission();
      const dailyTasksAfter = getDailyTasksProgress();
      if (dailyTasksAfter.complete && !dailyTasksBefore.complete) {
        trackEngagement({
          at: new Date().toISOString(),
          name: "engagement.daily_tasks.complete",
        });
        pushEngagementToast({
          expiresMs: 6500,
          id: `daily-tasks-complete-coaching-${tableId}-${currentHandId}`,
          kind: "coaching",
          message: DAILY_TASKS_COMPLETE_COPY[language],
        });
      }
      const totalResult = incrementCoachingSubmissionTotal();
      setSubmitCount((count) => count + 1);
      if (streakResult.newlyActive) {
        trackEngagement({
          at: new Date().toISOString(),
          count: streakResult.count,
          handId: currentHandId,
          name: "engagement.coaching.streak_active",
          tableId,
        });
        pushEngagementToast({
          expiresMs: 6500,
          id: `coaching-streak-${tableId}-${currentHandId}`,
          kind: "coaching",
          message: copy.coachingStreakMilestoneToast,
        });
      } else if (totalResult.milestone !== undefined) {
        pushEngagementToast({
          expiresMs: 6500,
          id: `coaching-milestone-${totalResult.milestone}`,
          kind: "coaching",
          message: copy.coachingMilestoneToast(totalResult.milestone),
        });
      }
      setMessage("");
      await refreshHistory({ silent: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`${styles.panel} ${styles.coachingPanel} ${collapsed ? styles.coachingPanelCollapsed : ""}`}
      id="coach-dock"
    >
      <div className={styles.coachingPanelHeader}>
        <h2>{copy.title}</h2>
        <div className={styles.coachingPanelHeaderActions}>
          {streak.activeCoach ? (
            <span className={styles.coachingStreakBadge} {...liveRegionProps("status")}>
              {copy.coachingStreakActive}
            </span>
          ) : streak.count > 0 ? (
            <span className={styles.coachingStreakProgress}>{copy.coachingStreakProgress(streak.count, streak.target)}</span>
          ) : null}
          <button
            aria-expanded={!collapsed}
            className={styles.coachingCollapseToggle}
            type="button"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? copy.expand : copy.collapse}
          </button>
        </div>
      </div>
      {collapsed ? (
        <p className={styles.coachingCollapsedSummary}>{copy.collapsedSummary}</p>
      ) : (
        <>
      <p className={styles.muted}>{copy.hint}</p>
      <form className={styles.coachingForm} onSubmit={(event) => void submitCoaching(event)}>
        <label>
          <textarea
            disabled={busy}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={copy.placeholder}
            rows={3}
            value={message}
          />
        </label>
        {status ? (
          status.kind === "alert" ? (
            <FormFieldError message={status.message} />
          ) : (
            <FormFieldHint message={status.message} />
          )
        ) : null}
        <button disabled={busy || !message.trim()} type="submit">
          {busy ? copy.submitting : copy.submit}
        </button>
      </form>
      {historyLoadState === "loading" ? (
        <p className={styles.muted} {...liveRegionProps("status")}>
          {copy.coachingHistoryLoading}
        </p>
      ) : historyLoadState === "error" ? (
        <FormFieldError message={copy.coachingHistoryLoadFailed} />
      ) : history.length > 0 ? (
        <div className={styles.coachingHistory}>
          <strong>{copy.recentTitle}</strong>
          <ul>
            {history.map((note) => (
              <li key={note.id}>
                {note.appliesFromHandId ? `#${note.appliesFromHandId} · ` : null}
                {resolveCoachingDisplayMessage(note)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={styles.muted}>{copy.noCoachingHistory}</p>
      )}
        </>
      )}
    </section>
  );
}
