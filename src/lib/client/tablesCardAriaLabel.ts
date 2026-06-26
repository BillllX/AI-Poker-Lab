import { formatTablePhase } from "@/lib/client/formatTablePhase";

type TablesCardAriaLanguage = "zh" | "en";

export function getTableCardAriaLabel(
  name: string,
  playerCount: number,
  maxPlayers: number,
  phase: string,
  language: TablesCardAriaLanguage,
): string {
  const players = `${playerCount}/${maxPlayers}`;
  const phaseLabel = formatTablePhase(phase, language);
  if (language === "zh") {
    return `${name}，${players} 人，阶段 ${phaseLabel}`;
  }
  return `${name}, ${players} players, phase ${phaseLabel}`;
}
