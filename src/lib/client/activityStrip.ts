import {
  OPERATIONAL_COPY,
  pickLegacyLocalizedOptionalPair,
  pickLegacyLocalizedPair,
  pickOperationalCopy,
} from "@/lib/client/localizedCopy";
import type { Language } from "@/lib/client/i18n";

export type ActivityStripConfig = {
  ctaHref?: string;
  ctaLabelEn?: string;
  ctaLabelZh?: string;
  ctaKey?: keyof typeof OPERATIONAL_COPY;
  id: string;
  messageEn: string;
  messageKey?: keyof typeof OPERATIONAL_COPY;
  messageZh: string;
};

const STORAGE_PREFIX = "activity-strip-dismiss:";

const DEFAULT_ACTIVITY_STRIP: ActivityStripConfig = {
  id: "daily-rewards-2026-06",
  messageKey: "activityStripDailyRewardsMessage",
  ctaKey: "activityStripDailyRewardsCta",
  messageEn: OPERATIONAL_COPY.activityStripDailyRewardsMessage.en,
  messageZh: OPERATIONAL_COPY.activityStripDailyRewardsMessage.zh,
  ctaLabelEn: OPERATIONAL_COPY.activityStripDailyRewardsCta.en,
  ctaLabelZh: OPERATIONAL_COPY.activityStripDailyRewardsCta.zh,
  ctaHref: "/leaderboard",
};

/** Site-wide activity strip — configure via NEXT_PUBLIC_ACTIVITY_STRIP JSON or OPERATIONAL_COPY keys. */
export function getActivityStrip(): ActivityStripConfig | null {
  const raw = process.env.NEXT_PUBLIC_ACTIVITY_STRIP?.trim();
  if (raw === "off" || raw === "0") {
    return null;
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ActivityStripConfig;
      if (parsed.id && parsed.messageEn && parsed.messageZh) {
        return parsed;
      }
    } catch {
      // fall through to default
    }
  }

  return DEFAULT_ACTIVITY_STRIP;
}

export function resolveActivityStripMessage(language: Language, config: ActivityStripConfig) {
  if (config.messageKey) {
    return pickOperationalCopy(language, config.messageKey);
  }
  return pickLegacyLocalizedPair(language, config);
}

export function resolveActivityStripCtaLabel(language: Language, config: ActivityStripConfig) {
  if (config.ctaKey) {
    return pickOperationalCopy(language, config.ctaKey);
  }
  return pickLegacyLocalizedOptionalPair(language, {
    labelEn: config.ctaLabelEn,
    labelZh: config.ctaLabelZh,
  });
}

export function isActivityStripDismissed(stripId: string): boolean {
  if (typeof localStorage === "undefined") {
    return false;
  }
  return localStorage.getItem(`${STORAGE_PREFIX}${stripId}`) === "1";
}

export function dismissActivityStrip(stripId: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(`${STORAGE_PREFIX}${stripId}`, "1");
  }
}

export function activityStripChangeEvent() {
  return "activity-strip-change";
}
