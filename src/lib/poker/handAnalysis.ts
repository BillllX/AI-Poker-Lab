import { formatCard, rankValue, ranks } from "./cards";
import { evaluateTexasHand } from "./handEvaluator";
import type { AgentDecisionHandAnalysis, Card, HandDrawType, HandRank, Rank, Suit } from "./types";

const handRankLabels: Record<HandRank | "preflop", string> = {
  preflop: "翻前手牌",
  "high-card": "高牌",
  pair: "一对",
  "two-pair": "两对",
  "three-kind": "三条",
  straight: "顺子",
  flush: "同花",
  "full-house": "葫芦",
  "four-kind": "四条",
  "straight-flush": "同花顺",
};

const drawPriority: Record<HandDrawType, number> = {
  "flush-draw": 1,
  "open-ended-straight-draw": 2,
  "gutshot-straight-draw": 3,
  overcards: 4,
  "backdoor-flush-draw": 5,
};

export function analyzeDecisionHand(holeCards: Card[], communityCards: Card[]): AgentDecisionHandAnalysis {
  const madeHand = communityCards.length >= 3
    ? madeHandAnalysis(holeCards, communityCards)
    : preflopAnalysis(holeCards);
  const boardTexture = analyzeBoardTexture(communityCards);
  const draws = detectDraws(holeCards, communityCards);
  const tacticalNotes = buildTacticalNotes(madeHand, draws, boardTexture, communityCards);

  return {
    madeHand,
    draws,
    boardTexture,
    tacticalNotes,
  };
}

function madeHandAnalysis(holeCards: Card[], communityCards: Card[]): AgentDecisionHandAnalysis["madeHand"] {
  const evaluated = evaluateTexasHand([...holeCards, ...communityCards]);
  const label = handRankLabels[evaluated.rank];
  const bestCards = evaluated.cards;

  return {
    rank: evaluated.rank,
    label,
    bestCards,
    summary: `当前最佳成牌是${label}，最佳五张为 ${formatCards(bestCards)}。`,
  };
}

function preflopAnalysis(holeCards: Card[]): AgentDecisionHandAnalysis["madeHand"] {
  const [left, right] = holeCards;
  const pair = left && right && left.rank === right.rank;
  const suited = left && right && left.suit === right.suit;
  const connected = left && right && Math.abs(cardValue(left) - cardValue(right)) <= 1;
  const broadwayCount = holeCards.filter((card) => cardValue(card) >= 10).length;
  const traits = [
    pair ? "口袋对子" : undefined,
    suited ? "同花起手" : undefined,
    connected ? "连续张" : undefined,
    broadwayCount >= 2 ? "两张 Broadway 高牌" : broadwayCount === 1 ? "一张高牌" : undefined,
  ].filter((value): value is string => Boolean(value));
  const label = pair ? `口袋${left.rank}对子` : traits[0] ?? "普通翻前手牌";

  return {
    rank: "preflop",
    label,
    bestCards: holeCards,
    summary: `翻前手牌 ${formatCards(holeCards)}：${traits.length > 0 ? traits.join("、") : "暂无明显成牌优势"}。`,
  };
}

function detectDraws(holeCards: Card[], communityCards: Card[]): AgentDecisionHandAnalysis["draws"] {
  if (communityCards.length === 0) {
    return [];
  }

  const cards = [...holeCards, ...communityCards];
  const draws = [
    ...detectFlushDraws(cards, communityCards),
    ...detectStraightDraws(cards),
    ...detectOvercards(holeCards, communityCards),
  ];
  const unique = new Map(draws.map((draw) => [draw.type, draw]));
  return [...unique.values()].sort((left, right) => drawPriority[left.type] - drawPriority[right.type]);
}

function detectFlushDraws(cards: Card[], communityCards: Card[]): AgentDecisionHandAnalysis["draws"] {
  const draws: AgentDecisionHandAnalysis["draws"] = [];
  const counts = countBySuit(cards);

  for (const [suit, suitedCards] of counts) {
    if (suitedCards.length === 4) {
      draws.push({
        type: "flush-draw",
        label: `${suitLabel(suit)}同花听牌`,
        outs: 13 - suitedCards.length,
      });
    } else if (communityCards.length === 3 && suitedCards.length === 3) {
      draws.push({
        type: "backdoor-flush-draw",
        label: `${suitLabel(suit)}后门同花听牌`,
        outs: 10,
      });
    }
  }

  return draws;
}

function detectStraightDraws(cards: Card[]): AgentDecisionHandAnalysis["draws"] {
  const values = uniqueStraightValues(cards);
  const completers = ranks
    .map((rank) => rankValue[rank])
    .filter((value) => !values.includes(value))
    .filter((value) => hasStraight([...values, value]));

  if (completers.length >= 2) {
    return [
      {
        type: "open-ended-straight-draw",
        label: `两头顺听牌，补到 ${rankLabels(completers)} 可成顺`,
        outs: straightOuts(completers, cards),
      },
    ];
  }

  if (completers.length === 1) {
    return [
      {
        type: "gutshot-straight-draw",
        label: `卡顺听牌，补到 ${rankLabels(completers)} 可成顺`,
        outs: straightOuts(completers, cards),
      },
    ];
  }

  return [];
}

