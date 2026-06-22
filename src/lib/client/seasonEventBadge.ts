import {
  OPERATIONAL_COPY,
  pickLegacyLocalizedOptionalPair,
  pickOperationalCopy,
} from "@/lib/client/localizedCopy";
import type { Language } from "@/lib/client/i18n";

export type SeasonEventBadgeConfig = {
  eventKey?: keyof typeof OPERATIONAL_COPY;
  eventLabelEn?: string;
  eventLabelZh?: string;
  id: string;
  seasonKey?: keyof typeof OPERATIONAL_COPY;
  seasonLabelEn: string;
  seasonLabelZh: string;
};

const DEFAULT_SEASON_EVENT_BADGE: SeasonEventBadgeConfig = {
  id: "season-1-2026",
  seasonKey: "seasonBadgeSeason1",
  eventKey: "seasonBadgeDailyEvent",
  seasonLabelEn: OPERATIONAL_COPY.seasonBadgeSeason1.en,
  seasonLabelZh: OPERATIONAL_COPY.seasonBadgeSeason1.zh,
  eventLabelEn: OPERATIONAL_COPY.seasonBadgeDailyEvent.en,
  eventLabelZh: OPERATIONAL_COPY.seasonBadgeDailyEvent.zh,
};

/** Season / event badge copy — configure via NEXT_PUBLIC_SEASON_BADGE JSON or OPERATIONAL_COPY keys. */
export function getSeasonEventBadge(): SeasonEventBadgeConfig | null {
  const raw = process.env.NEXT_PUBLIC_SEASON_BADGE?.trim();
  if (raw === "off" || raw === "0") {
    return null;
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SeasonEventBadgeConfig;
      if (parsed.id && parsed.seasonLabelEn && parsed.seasonLabelZh) {
        return parsed;
      }
    } catch {
      // fall through to default
    }
  }

  return DEFAULT_SEASON_EVENT_BADGE;
}

export function resolveSeasonLabel(language: Language, config: SeasonEventBadgeConfig) {
  if (config.seasonKey) {
    return pickOperationalCopy(language, config.seasonKey);
  }
  return language === "zh" ? config.seasonLabelZh : config.seasonLabelEn;
}

export function resolveEventLabel(language: Language, config: SeasonEventBadgeConfig) {
  if (config.eventKey) {
    return pickOperationalCopy(language, config.eventKey);
  }
  return pickLegacyLocalizedOptionalPair(language, {
    labelEn: config.eventLabelEn,
    labelZh: config.eventLabelZh,
  });
}
