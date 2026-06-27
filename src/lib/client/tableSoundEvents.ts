"use client";

import { useEffect, useRef } from "react";
import { audioManager, type TableSoundName } from "@/lib/client/audioManager";
import type { GameSnapshot } from "@/lib/poker/types";

type TableSoundOptions = {
  enableMyAgentDeciding?: boolean;
  enableYourTurn?: boolean;
  myAgentOwnerUserId?: string;
  myPlayerId?: string;
};

type Baseline = {
  actionIds: Set<string>;
  communityCardCount: number;
  currentPlayerId?: string;
  handId: number;
};

export function useTableSounds(state: GameSnapshot | undefined, options: TableSoundOptions = {}) {
  const baselineRef = useRef<Baseline | undefined>(undefined);

  useEffect(() => {
    if (!state) {
      return;
    }

    const actionHistory = Array.isArray(state.actionHistory) ? state.actionHistory : [];
    const communityCards = Array.isArray(state.communityCards) ? state.communityCards : [];
    const players = Array.isArray(state.players) ? state.players : [];
    const currentActionIds = new Set(actionHistory.map((item) => item.id));
    const nextBaseline: Baseline = {
      actionIds: currentActionIds,
      communityCardCount: communityCards.length,
      currentPlayerId: state.currentPlayerId,
      handId: state.handId,
    };

    const previous = baselineRef.current;
    if (!previous) {
      baselineRef.current = nextBaseline;
      return;
    }

    if (state.handId !== previous.handId) {
      audioManager.play("deal", { minIntervalMs: 260, volume: 0.62 });
    } else if (communityCards.length > previous.communityCardCount) {
      audioManager.play("deal", { minIntervalMs: 260, volume: 0.58 });
    }

    for (const item of actionHistory) {
      if (previous.actionIds.has(item.id)) {
        continue;
      }

      const sound = soundForAction(item);
      if (sound) {
        audioManager.play(sound, { minIntervalMs: sound === "win" ? 500 : 90, volume: sound === "win" ? 0.78 : 0.72 });
      }
    }

    if (
      options.enableYourTurn &&
      options.myPlayerId &&
      state.currentPlayerId === options.myPlayerId &&
      previous.currentPlayerId !== state.currentPlayerId
    ) {
      audioManager.play("yourTurn", { minIntervalMs: 1_500, volume: 0.8 });
    }

    if (
      options.enableMyAgentDeciding &&
      options.myAgentOwnerUserId &&
      state.currentPlayerId &&
      previous.currentPlayerId !== state.currentPlayerId
    ) {
      const decidingPlayer = players.find((player) => player.id === state.currentPlayerId);
      if (decidingPlayer?.ownerUserId === options.myAgentOwnerUserId && decidingPlayer.kind !== "virtual") {
        audioManager.play("myAgentDeciding", { minIntervalMs: 1_500, volume: 0.72 });
      }
    }

    baselineRef.current = nextBaseline;
  }, [options.enableMyAgentDeciding, options.enableYourTurn, options.myAgentOwnerUserId, options.myPlayerId, state]);
}

function soundForAction(item: GameSnapshot["actionHistory"][number]): TableSoundName | undefined {
  if (item.action === "deal") {
    return "deal";
  }

  if (item.action === "win") {
    return "win";
  }

  if (item.action === "post-blind") {
    return "blind";
  }

  if (item.isAllIn && (item.action === "bet" || item.action === "call" || item.action === "raise")) {
    return "allin";
  }

  if (item.action === "bet" || item.action === "call" || item.action === "check" || item.action === "fold" || item.action === "raise") {
    return item.action;
  }

  return undefined;
}
