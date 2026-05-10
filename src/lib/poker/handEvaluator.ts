import { rankValue } from "./cards";
import type { Card, EvaluatedHand, HandRank } from "./types";

const handRankValue: Record<HandRank, number> = {
  "high-card": 1,
  pair: 2,
  "two-pair": 3,
  "three-kind": 4,
  straight: 5,
  flush: 6,
  "full-house": 7,
  "four-kind": 8,
  "straight-flush": 9,
};

export function compareHands(left: EvaluatedHand, right: EvaluatedHand): number {
  const maxLength = Math.max(left.score.length, right.score.length);

  for (let index = 0; index < maxLength; index += 1) {
    const difference = (left.score[index] ?? 0) - (right.score[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

export function evaluateTexasHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    throw new Error("At least five cards are required to evaluate a poker hand.");
  }

  const combinations = fiveCardCombinations(cards);
  return combinations
    .map(evaluateFiveCards)
    .sort(compareHands)
    .at(-1)!;
}

function fiveCardCombinations(cards: Card[]): Card[][] {
  const results: Card[][] = [];

  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            results.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
          }
        }
      }
    }
  }

  return results;
}

function evaluateFiveCards(cards: Card[]): EvaluatedHand {
  const values = cards.map((card) => rankValue[card.rank]).sort((a, b) => b - a);
  const groups = groupValues(values);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straightHigh = getStraightHigh(values);

  if (flush && straightHigh) {
    return buildHand("straight-flush", [straightHigh], cards);
  }

  const four = groups.find((group) => group.count === 4);
  if (four) {
    return buildHand("four-kind", [four.value, highestExcept(values, [four.value])[0]], cards);
  }

  const three = groups.find((group) => group.count === 3);
  const pair = groups.find((group) => group.count === 2);
  if (three && pair) {
    return buildHand("full-house", [three.value, pair.value], cards);
  }

  if (flush) {
    return buildHand("flush", values, cards);
  }

  if (straightHigh) {
    return buildHand("straight", [straightHigh], cards);
  }

  if (three) {
    return buildHand("three-kind", [three.value, ...highestExcept(values, [three.value])], cards);
  }

  const pairs = groups.filter((group) => group.count === 2).map((group) => group.value);
  if (pairs.length >= 2) {
    const [topPair, secondPair] = pairs.sort((a, b) => b - a);
    return buildHand("two-pair", [topPair, secondPair, highestExcept(values, [topPair, secondPair])[0]], cards);
  }

  if (pair) {
    return buildHand("pair", [pair.value, ...highestExcept(values, [pair.value])], cards);
  }

  return buildHand("high-card", values, cards);
}

function buildHand(rank: HandRank, tiebreakers: number[], cards: Card[]): EvaluatedHand {
  return {
    rank,
    score: [handRankValue[rank], ...tiebreakers],
    cards,
  };
}

function groupValues(values: number[]) {
  const counts = new Map<number, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || right.value - left.value);
}

function getStraightHigh(values: number[]): number | undefined {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  const wheelValues = unique.includes(14) ? [...unique, 1] : unique;

  for (let index = 0; index <= wheelValues.length - 5; index += 1) {
    const window = wheelValues.slice(index, index + 5);
    if (window.every((value, offset) => value === window[0] - offset)) {
      return window[0] === 14 && window[4] === 10 ? 14 : window[0];
    }
  }

  if ([14, 5, 4, 3, 2].every((value) => unique.includes(value))) {
    return 5;
  }

  return undefined;
}

function highestExcept(values: number[], excluded: number[]): number[] {
  return values.filter((value) => !excluded.includes(value));
}
