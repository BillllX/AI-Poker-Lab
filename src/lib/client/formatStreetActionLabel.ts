import type { GameSnapshot } from "@/lib/poker/types";

export type StreetActionLanguage = "zh" | "en";

export function formatStreetActionLabel(
  item: GameSnapshot["actionHistory"][number],
  language: StreetActionLanguage,
) {
  if (item.action === "post-blind") {
    const label = language === "zh" ? "盲注" : "blind";
    return item.amount ? `${label} ${item.amount}` : label;
  }
  if (item.action === "call") {
    const label = language === "zh" ? "跟注" : "Call";
    return item.amount ? `${label} ${item.amount}` : label;
  }
  if (item.action === "raise") {
    const label = language === "zh" ? "加注" : "Raise";
    return item.amount ? `${label} +${item.amount}` : label;
  }
  if (item.action === "bet") {
    const label = language === "zh" ? "下注" : "Bet";
    return item.targetBet ? `${label} ${item.targetBet}` : item.amount ? `${label} ${item.amount}` : label;
  }
  if (item.action === "check") {
    return language === "zh" ? "过牌" : "Check";
  }
  if (item.action === "fold") {
    return language === "zh" ? "弃牌" : "Fold";
  }
  return item.action;
}
