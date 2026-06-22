export const REACTION_EMOJIS = ["👏", "🔥", "😱", "💪", "🎉", "🤯", "🫡", "❤️"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJIS as readonly string[]).includes(value);
}

export function reactionEmojiFromShortcutKey(key: string): ReactionEmoji | undefined {
  const index = Number(key) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= REACTION_EMOJIS.length) {
    return undefined;
  }
  return REACTION_EMOJIS[index];
}
