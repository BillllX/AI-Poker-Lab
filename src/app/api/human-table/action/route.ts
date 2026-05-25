import { getHumanTableManager } from "@/lib/server/humanTableManager";
import type { PokerAction } from "@/lib/poker/types";
import { getUserFromSessionCookie } from "@/lib/server/userRegistry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getUserFromSessionCookie(request.headers.get("cookie"));
  if (!user) {
    return Response.json({ error: "Login is required." }, { status: 401 });
  }

  try {
    const input = await request.json();
    const action = parseAction(input);
    return Response.json(getHumanTableManager().submitAction(user.id, action));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to submit action." }, { status: 400 });
  }
}

function parseAction(input: unknown): PokerAction {
  if (!input || typeof input !== "object") {
    throw new Error("Action is required.");
  }

  const type = "type" in input ? input.type : undefined;
  if (type === "fold" || type === "check" || type === "call") {
    return { type };
  }
  if (type === "bet" || type === "raise") {
    const amount = Math.floor(Number("amount" in input ? input.amount : 0));
    return { type, amount };
  }
  throw new Error("Action type is invalid.");
}
