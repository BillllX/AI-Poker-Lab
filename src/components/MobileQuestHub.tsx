"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  EMPTY_CHECK_IN_STATE,
  checkInToday,
  isCheckedInToday,
  readCheckInState,
} from "@/lib/client/dailyCheckIn";
import {
  getDailyTasksSnapshot,
  getServerDailyTasksSnapshot,
  subscribeDailyTasks,
} from "@/lib/client/dailyTasks";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { useLanguage } from "@/lib/client/i18n";
import { useModalFocusTrap } from "@/lib/client/useModalFocusTrap";
import {
  buildQuestBoard,
  countCompletedCore,
  countQuestStars,
  questRewardHint,
  type QuestEntry,
} from "@/lib/client/questCatalog";
import {
  claimGrinderBadgeFromQuestCore,
  fetchTodayBadgeKinds,
  tryAutoClaimGrinderFromQuestCore,
  type GrinderClaimResult,
} from "@/lib/client/questGrinderBadgeClaim";
import { pickOperationalCopy } from "@/lib/client/localizedCopy";
import {
  dismissOpsBanner,
  getOpsBanner,
  getOpsBannerDismissSnapshot,
  getServerOpsBannerDismissSnapshot,
  resolveOpsBannerCtaLabel,
  resolveOpsBannerMessage,
  subscribeOpsBanner,
} from "@/lib/client/opsBanner";
import {
  getQuestOptionalSnapshot,
  getServerQuestOptionalSnapshot,
  subscribeQuestOptional,
} from "@/lib/client/questOptionalProgress";
import { syncQuestCompletionTelemetry } from "@/lib/client/questCompletionTelemetry";
import { maybeCelebrateQuestActiveToday } from "@/lib/client/questActiveCelebration";
import { tryQuestActiveRewards } from "@/lib/client/questActiveRewardClaim";
import { claimQuestCoreBonus, fetchQuestBonusSummary } from "@/lib/client/questBonusClient";
import { prefersReducedMotion } from "@/lib/client/motionPreference";
import { upsertTodayQuestHistory } from "@/lib/client/questHistory";
import { withBasePath } from "@/lib/client/basePath";
import styles from "./MobileQuestHub.module.css";

const CHECK_IN_EVENT = "daily-check-in-change";

