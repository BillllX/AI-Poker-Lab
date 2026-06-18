export const clubTimeZone = "Asia/Shanghai";

export function currentClubDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: clubTimeZone,
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function previousClubDay(dayKey = currentClubDay()) {
  return addDaysToClubDay(dayKey, -1);
}

function addDaysToClubDay(dayKey: string, days: number) {
  const [year, month, day] = dayKey.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid club day key: ${dayKey}`);
  }

  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}
