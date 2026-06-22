import { isCheckedInToday, readCheckInState } from "@/lib/client/dailyCheckIn";
import {
  DAILY_COACHING_TARGET,
  DAILY_SPECTATE_HANDS_TARGET,
  getDailyTasksProgress,
  readDailyTasks,
} from "@/lib/client/dailyTasks";
import type { Language } from "@/lib/client/i18n";
import {
  getQuestOptionalSnapshot,
  isQuestPracticeCompleteToday,
  isQuestQuickPlayCompleteToday,
  isQuestShareCompleteToday,
} from "@/lib/client/questOptionalProgress";
import { QUEST_COPY, QUEST_REWARD_HINTS } from "@/lib/client/questLocalizedCopy";

export type QuestKind = "core" | "optional";

export type QuestId = "spectate" | "coach" | "check_in" | "share" | "practice" | "quick_play";

export type QuestRewardPreview = {
  stars: number;
  hintKey: QuestId;
};

export type QuestEntry = {
  complete: boolean;
  ctaHash?: string;
  ctaHref?: string;
  description: string;
  id: QuestId;
  kind: QuestKind;
  progress: number;
  reward: QuestRewardPreview;
  target: number;
  title: string;
};

function rewardFor(id: QuestId): QuestRewardPreview {
  return { stars: 1, hintKey: id };
}

export function buildQuestBoard(language: Language): QuestEntry[] {
  const daily = getDailyTasksProgress(readDailyTasks());
  const checkIn = readCheckInState();
  const optional = getQuestOptionalSnapshot();
  const t = QUEST_COPY[language];
  const hints = QUEST_REWARD_HINTS[language];

  const entries: QuestEntry[] = [
    {
      id: "spectate",
      kind: "core",
      title: t.spectate.title,
      description: t.spectate.description,
      progress: daily.spectateHands,
      target: daily.spectateTarget,
      complete: daily.spectateHands >= daily.spectateTarget,
      reward: rewardFor("spectate"),
      ctaHref: "/tables",
    },
    {
      id: "coach",
      kind: "core",
      title: t.coach.title,
      description: t.coach.description,
      progress: daily.coaching,
      target: daily.coachingTarget,
      complete: daily.coaching >= daily.coachingTarget,
      reward: rewardFor("coach"),
      ctaHref: "/tables",
    },
    {
      id: "check_in",
      kind: "optional",
      title: t.check_in.title,
      description: t.check_in.description,
      progress: isCheckedInToday(checkIn) ? 1 : 0,
      target: 1,
      complete: isCheckedInToday(checkIn),
      reward: rewardFor("check_in"),
    },
    {
      id: "share",
      kind: "optional",
      title: t.share.title,
      description: t.share.description,
      progress: optional.share ? 1 : 0,
      target: 1,
      complete: optional.share || isQuestShareCompleteToday(),
      reward: rewardFor("share"),
      ctaHref: "/tables",
    },
    {
      id: "practice",
      kind: "optional",
      title: t.practice.title,
      description: t.practice.description,
      progress: optional.practice ? 1 : 0,
      target: 1,
      complete: optional.practice || isQuestPracticeCompleteToday(),
      reward: rewardFor("practice"),
      ctaHref: "/human-table",
    },
    {
      id: "quick_play",
      kind: "optional",
      title: t.quick_play.title,
      description: t.quick_play.description,
      progress: optional.quickPlay ? 1 : 0,
      target: 1,
      complete: optional.quickPlay || isQuestQuickPlayCompleteToday(),
      reward: rewardFor("quick_play"),
      ctaHref: "/",
      ctaHash: "#quick-play",
    },
  ];

  return entries;
}

export function questRewardHint(language: Language, entry: QuestEntry) {
  return hintsFromLanguage(language)[entry.reward.hintKey];
}

function hintsFromLanguage(language: Language) {
  return QUEST_REWARD_HINTS[language];
}

export function countQuestStars(entries: QuestEntry[]) {
  return entries.filter((entry) => entry.complete).length;
}

export function countCompletedCore(entries: QuestEntry[]) {
  return entries.filter((entry) => entry.kind === "core" && entry.complete).length;
}

export const DAILY_COACHING_QUEST_TARGET = DAILY_COACHING_TARGET;
export const DAILY_SPECTATE_QUEST_TARGET = DAILY_SPECTATE_HANDS_TARGET;
