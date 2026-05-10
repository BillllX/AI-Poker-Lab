import type { Card, Rank, Suit } from "./types";

export const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
export const suits: Suit[] = ["s", "h", "d", "c"];

export const rankValue: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function createDeck(): Card[] {
  return suits.flatMap((suit) => ranks.map((rank) => ({ rank, suit })));
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export function formatCard(card: Card): string {
  return `${card.rank}${card.suit}`;
}
