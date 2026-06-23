import { getTableCardAriaLabel } from "../src/lib/client/tablesCardAriaLabel";

const TABLE_NAME_ZH = "深海桌";
const TABLE_NAME_EN = "Deep Sea";
const PLAYER_COUNT = 3;
const MAX_PLAYERS = 6;

const phaseMatrix = [
  { phase: "preflop", zhPhaseLabel: "翻前", enPhaseLabel: "preflop" },
  { phase: "flop", zhPhaseLabel: "翻牌", enPhaseLabel: "flop" },
  { phase: "turn", zhPhaseLabel: "转牌", enPhaseLabel: "turn" },
  { phase: "river", zhPhaseLabel: "河牌", enPhaseLabel: "river" },
  { phase: "showdown", zhPhaseLabel: "摊牌", enPhaseLabel: "showdown" },
  { phase: "mysteryPhase", zhPhaseLabel: "mysteryPhase", enPhaseLabel: "mysteryphase" },
] as const;

const allLabels: string[] = [];

for (const { phase, zhPhaseLabel, enPhaseLabel } of phaseMatrix) {
  const zhLabel = getTableCardAriaLabel(TABLE_NAME_ZH, PLAYER_COUNT, MAX_PLAYERS, phase, "zh");
  const zhExpected = `${TABLE_NAME_ZH}，${PLAYER_COUNT}/${MAX_PLAYERS} 人，阶段 ${zhPhaseLabel}`;
  if (zhLabel !== zhExpected) {
    throw new Error(
      `Unexpected zh aria-label for phase ${phase}: ${JSON.stringify({ zhLabel, zhExpected })}`,
    );
  }
  allLabels.push(zhLabel);

  const enLabel = getTableCardAriaLabel(TABLE_NAME_EN, PLAYER_COUNT, MAX_PLAYERS, phase, "en");
  const enExpected = `${TABLE_NAME_EN}, ${PLAYER_COUNT}/${MAX_PLAYERS} players, phase ${enPhaseLabel}`;
  if (enLabel !== enExpected) {
    throw new Error(
      `Unexpected en aria-label for phase ${phase}: ${JSON.stringify({ enLabel, enExpected })}`,
    );
  }
  allLabels.push(enLabel);
}

const forbiddenTokens = ["handId", "Hand #", "进入", "Enter", "Spectate"];
for (const label of allLabels) {
  for (const token of forbiddenTokens) {
    if (label.includes(token)) {
      throw new Error(`Aria-label must not include ${token}: ${JSON.stringify(label)}`);
    }
  }
}

console.log("Tables card aria-label smoke test passed.");
