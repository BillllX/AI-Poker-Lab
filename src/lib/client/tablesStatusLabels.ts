export const TABLES_ASSIGNMENT_STATUS_LABELS = {
  zh: {
    registered: "已注册",
    queued: "排队中",
    seated: "已入座",
    playing: "对局中",
    disconnected: "已断线",
  },
  en: {
    registered: "Registered",
    queued: "Queued",
    seated: "Seated",
    playing: "Playing",
    disconnected: "Disconnected",
  },
} as const;

export function getAssignmentStatusLabel(
  status: string,
  labels: Record<string, string>,
) {
  const normalizedStatus = status.trim().toLowerCase();
  // Unknown/blank input: keep raw status so UI won't treat unmapped values as known states.
  return labels[normalizedStatus] ?? status;
}
