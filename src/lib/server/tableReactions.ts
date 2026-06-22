import { randomUUID } from "node:crypto";
import { type ReactionEmoji } from "../poker/reactions";
import type { TableReaction } from "../poker/types";

export { isReactionEmoji, REACTION_EMOJIS, type ReactionEmoji } from "../poker/reactions";

const USER_COOLDOWN_MS = 10_000;
const TABLE_WINDOW_MS = 60_000;
const TABLE_MAX_PER_WINDOW = 30;
const MAX_REACTIONS = 20;

type TableReactionStore = {
  reactions: TableReaction[];
  userLastAt: Map<string, number>;
  globalTimestamps: number[];
};

const stores = new Map<string, TableReactionStore>();

function getStore(tableId: string): TableReactionStore {
  const existing = stores.get(tableId);
  if (existing) {
    return existing;
  }

  const created: TableReactionStore = {
    reactions: [],
    userLastAt: new Map(),
    globalTimestamps: [],
  };
  stores.set(tableId, created);
  return created;
}

export function getTableReactions(tableId: string): TableReaction[] {
  return getStore(tableId).reactions;
}

export function clearTableReactions(tableId: string) {
  stores.delete(tableId);
}

export function addTableReaction(
  tableId: string,
  emoji: ReactionEmoji,
  actorKey: string,
): { ok: true; reaction: TableReaction } | { ok: false; error: string; status: number } {
  const store = getStore(tableId);
  const now = Date.now();

  const lastAt = store.userLastAt.get(actorKey) ?? 0;
  if (now - lastAt < USER_COOLDOWN_MS) {
    return { ok: false, error: "Please wait before sending another reaction.", status: 429 };
  }

  store.globalTimestamps = store.globalTimestamps.filter((timestamp) => now - timestamp < TABLE_WINDOW_MS);
  if (store.globalTimestamps.length >= TABLE_MAX_PER_WINDOW) {
    return { ok: false, error: "This table is receiving reactions too quickly.", status: 429 };
  }

  const reaction: TableReaction = {
    id: randomUUID(),
    emoji,
    at: new Date(now).toISOString(),
  };

  store.reactions.push(reaction);
  if (store.reactions.length > MAX_REACTIONS) {
    store.reactions.splice(0, store.reactions.length - MAX_REACTIONS);
  }

  store.userLastAt.set(actorKey, now);
  store.globalTimestamps.push(now);

  return { ok: true, reaction };
}
