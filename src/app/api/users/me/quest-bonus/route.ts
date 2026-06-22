import {
  grantQuestBonus,
  listQuestBonusToday,
  type QuestBonusReason,
  sumQuestBonusToday,
} from "@/lib/server/questBonus";
import { getUserFromSessionCookieLite } from "@/lib/server/userRegistry";

const VALID_REASONS: QuestBonusReason[] = ["quest_star", "quest_core", "quest_master"];

export async function GET(request: Request) {
  const user = await getUserFromSessionCookieLite(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  const grantedToday = await sumQuestBonusToday(user.id);
  const breakdown = await listQuestBonusToday(user.id);
  return Response.json({ breakdown, grantedToday });
}

export async function POST(request: Request) {
  const user = await getUserFromSessionCookieLite(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { reason?: string } | null;
  const reason = payload?.reason?.trim() as QuestBonusReason | undefined;
  if (!reason || !VALID_REASONS.includes(reason)) {
    return Response.json({ error: "Invalid reason." }, { status: 400 });
  }

  const result = await grantQuestBonus(user.id, reason);
  if ("existing" in result && result.conflict) {
    return Response.json({ error: "Already claimed for this reason today." }, { status: 409 });
  }
  if ("ineligible" in result && result.ineligible) {
    return Response.json({ error: "Quest bonus requirements were not met." }, { status: 409 });
  }

  return Response.json({
    granted: result.granted,
    ledgerId: result.ledger?.id,
    pointsBalance: result.pointsBalance,
    reason,
  });
}
