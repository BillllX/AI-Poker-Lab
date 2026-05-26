"use client";

import { useEffect, useRef } from "react";
import { audioManager, type TableSoundName } from "@/lib/client/audioManager";
import type { GameSnapshot } from "@/lib/poker/types";

type TableSoundOptions = {
  enableYourTurn?: boolean;
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
    audioManager.preload();
  }, []);

  useEffect(() => {
    if (!state) {
      return;
    }

    const currentActionIds = new Set(state.actionHistory.map((item) => item.id));
    const nextBaseline: Baseline = {
      actionIds: currentActionIds,
      communityCardCount: state.communityCards.length,
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
    } else if (state.communityCards.length > previous.communityCardCount) {
      audioManager.play("deal", { minIntervalMs: 260, volume: 0.58 });
    }

    for (const item of state.actionHistory) {
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

    baselineRef.current = nextBaseline;
  }, [options.enableYourTurn, options.myPlayerId, state]);
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
