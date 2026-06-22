import {
  OPERATIONAL_COPY,
  pickLegacyLocalizedOptionalPair,
  pickLegacyLocalizedPair,
  pickOperationalCopy,
} from "@/lib/client/localizedCopy";
import type { Language } from "@/lib/client/i18n";

export type OpsBannerConfig = {
  ctaHref?: string;
  ctaLabelEn?: string;
  ctaLabelZh?: string;
  id: string;
  messageEn: string;
  messageZh: string;
  messageKey?: keyof typeof OPERATIONAL_COPY;
  ctaKey?: keyof typeof OPERATIONAL_COPY;
};

const STORAGE_PREFIX = "ops-banner-dismiss:";
export const OPS_BANNER_CHANGE_EVENT = "texas-poker-ops-banner-change";

const DEFAULT_OPS_BANNER: OpsBannerConfig = {
  id: "coach-live-2026-06",
  messageKey: "opsBannerCoachDockMessage",
  ctaKey: "opsBannerCoachDockCta",
  messageEn: OPERATIONAL_COPY.opsBannerCoachDockMessage.en,
  messageZh: OPERATIONAL_COPY.opsBannerCoachDockMessage.zh,
  ctaLabelEn: OPERATIONAL_COPY.opsBannerCoachDockCta.en,
  ctaLabelZh: OPERATIONAL_COPY.opsBannerCoachDockCta.zh,
  ctaHref: "/tables",
};

/** Active ops banner — swap copy via OPERATIONAL_COPY keys or NEXT_PUBLIC_OPS_BANNER JSON. */
export function getOpsBanner(): OpsBannerConfig | null {
  const raw = process.env.NEXT_PUBLIC_OPS_BANNER?.trim();
  if (raw === "off" || raw === "0") {
    return null;
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as OpsBannerConfig;
      if (parsed.id && parsed.messageEn && parsed.messageZh) {
        return parsed;
      }
    } catch {
      // fall through to default
    }
  }

  return DEFAULT_OPS_BANNER;
}

export function resolveOpsBannerMessage(language: Language, config: OpsBannerConfig) {
  if (config.messageKey) {
    return pickOperationalCopy(language, config.messageKey);
  }
  return pickLegacyLocalizedPair(language, config);
}

export function resolveOpsBannerCtaLabel(language: Language, config: OpsBannerConfig) {
  if (config.ctaKey) {
    return pickOperationalCopy(language, config.ctaKey);
  }
  return pickLegacyLocalizedOptionalPair(language, {
    labelEn: config.ctaLabelEn,
    labelZh: config.ctaLabelZh,
  });
}

export function isOpsBannerDismissed(bannerId: string): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }
  return sessionStorage.getItem(`${STORAGE_PREFIX}${bannerId}`) === "1";
}

export function dismissOpsBanner(bannerId: string) {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(`${STORAGE_PREFIX}${bannerId}`, "1");
  window.dispatchEvent(new Event(OPS_BANNER_CHANGE_EVENT));
}

export function subscribeOpsBanner(onStoreChange: () => void) {
  window.addEventListener(OPS_BANNER_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(OPS_BANNER_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function getOpsBannerDismissSnapshot() {
  const config = getOpsBanner();
  if (!config) {
    return true;
  }
  return isOpsBannerDismissed(config.id);
}

export function getServerOpsBannerDismissSnapshot() {
  return false;
}
