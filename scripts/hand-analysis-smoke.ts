import { strict as assert } from "node:assert";
import { analyzeDecisionHand } from "../src/lib/poker/handAnalysis";
import type { Card, HandDrawType, Rank, Suit } from "../src/lib/poker/types";

const ranks = new Set(["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]);
const suits = new Set(["s", "h", "d", "c"]);

function main() {
  assertHighCardsWithNutFlushAndBroadwayDraw();
  assertOpenEndedStraightDraw();
  assertFlushDrawWithOvercard();
  assertPocketPairPreflop();
  assertTwoPairMadeHand();
  assertComboDraw();
  console.log("Hand analysis smoke tests passed.");
}

function assertHighCardsWithNutFlushAndBroadwayDraw() {
  const analysis = analyzeDecisionHand(cards("Ah Kh"), cards("Qh Jh 2c"));
  assert.equal(analysis.madeHand.rank, "high-card");
  assertDraw(analysis, "flush-draw");
  assertDraw(analysis, "gutshot-straight-draw");
  assert.ok(analysis.tacticalNotes.some((note) => note.includes("不是已成强牌")));
}

function assertOpenEndedStraightDraw() {
  const analysis = analyzeDecisionHand(cards("8s 9d"), cards("6c 7h 2s"));
  assert.equal(analysis.madeHand.rank, "high-card");
  const draw = assertDraw(analysis, "open-ended-straight-draw");
  assert.equal(draw.outs, 8);
}

function assertFlushDrawWithOvercard() {
  const analysis = analyzeDecisionHand(cards("As 2s"), cards("Ks 7s 3d"));
  assert.equal(analysis.madeHand.rank, "high-card");
  assertDraw(analysis, "flush-draw");
  assertDraw(analysis, "overcards");
}

function assertPocketPairPreflop() {
  const analysis = analyzeDecisionHand(cards("Qd Qc"), []);
  assert.equal(analysis.madeHand.rank, "preflop");
  assert.match(analysis.madeHand.label, /口袋Q对子/);
  assert.equal(analysis.draws.length, 0);
}

function assertTwoPairMadeHand() {
  const analysis = analyzeDecisionHand(cards("Ah 7d"), cards("Ac 7s 2h"));
  assert.equal(analysis.madeHand.rank, "two-pair");
  assert.match(analysis.madeHand.summary, /两对/);
}

function assertComboDraw() {
  const analysis = analyzeDecisionHand(cards("9h Th"), cards("Jh Qh 2c"));
  assert.equal(analysis.madeHand.rank, "high-card");
  assertDraw(analysis, "flush-draw");
  assertDraw(analysis, "open-ended-straight-draw");
}

function assertDraw(analysis: ReturnType<typeof analyzeDecisionHand>, type: HandDrawType) {
  const draw = analysis.draws.find((item) => item.type === type);
  assert.ok(draw, `expected ${type} in ${JSON.stringify(analysis.draws)}`);
  return draw;
}

function cards(input: string): Card[] {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => {
      const rank = value[0] as Rank;
      const suit = value[1] as Suit;
      assert.ok(ranks.has(rank), `invalid rank in ${value}`);
      assert.ok(suits.has(suit), `invalid suit in ${value}`);
      return { rank, suit };
    });
}

main();
