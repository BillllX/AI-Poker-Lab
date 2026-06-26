export type TablePhaseLanguage = "zh" | "en";

const TABLE_PHASE_LABELS_ZH: Record<string, string> = {
  flop: "翻牌",
  preflop: "翻前",
  river: "河牌",
  showdown: "摊牌",
  turn: "转牌",
};

export function formatTablePhase(phase: string, language: TablePhaseLanguage) {
  const normalized = phase.toLowerCase();
  if (language === "en") {
    return normalized;
  }
  return TABLE_PHASE_LABELS_ZH[normalized] ?? phase;
}
