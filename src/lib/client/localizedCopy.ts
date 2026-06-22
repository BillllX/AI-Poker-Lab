import type { Language } from "@/lib/client/i18n";

/** Bilingual string keyed by supported UI languages. */
export type LocalizedCopy = Record<Language, string>;

/** Operational / marketing copy registry (en + zh). Extend keys here for new banners. */
export const OPERATIONAL_COPY = {
  activityStripDailyRewardsMessage: {
    en: "Daily reward board is live — settle a hand today and climb the rankings.",
    zh: "今日奖励榜进行中 — 完成一手结算即可冲击排行榜。",
  },
  activityStripDailyRewardsCta: {
    en: "View leaderboard",
    zh: "查看排行榜",
  },
  opsBannerCoachDockMessage: {
    en: "New: Coach Dock on live tables — send strategy notes and watch your AI adapt next hand.",
    zh: "新功能：观战页 Coach Dock — 发送策略指导，下一手起 AI 牌手即会调整打法。",
  },
  opsBannerCoachDockCta: {
    en: "Watch live tables",
    zh: "观看实验牌桌",
  },
  uiActivityStripAria: {
    en: "Site activity",
    zh: "站内活动",
  },
  uiAnnouncementAria: {
    en: "Announcement",
    zh: "活动通知",
  },
  uiDismiss: {
    en: "Dismiss",
    zh: "关闭",
  },
  uiDismissActivityStrip: {
    en: "Dismiss activity strip",
    zh: "关闭活动条",
  },
  uiDismissAnnouncement: {
    en: "Dismiss announcement",
    zh: "关闭通知",
  },
  uiLanguageToggle: {
    en: "Language",
    zh: "语言",
  },
  uiLanguageEn: {
    en: "EN",
    zh: "EN",
  },
  uiLanguageZh: {
    en: "中文",
    zh: "中文",
  },
  seasonBadgeSeason1: {
    en: "Season 1",
    zh: "第一赛季",
  },
  seasonBadgeDailyEvent: {
    en: "Daily Event",
    zh: "今日活动",
  },
} as const satisfies Record<string, LocalizedCopy>;

export type OperationalCopyKey = keyof typeof OPERATIONAL_COPY;

export function pickLocalizedCopy(language: Language, copy: LocalizedCopy): string {
  return copy[language];
}

export function pickOperationalCopy(language: Language, key: OperationalCopyKey): string {
  return pickLocalizedCopy(language, OPERATIONAL_COPY[key]);
}

/** Resolve env-driven or legacy `{ messageEn, messageZh }` payloads. */
export function pickLegacyLocalizedPair(
  language: Language,
  pair: { messageEn: string; messageZh: string },
): string {
  return language === "zh" ? pair.messageZh : pair.messageEn;
}

export function pickLegacyLocalizedOptionalPair(
  language: Language,
  pair: { labelEn?: string; labelZh?: string } | undefined,
): string | undefined {
  if (!pair) {
    return undefined;
  }
  return language === "zh" ? pair.labelZh : pair.labelEn;
}
