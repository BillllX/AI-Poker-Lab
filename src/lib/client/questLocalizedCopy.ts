import { DAILY_SPECTATE_HANDS_TARGET } from "@/lib/client/dailyTasks";

export type QuestCopyId = "spectate" | "coach" | "check_in" | "share" | "practice" | "quick_play";

export const QUEST_REWARD_HINTS = {
  en: {
    check_in: "Streak badge progress",
    coach: "Coach honor",
    practice: "Practice experimenter",
    quick_play: "Quick seat badge hint",
    share: "Spread the lab",
    spectate: "Spectator badge progress",
  },
  zh: {
    check_in: "连续签到徽章进度",
    coach: "Coach 荣誉",
    practice: "练习实验员",
    quick_play: "快速入池进度",
    share: "传播实验",
    spectate: "观战者徽章进度",
  },
} as const satisfies Record<"en" | "zh", Record<QuestCopyId, string>>;

export const QUEST_COPY = {
  en: {
    check_in: {
      description: "Check in once today (local streak).",
      title: "Daily check-in",
    },
    coach: {
      description: "Send one coaching note from a live table.",
      title: "Coach your AI",
    },
    practice: {
      description: "Open the human practice table.",
      title: "Try practice table",
    },
    quick_play: {
      description: "Use quick play to seat your AI once.",
      title: "Quick play once",
    },
    share: {
      description: "Copy a spectator link and share the lab.",
      title: "Share a watch link",
    },
    spectate: {
      description: `Watch ${DAILY_SPECTATE_HANDS_TARGET} completed hands.`,
      title: "Spectate live hands",
    },
  },
  zh: {
    check_in: {
      description: "今日签到一次（本机 streak）。",
      title: "每日签到",
    },
    coach: {
      description: "在观战页提交 1 次 Coaching。",
      title: "教练你的 AI",
    },
    practice: {
      description: "打开真人练习桌体验一次。",
      title: "试试练习桌",
    },
    quick_play: {
      description: "用快速开赛让你的 AI 入池一次。",
      title: "快速开赛一次",
    },
    share: {
      description: "复制观战链接并分享实验。",
      title: "分享观战链接",
    },
    spectate: {
      description: `观战 ${DAILY_SPECTATE_HANDS_TARGET} 手已结束牌局。`,
      title: "观战 live 牌局",
    },
  },
} as const satisfies Record<
  "en" | "zh",
  Record<QuestCopyId, { description: string; title: string }>
>;
