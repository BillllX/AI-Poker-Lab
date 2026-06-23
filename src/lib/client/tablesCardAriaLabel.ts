type TablesCardAriaLanguage = "zh" | "en";

const TABLE_PHASE_LABELS_ZH: Record<string, string> = {
  preflop: "翻前",
  flop: "翻牌",
  turn: "转牌",
  river: "河牌",
  showdown: "摊牌",
};

function formatTableCardPhase(phase: string, language: TablesCardAriaLanguage): string {
  const normalized = phase.toLowerCase();
  if (language === "en") {
    return normalized;
  }
  return TABLE_PHASE_LABELS_ZH[normalized] ?? phase;
}

export function getTableCardAriaLabel(
  name: string,
  playerCount: number,
  maxPlayers: number,
  phase: string,
  language: TablesCardAriaLanguage,
): string {
  const players = `${playerCount}/${maxPlayers}`;
  const phaseLabel = formatTableCardPhase(phase, language);
  if (language === "zh") {
    return `${name}，${players} 人，阶段 ${phaseLabel}`;
  }
  return `${name}, ${players} players, phase ${phaseLabel}`;
}
