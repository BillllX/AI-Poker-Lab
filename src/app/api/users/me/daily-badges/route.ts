import {
  claimDailyBadge,
  DAILY_BADGE_KINDS,
  listTodayBadges,
  type DailyBadgeKind,
} from "@/lib/server/userDailyBadges";
import { getUserFromSessionCookieLite } from "@/lib/server/userRegistry";

export async function GET(request: Request) {
  const user = await getUserFromSessionCookieLite(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  const badges = await listTodayBadges(user.id);
  return Response.json({ badges });
}

export async function POST(request: Request) {
  const user = await getUserFromSessionCookieLite(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { badge?: string; context?: string } | null;
  const badge = payload?.badge?.trim();
  if (!badge || !DAILY_BADGE_KINDS.includes(badge as DailyBadgeKind) || badge === "highlight") {
    return Response.json({ error: "Invalid badge." }, { status: 400 });
  }

  const context =
    payload?.context === "quest_core"
      ? "quest_core"
      : payload?.context === "quest_active"
        ? "quest_active"
        : undefined;
  const awarded = await claimDailyBadge(user.id, badge as DailyBadgeKind, context);
  if (!awarded) {
    return Response.json({ error: "Badge requirements were not met." }, { status: 409 });
  }

  return Response.json({ badge: awarded });
}