function subscribeCheckIn(onStoreChange: () => void) {
  window.addEventListener(CHECK_IN_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CHECK_IN_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

const HIDDEN_PREFIXES = ["/login"];

const copy = {
  zh: {
    activeToday: (stars: number) => `今日活跃 · ${stars}⭐`,
    checkIn: "签到",
    close: "关闭任务面板",
    coreTag: "核心",
    go: "去完成",
    hubLabel: "今日任务",
    optionalTag: "可选",
    progress: (done: number, total: number) => `${done}/${total} 已完成`,
    reward: (stars: number, hint: string) => `+${stars}⭐ · ${hint}`,
    sheetTitle: "今日任务与奖励",
    stars: (n: number) => `${n}⭐`,
    grinderClaim: "领取 Grinder 荣誉",
    grinderClaiming: "领取中…",
    grinderEarned: "已领取 Grinder 今日荣誉",
    grinderLogin: "登录后领取 Grinder 荣誉",
    grinderUnavailable: "需先在牌桌提交 1 次 Coaching 才能领取",
    grinderCoreHint: "核心任务已完成 — 可领取今日 Grinder 荣誉",
    tabQuests: "任务",
    tabAnnouncements: "公告",
    announcementsEmpty: "暂无新公告",
    allQuestsComplete: "全部任务已完成 — 明天见新任务池",
    allQuestsCompleteCore: "核心任务已清空 — 可选任务随时可做",
    bonusToday: (n: number) => `今日实验奖励 +${n} 积分`,
    guestLoginCta: "登录领奖励",
    guestRewardsHint: "登录后可领取 Grinder 荣誉、任务大师徽章与实验积分。",
  },
  en: {
    activeToday: (stars: number) => `Active today · ${stars}★`,
    checkIn: "Check in",
    close: "Close quest panel",
    coreTag: "Core",
    go: "Go",
    hubLabel: "Daily quests",
    optionalTag: "Optional",
    progress: (done: number, total: number) => `${done}/${total} done`,
    reward: (stars: number, hint: string) => `+${stars}★ · ${hint}`,
    sheetTitle: "Today's quests & rewards",
    stars: (n: number) => `${n}★`,
    grinderClaim: "Claim Grinder honor",
    grinderClaiming: "Claiming…",
    grinderEarned: "Grinder honor claimed for today",
    grinderLogin: "Log in to claim Grinder honor",
    grinderUnavailable: "Submit coaching at a table first to claim",
    grinderCoreHint: "Core quests done — claim today's Grinder honor",
    tabQuests: "Quests",
    tabAnnouncements: "News",
    announcementsEmpty: "No announcements right now",
    allQuestsComplete: "All quests done — fresh pool tomorrow",
    allQuestsCompleteCore: "Core quests cleared — optional anytime",
    bonusToday: (n: number) => `Lab bonus today +${n} pts`,
    guestLoginCta: "Log in for rewards",
    guestRewardsHint: "Log in to claim Grinder honor, Quest Master badge, and lab bonus points.",
  },
} as const;

type SheetTab = "announcements" | "quests";

type GrinderUiState = "hidden" | "login_required" | "ready" | "claiming" | "earned" | "unavailable";

type GrinderSyncState = {
  badges: string[] | "login_required" | "pending";
  claimUnavailable: boolean;
  claiming: boolean;
  earned: boolean;
};

const INITIAL_GRINDER_SYNC: GrinderSyncState = {
  badges: "pending",
  claimUnavailable: false,
  claiming: false,
  earned: false,
};

function resolveGrinderUi(coreComplete: boolean, sync: GrinderSyncState): GrinderUiState {
  if (!coreComplete) {
    return "hidden";
  }
  if (sync.earned || (Array.isArray(sync.badges) && sync.badges.includes("grinder"))) {
    return "earned";
  }
  if (sync.claiming) {
    return "claiming";
  }
  if (sync.badges === "login_required") {
    return "login_required";
  }
  if (sync.claimUnavailable) {
    return "unavailable";
  }
  return "ready";
}

export function MobileQuestHub() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const t = copy[language];
  const [open, setOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<SheetTab>("quests");
  const [celebrateActive, setCelebrateActive] = useState(false);
  const [bonusToday, setBonusToday] = useState(0);
  const [guestMode, setGuestMode] = useState(false);
  const [grinderSync, setGrinderSync] = useState<GrinderSyncState>(INITIAL_GRINDER_SYNC);
  const opsBannerConfig = getOpsBanner();
  const opsBannerDismissed = useSyncExternalStore(
    subscribeOpsBanner,
    getOpsBannerDismissSnapshot,
    getServerOpsBannerDismissSnapshot,
  );
  const hasActiveAnnouncement = Boolean(opsBannerConfig && !opsBannerDismissed);

  const dailySnapshot = useSyncExternalStore(
    subscribeDailyTasks,
    getDailyTasksSnapshot,
    getServerDailyTasksSnapshot,
  );
  const checkInState = useSyncExternalStore(
    subscribeCheckIn,
    readCheckInState,
    () => EMPTY_CHECK_IN_STATE,
  );
  const optionalSnapshot = useSyncExternalStore(
    subscribeQuestOptional,
    getQuestOptionalSnapshot,
    getServerQuestOptionalSnapshot,
  );

  const checkedIn = isCheckedInToday(checkInState);
  const questBoardKey = [
    language,
    dailySnapshot.dayKey,
    dailySnapshot.coachingCount,
    dailySnapshot.seenHands.join(","),
    checkInState.lastDayKey,
    optionalSnapshot.practice,
    optionalSnapshot.quickPlay,
    optionalSnapshot.share,
  ].join("|");
  const quests = useMemo(() => buildQuestBoard(language), [language, questBoardKey]);
  const stars = countQuestStars(quests);
  const doneCount = quests.filter((entry) => entry.complete).length;
  const coreComplete = countCompletedCore(quests) >= 2;
  const grinderUi = resolveGrinderUi(coreComplete, grinderSync);

  useEffect(() => {
    syncQuestCompletionTelemetry(quests);
    upsertTodayQuestHistory(quests);
  }, [quests]);

  useEffect(() => {
    if (stars < 3) {
      return;
    }

    let cancelled = false;

    async function runActiveRewards() {
      if (!prefersReducedMotion() && maybeCelebrateQuestActiveToday(stars, language)) {
        if (!cancelled) {
          window.setTimeout(() => {
            setCelebrateActive(true);
            window.setTimeout(() => setCelebrateActive(false), 2400);
          }, 0);
        }
      }

      const rewardResult = await tryQuestActiveRewards(stars, language);
      if (cancelled || rewardResult.kind === "skipped" || rewardResult.kind === "login_required") {
        return;
      }
      trackEngagement({
        at: new Date().toISOString(),
        grantedPoints: rewardResult.grantedPoints,
        masterBadge: rewardResult.masterBadge,
        name: "engagement.quest.active_rewards",
        stars,
      });
      const summary = await fetchQuestBonusSummary();
      if (!cancelled && summary) {
        setBonusToday(summary.grantedToday);
      }
    }

    void runActiveRewards();
    return () => {
      cancelled = true;
    };
  }, [language, stars]);

  const applyGrinderResult = useCallback((result: GrinderClaimResult, source: "auto" | "manual") => {
    trackEngagement({
      at: new Date().toISOString(),
      name: "engagement.quest.grinder_claim",
      result,
      source,
    });
    if (result === "earned") {
      setGrinderSync((current) => ({ ...current, claiming: false, earned: true }));
      void claimQuestCoreBonus(language);
      return;
    }
    if (result === "login_required") {
      setGrinderSync((current) => ({ ...current, badges: "login_required", claiming: false }));
      return;
    }
    if (result === "unavailable") {
      setGrinderSync((current) => ({ ...current, claimUnavailable: true, claiming: false }));
      return;
    }
    setGrinderSync((current) => ({ ...current, claiming: false }));
  }, [language]);

  useEffect(() => {
    if (stars < 1 && !coreComplete) {
      return;
    }
    let cancelled = false;
    void fetchQuestBonusSummary().then((summary) => {
      if (!cancelled && summary) {
        setBonusToday(summary.grantedToday);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [coreComplete, stars, grinderSync.earned]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    void fetchTodayBadgeKinds().then((badges) => {
      if (!cancelled) {
        setGuestMode(badges === "login_required");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, stars, coreComplete]);

  const showGuestBanner = guestMode && (coreComplete || stars >= 3);

  useEffect(() => {
    if (!coreComplete) {
      return;
    }

    let cancelled = false;

    async function syncGrinderState() {
      const badges = await fetchTodayBadgeKinds();
      if (cancelled) {
        return;
      }
      if (badges === "login_required") {
        setGrinderSync((current) => ({ ...current, badges: "login_required" }));
        return;
      }
      if (badges.includes("grinder")) {
        setGrinderSync((current) => ({ ...current, badges, earned: true }));
        return;
      }
      setGrinderSync((current) => ({ ...current, badges }));
      const autoResult = await tryAutoClaimGrinderFromQuestCore();
      if (cancelled || autoResult === "skipped") {
        return;
      }
      applyGrinderResult(autoResult, "auto");
    }

    void syncGrinderState();
    return () => {
      cancelled = true;
    };
  }, [applyGrinderResult, coreComplete]);

  const handleGrinderClaim = useCallback(async () => {
    setGrinderSync((current) => ({ ...current, claiming: true }));
    const result = await claimGrinderBadgeFromQuestCore();
    applyGrinderResult(result, "manual");
  }, [applyGrinderResult]);

  const closeSheet = useCallback(() => setOpen(false), []);
  const sheetRef = useModalFocusTrap(open, closeSheet);

  const handleCheckIn = useCallback(() => {
    const next = checkInToday();
    trackEngagement({
      at: new Date().toISOString(),
      name: "engagement.checkin.complete",
      streak: next.streak,
    });
    window.dispatchEvent(new Event(CHECK_IN_EVENT));
  }, []);

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <div className={styles.root}>
      <button
        aria-expanded={open}
        className={styles.collapsedBar}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden className={styles.starIcon}>
          ★
        </span>
        <span className={styles.collapsedLabel}>{t.hubLabel}</span>
        <span className={styles.collapsedMeta}>{t.progress(doneCount, quests.length)}</span>
        <span className={styles.collapsedStars}>{t.stars(stars)}</span>
        {hasActiveAnnouncement ? <span aria-hidden className={styles.announcementDot} /> : null}
        <span aria-hidden className={styles.chevron}>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <>
          <button
            aria-label={t.close}
            className={styles.backdrop}
            type="button"
            onClick={closeSheet}
          />
          <section
            aria-label={t.sheetTitle}
            aria-modal="true"
            className={styles.sheet}
            ref={sheetRef as React.RefObject<HTMLElement>}
            role="dialog"
          >
            <header className={styles.sheetHeader}>
              <div>
                <p className={styles.sheetEyebrow}>{t.hubLabel}</p>
                <h2 className={styles.sheetTitle}>{t.sheetTitle}</h2>
              </div>
              {stars >= 3 ? (
                <span className={`${styles.activeBadge} ${celebrateActive ? styles.activeBadgeCelebrate : ""}`}>
                  {t.activeToday(stars)}
                </span>
              ) : null}
            </header>

            <div aria-label={t.sheetTitle} className={styles.sheetTabs} role="tablist">
              <button
                aria-selected={sheetTab === "quests"}
                className={sheetTab === "quests" ? styles.sheetTabActive : styles.sheetTab}
                id="mobile-quest-tab-quests"
                role="tab"
                type="button"
                onClick={() => setSheetTab("quests")}
              >
                {t.tabQuests}
              </button>
              <button
                aria-selected={sheetTab === "announcements"}
                className={sheetTab === "announcements" ? styles.sheetTabActive : styles.sheetTab}
                id="mobile-quest-tab-announcements"
                role="tab"
                type="button"
                onClick={() => setSheetTab("announcements")}
              >
                {t.tabAnnouncements}
                {hasActiveAnnouncement ? <span aria-hidden className={styles.tabDot} /> : null}
              </button>
            </div>

            {showGuestBanner ? (
              <div className={styles.guestBanner}>
                <p>{t.guestRewardsHint}</p>
                <Link className={styles.questCta} href={withBasePath("/login")}>
                  {t.guestLoginCta}
                </Link>
              </div>
            ) : null}

            {doneCount === quests.length ? (
              <p className={styles.allCompleteBanner}>{t.allQuestsComplete}</p>
            ) : coreComplete ? (
              <p className={styles.allCompleteBanner}>{t.allQuestsCompleteCore}</p>
            ) : null}

            <div
              aria-labelledby="mobile-quest-tab-quests"
              hidden={sheetTab !== "quests"}
              id="mobile-quest-panel-quests"
              role="tabpanel"
            >
            <ul className={styles.questList}>
              {quests.map((entry) => (
                <QuestRow
                  checkedIn={checkedIn}
                  entry={entry}
                  goLabel={t.go}
                  key={entry.id}
                  language={language}
                  onCheckIn={handleCheckIn}
                  t={t}
                />
              ))}
            </ul>

            {grinderUi !== "hidden" ? (
              <footer className={styles.rewardFooter}>
                <p className={styles.rewardHint}>{t.grinderCoreHint}</p>
                {grinderUi === "earned" ? (
                  <p className={styles.rewardEarned}>{t.grinderEarned}</p>
                ) : null}
                {grinderUi === "login_required" && !showGuestBanner ? (
                  <Link className={styles.questCta} href={withBasePath("/login")}>
                    {t.grinderLogin}
                  </Link>
                ) : null}
                {grinderUi === "unavailable" ? (
                  <p className={styles.rewardMuted}>{t.grinderUnavailable}</p>
                ) : null}
                {grinderUi === "ready" || grinderUi === "claiming" ? (
                  <button
                    className={styles.questCta}
                    disabled={grinderUi === "claiming"}
                    type="button"
                    onClick={() => void handleGrinderClaim()}
                  >
                    {grinderUi === "claiming" ? t.grinderClaiming : t.grinderClaim}
                  </button>
                ) : null}
              </footer>
            ) : null}

            {bonusToday > 0 ? (
              <p className={styles.bonusTodayBanner}>{t.bonusToday(bonusToday)}</p>
            ) : null}
            </div>

            <div
              aria-labelledby="mobile-quest-tab-announcements"
              hidden={sheetTab !== "announcements"}
              id="mobile-quest-panel-announcements"
              role="tabpanel"
            >
              <OpsAnnouncementsPanel
                config={opsBannerConfig}
                dismissed={opsBannerDismissed}
                language={language}
                t={t}
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function OpsAnnouncementsPanel({
  config,
  dismissed,
  language,
  t,
}: {
  config: ReturnType<typeof getOpsBanner>;
  dismissed: boolean;
  language: "en" | "zh";
  t: (typeof copy)["zh"] | (typeof copy)["en"];
}) {
  if (!config || dismissed) {
    return <p className={styles.announcementsEmpty}>{t.announcementsEmpty}</p>;
  }

  const message = resolveOpsBannerMessage(language, config);
  const ctaLabel = resolveOpsBannerCtaLabel(language, config);

  return (
    <article className={styles.announcementCard}>
      <p className={styles.announcementMessage}>{message}</p>
      <div className={styles.announcementActions}>
        {config.ctaHref && ctaLabel ? (
          <Link className={styles.questCta} href={config.ctaHref}>
            {ctaLabel}
          </Link>
        ) : null}
        <button
          aria-label={pickOperationalCopy(language, "uiDismissAnnouncement")}
          className={styles.announcementDismiss}
          type="button"
          onClick={() => dismissOpsBanner(config.id)}
        >
          {pickOperationalCopy(language, "uiDismiss")}
        </button>
      </div>
    </article>
  );
}

function QuestRow({
  checkedIn,
  entry,
  goLabel,
  language,
  onCheckIn,
  t,
}: {
  checkedIn: boolean;
  entry: QuestEntry;
  goLabel: string;
  language: "en" | "zh";
  onCheckIn: () => void;
  t: (typeof copy)["zh"] | (typeof copy)["en"];
}) {
  const hint = questRewardHint(language, entry);
  const ratio = entry.target > 0 ? Math.min(entry.progress / entry.target, 1) : 0;

  return (
    <li className={`${styles.questItem} ${entry.complete ? styles.questItemComplete : ""}`}>
      <div className={styles.questHead}>
        <span className={entry.kind === "core" ? styles.tagCore : styles.tagOptional}>
          {entry.kind === "core" ? t.coreTag : t.optionalTag}
        </span>
        <strong>{entry.title}</strong>
        {entry.complete ? <span aria-hidden className={styles.questDoneMark}>✓</span> : null}
      </div>
      <p className={styles.questDescription}>{entry.description}</p>
      <div aria-hidden className={styles.progressTrack}>
        <span className={styles.progressFill} style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className={styles.questMeta}>
        {entry.progress}/{entry.target} · {t.reward(entry.reward.stars, hint)}
      </p>
      {!entry.complete && entry.id === "check_in" && !checkedIn ? (
        <button className={styles.questCta} type="button" onClick={onCheckIn}>
          {t.checkIn}
        </button>
      ) : null}
      {!entry.complete && entry.ctaHref && entry.id !== "check_in" ? (
        <Link
          className={styles.questCta}
          href={entry.ctaHash ? `${entry.ctaHref}${entry.ctaHash}` : entry.ctaHref}
          onClick={() => {
            trackEngagement({
              at: new Date().toISOString(),
              name: "engagement.quest.cta_click",
              questId: entry.id,
            });
          }}
        >
          {goLabel}
        </Link>
      ) : null}
    </li>
  );
}
