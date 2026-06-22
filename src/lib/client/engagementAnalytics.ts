const STORAGE_KEY = "texas-poker:engagement-events";
const MAX_EVENTS = 50;

export type EngagementEvent =
  | {
      appliesFromHandId: number;
      at: string;
      handId: number;
      name: "engagement.coaching.submit";
      tableId: string;
    }
  | {
      at: string;
      count: number;
      handId: number;
      name: "engagement.coaching.streak_active";
      tableId: string;
    }
  | {
      at: string;
      durationMs: number;
      handsSeen: number;
      name: "engagement.spectator.session_end";
      tableId: string;
    }
  | {
      agentId: string;
      at: string;
      name: "engagement.share.copy";
    }
  | {
      agentId: string;
      at: string;
      name: "engagement.agent_compare.click";
      sourceAgentId: string;
    }
  | {
      at: string;
      from: string;
      name: "engagement.nav.practice_click";
    }
  | {
      at: string;
      name: "engagement.home.table_preview_click";
      tableId: string;
    }
  | {
      at: string;
      name: "engagement.daily_tasks.complete";
    }
  | {
      action: "coach" | "watch";
      at: string;
      name: "engagement.daily_tasks.cta_click";
    }
  | {
      at: string;
      name: "engagement.quick_play.success";
      tableId?: string;
    }
  | {
      agentId: string;
      at: string;
      name: "engagement.favorite.open";
    }
  | {
      at: string;
      name: "engagement.checkin.complete";
      streak: number;
    }
  | {
      at: string;
      name: "engagement.quest.cta_click";
      questId: string;
    }
  | {
      at: string;
      kind: "core" | "optional";
      name: "engagement.quest.complete";
      questId: string;
    }
  | {
      at: string;
      name: "engagement.quest.grinder_claim";
      result: "earned" | "login_required" | "unavailable" | "error";
      source: "auto" | "manual";
    }
  | {
      at: string;
      name: "engagement.quest.active_today";
      stars: number;
    }
  | {
      at: string;
      granted: number;
      name: "engagement.quest.bonus_granted";
      reason: "quest_star" | "quest_core" | "quest_master";
    }
  | {
      at: string;
      grantedPoints: number;
      masterBadge: boolean;
      name: "engagement.quest.active_rewards";
      stars: number;
    }
  | {
      at: string;
      name: "engagement.activity_strip.click";
      stripId: string;
    }
  | {
      agentId: string;
      at: string;
      favorited: boolean;
      name: "engagement.favorite.toggle";
    }
  | {
      at: string;
      name: "engagement.human_table.invite_copy";
      tableId?: string;
    }
  | {
      at: string;
      name: "engagement.home.continue_spectate_click";
      tableId: string;
    }
  | {
      at: string;
      handId?: number;
      name: "engagement.table.feedback_click";
      phase?: string;
      tableId: string;
    }
  | {
      at: string;
      emoji: string;
      name: "engagement.reaction.send";
      tableId: string;
    }
  | {
      at: string;
      name: "engagement.settlement.play_again";
      reason: "bust" | "leave";
      tableId: string;
    }
  | {
      at: string;
      name: "engagement.settlement.back_lobby";
      reason: "bust" | "leave";
      tableId: string;
    }
  | {
      at: string;
      name: "engagement.leaderboard.rank_jump";
      tab: "daily" | "points" | "weekly";
    }
  | {
      at: string;
      dailyRank?: number;
      delta?: number;
      handId: number;
      kind: "account_balance" | "daily_rank" | "hand_win";
      name: "engagement.points_delta_seen";
      tableId: string;
    };

export function trackEngagement(event: EngagementEvent) {
  if (typeof window === "undefined") {
    return;
  }

  console.debug("[engagement]", event);

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const events = stored ? (JSON.parse(stored) as EngagementEvent[]) : [];
    events.push(event);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // Ignore storage failures in private browsing.
  }
}

export function drainEngagementEvents(): EngagementEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(stored) as EngagementEvent[];
  } catch {
    return [];
  }
}
