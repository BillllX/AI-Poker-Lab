"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { FormFieldError } from "@/components/FormFieldMessage";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { REACTION_EMOJIS, reactionEmojiFromShortcutKey, type ReactionEmoji } from "@/lib/poker/reactions";
import { withBasePath } from "@/lib/client/basePath";
import type { TableReaction } from "@/lib/poker/types";
import styles from "./ReactionBar.module.css";

type FloatingReaction = TableReaction & {
  left: number;
  top: number;
};

type ReactionBarCopy = {
  rateLimited: string;
  recentLabel: string;
  sendFailed: string;
  shortcutHint: string;
  title: string;
};

type ReactionBarProps = {
  copy: ReactionBarCopy;
  recentReactions?: TableReaction[];
  tableId: string;
};

const LAST_REACTION_KEY = "texas-poker:last-reaction-emoji";

function readLastReactionEmoji(): ReactionEmoji | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const stored = window.localStorage.getItem(LAST_REACTION_KEY);
    return stored && (REACTION_EMOJIS as readonly string[]).includes(stored) ? (stored as ReactionEmoji) : undefined;
  } catch {
    return undefined;
  }
}

function rememberLastReactionEmoji(emoji: ReactionEmoji) {
  try {
    window.localStorage.setItem(LAST_REACTION_KEY, emoji);
  } catch {
    // ignore storage failures
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export const ReactionBar = memo(function ReactionBar({ copy, recentReactions = [], tableId }: ReactionBarProps) {
  const [busyEmoji, setBusyEmoji] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [floats, setFloats] = useState<FloatingReaction[]>([]);
  const [lastEmoji, setLastEmoji] = useState<ReactionEmoji | undefined>(() => readLastReactionEmoji());
  const seenReactionIdsRef = useRef<Set<string>>(new Set());

  const recentBurst = useMemo(
    () => [...recentReactions].slice(-8).reverse(),
    [recentReactions],
  );

  const spawnFloat = useCallback((reaction: TableReaction) => {
    const float: FloatingReaction = {
      ...reaction,
      left: 18 + Math.random() * 64,
      top: 28 + Math.random() * 44,
    };
    setFloats((current) => [...current, float]);
    window.setTimeout(() => {
      setFloats((current) => current.filter((item) => item.id !== reaction.id));
    }, 2_000);
  }, []);

  useEffect(() => {
    for (const reaction of recentReactions) {
      if (seenReactionIdsRef.current.has(reaction.id)) {
        continue;
      }
      seenReactionIdsRef.current.add(reaction.id);
      spawnFloat(reaction);
    }
  }, [recentReactions, spawnFloat]);

  const sendReaction = useCallback(async (emoji: ReactionEmoji) => {
    if (busyEmoji) {
      return;
    }

    setBusyEmoji(emoji);
    setStatus(undefined);

    try {
      const response = await fetch(withBasePath(`/api/tables/${tableId}/reactions`), {
        body: JSON.stringify({ emoji }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setStatus(response.status === 429 ? copy.rateLimited : payload?.error ?? copy.sendFailed);
        return;
      }

      const payload = (await response.json()) as { reaction: TableReaction };
      setLastEmoji(emoji);
      rememberLastReactionEmoji(emoji);
      trackEngagement({
        at: new Date().toISOString(),
        emoji,
        name: "engagement.reaction.send",
        tableId,
      });
      if (!seenReactionIdsRef.current.has(payload.reaction.id)) {
        seenReactionIdsRef.current.add(payload.reaction.id);
        spawnFloat(payload.reaction);
      }
    } catch {
      setStatus(copy.sendFailed);
    } finally {
      setBusyEmoji(undefined);
    }
  }, [busyEmoji, copy.rateLimited, copy.sendFailed, spawnFloat, tableId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) {
        return;
      }

      const emoji = reactionEmojiFromShortcutKey(event.key);
      if (!emoji) {
        return;
      }

      event.preventDefault();
      void sendReaction(emoji);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sendReaction]);

  return (
    <div className={styles.wrap}>
      <div aria-hidden="true" className={styles.floatLayer}>
        {floats.map((item) => (
          <span className={styles.floatEmoji} key={item.id} style={{ left: `${item.left}%`, top: `${item.top}%` }}>
            {item.emoji}
          </span>
        ))}
      </div>
      <div className={styles.bar}>
        <div className={styles.header}>
          <span className={styles.title}>{copy.title}</span>
          <span className={styles.shortcutHint}>{copy.shortcutHint}</span>
        </div>
        {recentBurst.length > 0 ? (
          <div aria-label={copy.recentLabel} className={styles.recentStrip}>
            {recentBurst.map((reaction) => (
              <span className={styles.recentChip} key={reaction.id} title={reaction.at}>
                {reaction.emoji}
              </span>
            ))}
          </div>
        ) : null}
        <div className={styles.buttons}>
          {REACTION_EMOJIS.map((emoji, index) => (
            <button
              aria-keyshortcuts={`${index + 1}`}
              aria-label={emoji}
              className={[
                styles.emojiButton,
                lastEmoji === emoji ? styles.emojiButtonRecent : "",
                busyEmoji === emoji ? styles.emojiButtonBusy : "",
              ].filter(Boolean).join(" ")}
              disabled={busyEmoji !== undefined}
              key={emoji}
              type="button"
              onClick={() => void sendReaction(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
        <FormFieldError message={status} variant="inline" />
      </div>
    </div>
  );
});