function detectOvercards(holeCards: Card[], communityCards: Card[]): AgentDecisionHandAnalysis["draws"] {
  if (communityCards.length === 0) {
    return [];
  }

  const boardHigh = Math.max(...communityCards.map(cardValue));
  const overcards = holeCards.filter((card) => cardValue(card) > boardHigh);
  if (overcards.length === 0) {
    return [];
  }

  return [
    {
      type: "overcards",
      label: `${formatCards(overcards)} 是高于牌面的 overcard`,
      outs: overcards.length * 3,
    },
  ];
}

function analyzeBoardTexture(communityCards: Card[]): AgentDecisionHandAnalysis["boardTexture"] {
  const rankCounts = countByRank(communityCards);
  const suitCounts = countBySuit(communityCards);
  const paired = [...rankCounts.values()].some((count) => count >= 2);
  const monotone = communityCards.length >= 3 && [...suitCounts.values()].some((cards) => cards.length === communityCards.length);
  const twoTone = communityCards.length >= 3 && [...suitCounts.values()].some((cards) => cards.length >= communityCards.length - 1);
  const connected = boardConnected(communityCards);
  const highCardRank = highRank(communityCards);
  const parts = [
    paired ? "牌面有对子，存在葫芦/三条风险" : undefined,
    monotone ? "单色牌面，同花风险很高" : twoTone ? "两色牌面，存在同花听牌风险" : undefined,
    connected ? "牌面较连续，顺子风险较高" : undefined,
    highCardRank ? `最高公共牌为 ${highCardRank}` : "尚无公共牌",
  ].filter((value): value is string => Boolean(value));

  return {
    paired,
    monotone,
    twoTone: twoTone && !monotone,
    connected,
    highCardRank,
    summary: parts.join("；") + "。",
  };
}

function buildTacticalNotes(
  madeHand: AgentDecisionHandAnalysis["madeHand"],
  draws: AgentDecisionHandAnalysis["draws"],
  boardTexture: AgentDecisionHandAnalysis["boardTexture"],
  communityCards: Card[],
) {
  const notes = [madeHand.summary];

  if (draws.length > 0) {
    notes.push(`当前听牌/潜力：${draws.map((draw) => draw.label).join("；")}。`);
  } else if (communityCards.length > 0) {
    notes.push("当前没有明显同花或顺子听牌。");
  }

  notes.push(`牌面结构：${boardTexture.summary}`);

  if (madeHand.rank === "high-card" && draws.length > 0) {
    notes.push("当前主要依赖听牌潜力，不是已成强牌。");
  }
  if (boardTexture.monotone || boardTexture.connected || boardTexture.paired) {
    notes.push("牌面存在被更强组合压制的风险，下注和跟注需结合底池赔率与对手行动。");
  }

  return notes;
}

function countBySuit(cards: Card[]) {
  const counts = new Map<Suit, Card[]>();
  for (const card of cards) {
    counts.set(card.suit, [...(counts.get(card.suit) ?? []), card]);
  }
  return counts;
}

function countByRank(cards: Card[]) {
  const counts = new Map<Rank, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  }
  return counts;
}

function uniqueStraightValues(cards: Card[]) {
  const values = [...new Set(cards.map(cardValue))];
  return values.includes(14) ? [...values, 1] : values;
}

function hasStraight(values: number[]) {
  const unique = [...new Set(values)].sort((left, right) => left - right);
  for (let index = 0; index <= unique.length - 5; index += 1) {
    const window = unique.slice(index, index + 5);
    if (window.every((value, offset) => value === window[0] + offset)) {
      return true;
    }
  }
  return false;
}

function straightOuts(completers: number[], knownCards: Card[]) {
  return completers.reduce((sum, value) => {
    const rank = rankFromValue(value);
    const knownCount = knownCards.filter((card) => card.rank === rank).length;
    return sum + Math.max(0, 4 - knownCount);
  }, 0);
}

function boardConnected(cards: Card[]) {
  if (cards.length < 3) {
    return false;
  }

  const values = uniqueStraightValues(cards).sort((left, right) => left - right);
  for (let index = 0; index < values.length - 1; index += 1) {
    if (values[index + 1] - values[index] <= 2) {
      return true;
    }
  }
  return false;
}

function highRank(cards: Card[]): Rank | undefined {
  return cards.reduce<Rank | undefined>((high, card) => (!high || rankValue[card.rank] > rankValue[high] ? card.rank : high), undefined);
}

function rankLabels(values: number[]) {
  return values.map((value) => rankFromValue(value)).join("/");
}

function rankFromValue(value: number): Rank {
  if (value === 1) {
    return "A";
  }
  return ranks.find((rank) => rankValue[rank] === value)!;
}

function cardValue(card: Card) {
  return rankValue[card.rank];
}

function formatCards(cards: Card[]) {
  return cards.map(formatCard).join(" ");
}

function suitLabel(suit: Suit) {
  return { s: "黑桃", h: "红桃", d: "方片", c: "梅花" }[suit];
}
