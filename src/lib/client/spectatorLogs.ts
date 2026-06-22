import type { ActionLog } from "@/lib/poker/types";

/** Max action-log rows rendered in the spectator side panel. */
export const SPECTATOR_LOG_DISPLAY_CAP = 60;

type CapSpectatorLogsOptions = {
  highlightHandId?: number;
  limit?: number;
};

export function capSpectatorLogs(
  logs: ActionLog[],
  { highlightHandId, limit = SPECTATOR_LOG_DISPLAY_CAP }: CapSpectatorLogsOptions = {},
): { hiddenCount: number; logs: ActionLog[] } {
  if (logs.length <= limit) {
    return { logs, hiddenCount: 0 };
  }

  if (highlightHandId === undefined) {
    return {
      logs: logs.slice(0, limit),
      hiddenCount: logs.length - limit,
    };
  }

  const highlighted = logs.filter((log) => log.handId === highlightHandId);
  const rest = logs.filter((log) => log.handId !== highlightHandId);
  const slotsForRest = Math.max(limit - highlighted.length, 0);
  const visibleIds = new Set([
    ...rest.slice(0, slotsForRest).map((log) => log.id),
    ...highlighted.map((log) => log.id),
  ]);

  const visible = logs.filter((log) => visibleIds.has(log.id));
  return {
    logs: visible,
    hiddenCount: logs.length - visible.length,
  };
}
