import { createHash } from "node:crypto";
import { initialStack, PokerGameEngine } from "../poker/gameEngine";
import type { AgentDecisionRequest, AgentDecisionResponse, GameSnapshot, LegalAction, PokerAction } from "../poker/types";
import type { ClubUser } from "./userRegistry";
import { logger } from "./logger";

const maxHumanPlayers = 6;
const minHumanPlayersToStart = 2;
const decisionTimeoutMs = 180_000;
const handResultPauseMs = 6_000;
const humanTableId = "human-table-1";
const humanTableName = "Live Human Table";

type HumanParticipant = {
  joinedAt: string;
  lastKnownEffectiveStack: number;
  leftAt?: string;
  name: string;
  playerId: string;
  userId: string;
};

type PendingDecision = {
  action?: PokerAction;
  expiresAt: string;
  handId: number;
  legalActions: LegalAction[];
  minRaise: number;
  playerId: string;
  playerName: string;
  reject: (error: Error) => void;
  resolve: (response: AgentDecisionResponse) => void;
  stack: number;
  startedAt: string;
  timeout: ReturnType<typeof setTimeout>;
  toCall: number;
};

type HumanTable = {
  createdAt: string;
  engine: PokerGameEngine;
  id: string;
  name: string;
  participants: Map<string, HumanParticipant>;
  passwordHash: string;
};

export type HumanPlayerStat = {
  committedChips: number;
  currentStack: number;
  effectiveStack: number;
  inSeat: boolean;
  joinedAt: string;
  leftAt?: string;
  name: string;
  playerId: string;
  profit: number;
  status?: string;
  userId: string;
};

export type HumanTableSnapshot = {
  game?: GameSnapshot;
  myPlayerId?: string;
  mySeatStatus: "not-logged-in" | "no-table" | "seated" | "spectator";
  pendingDecision?: {
    expiresAt: string;
    handId: number;
    legalActions: LegalAction[];
    minRaise: number;
    playerId: string;
    playerName: string;
    stack: number;
    startedAt: string;
    toCall: number;
  };
  playerStats: HumanPlayerStat[];
  tableStatus: {
    createdAt?: string;
    hasTable: boolean;
    maxPlayers: number;
    needsCreate: boolean;
    needsJoin: boolean;
    playerCount: number;
    running: boolean;
    tableId?: string;
    tableName?: string;
  };
};

const globalForHumanTable = globalThis as typeof globalThis & {
  __texasPokerHumanTableManager?: HumanTableManager;
};

export class HumanTableManager {
  private activeTable?: HumanTable;
  private inFlight = false;
  private pendingDecision?: PendingDecision;
  private playersPendingRemoval = new Set<string>();
  private startPromise?: Promise<void>;
  private snapshotCache = new Map<string, { expiresAt: number; snapshot: HumanTableSnapshot; version: string }>();
  private timer?: ReturnType<typeof setInterval>;

  createTable(user: ClubUser, password: string) {
    const normalizedPassword = normalizePassword(password);
    if (this.activeTable) {
      throw new Error("A human table is already active. Join it with the table password.");
    }

    const player = userToHumanPlayer(user);
    const table: HumanTable = {
      createdAt: new Date().toISOString(),
      engine: new PokerGameEngine([player], { tableId: humanTableId, tableName: humanTableName }),
      id: humanTableId,
      name: humanTableName,
      participants: new Map(),
      passwordHash: hashPassword(normalizedPassword),
    };
    table.participants.set(user.id, {
      joinedAt: table.createdAt,
      lastKnownEffectiveStack: initialStack,
      name: user.name,
      playerId: player.id,
      userId: user.id,
    });
    this.activeTable = table;
    this.invalidateSnapshotCache();
    logger.info("human_table.created", { tableId: table.id, ownerUserId: user.id });
    return this.snapshot(user.id);
  }

  join(user: ClubUser, password: string) {
    const table = this.requireTable();
    if (hashPassword(normalizePassword(password)) !== table.passwordHash) {
      throw new Error("Table password is incorrect.");
    }

    const player = userToHumanPlayer(user);
    const snapshot = table.engine.snapshot();
    if (snapshot.players.some((item) => item.id === player.id)) {
      this.rememberParticipant(table, user, player.id, snapshot.players.find((item) => item.id === player.id)?.stack ?? initialStack);
      this.invalidateSnapshotCache();
      return this.snapshot(user.id);
    }

    if (snapshot.players.length >= maxHumanPlayers) {
      throw new Error("The human table is full.");
    }

    table.engine.addPlayers([player]);
    this.rememberParticipant(table, user, player.id, initialStack);
    this.invalidateSnapshotCache();
    logger.info("human_table.player_joined", { tableId: table.id, ownerUserId: user.id, playerId: player.id });
    void this.maybeStart();
    return this.snapshot(user.id);
  }

  leave(userId: string) {
    const table = this.activeTable;
    if (!table) {
      return { left: false, tableClosed: false };
    }

    const participant = table.participants.get(userId);
    if (!participant) {
      return { left: false, tableClosed: false };
    }

    const snapshot = table.engine.snapshot();
    const player = snapshot.players.find((item) => item.id === participant.playerId);
    if (player) {
      participant.lastKnownEffectiveStack = player.stack + player.totalCommitted;
      if (this.pendingDecision?.playerId === player.id) {
        this.resolvePendingWithFallback("Player left the human table.");
      }
      table.engine.settlePlayer(player.id, "left");
      this.invalidateSnapshotCache();
      const hasOtherSeatedPlayer = snapshot.players.some((item) => item.id !== player.id && item.status !== "out");
      if (!hasOtherSeatedPlayer) {
        table.engine.removePlayers([player.id]);
        this.invalidateSnapshotCache();
        participant.leftAt = new Date().toISOString();
        logger.info("human_table.player_left", { tableId: table.id, ownerUserId: userId, playerId: participant.playerId });
        return { left: true, tableClosed: this.closeTable(table, "last_player_left") };
      }
      if (this.inFlight || player.totalCommitted > 0) {
        this.playersPendingRemoval.add(player.id);
      } else {
        table.engine.removePlayers([player.id]);
        this.invalidateSnapshotCache();
      }
    }
    participant.leftAt = new Date().toISOString();
    logger.info("human_table.player_left", { tableId: table.id, ownerUserId: userId, playerId: participant.playerId });

    const tableClosed = this.closeIfEmpty();
    return { left: true, tableClosed };
  }

  snapshot(userId?: string): HumanTableSnapshot {
    const table = this.activeTable;
    if (!table) {
      return {
        mySeatStatus: userId ? "no-table" : "not-logged-in",
        playerStats: [],
        tableStatus: {
          hasTable: false,
          maxPlayers: maxHumanPlayers,
          needsCreate: true,
          needsJoin: false,
          playerCount: 0,
          running: false,
        },
      };
    }

    const rawGame = table.engine.snapshot();
    const myParticipant = userId ? table.participants.get(userId) : undefined;
    const myPlayerId = myParticipant?.playerId;
    const isSeated = Boolean(myPlayerId && rawGame.players.some((player) => player.id === myPlayerId && player.status !== "out"));
    const game = publicGameForUser(rawGame, userId);

    return {
      game,
      myPlayerId,
      mySeatStatus: !userId ? "not-logged-in" : isSeated ? "seated" : "spectator",
      pendingDecision: this.publicPendingDecision(),
      playerStats: this.playerStats(table, rawGame),
      tableStatus: {
        createdAt: table.createdAt,
        hasTable: true,
        maxPlayers: maxHumanPlayers,
        needsCreate: false,
        needsJoin: Boolean(userId && !isSeated),
        playerCount: rawGame.players.length,
        running: rawGame.running,
        tableId: table.id,
        tableName: table.name,
      },
    };
  }

  cachedSnapshot(userId?: string, maxAgeMs = 750) {
    const key = userId ?? "anonymous";
    const now = Date.now();
    const cached = this.snapshotCache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached;
    }

    const snapshot = this.snapshot(userId);
    const next = {
      expiresAt: now + maxAgeMs,
      snapshot,
      version: humanSnapshotVersion(snapshot, key),
    };
    this.snapshotCache.set(key, next);
    if (this.snapshotCache.size > 200) {
      for (const [cacheKey, value] of this.snapshotCache) {
        if (value.expiresAt <= now) {
          this.snapshotCache.delete(cacheKey);
        }
      }
    }
    return next;
  }

  submitAction(userId: string, action: PokerAction) {
    const table = this.requireTable();
    const participant = table.participants.get(userId);
    const pending = this.pendingDecision;
    if (!participant || !pending || participant.playerId !== pending.playerId) {
      throw new Error("It is not your turn to act.");
    }

    const normalizedAction = validateHumanAction(action, pending, table.engine.snapshot());
    clearTimeout(pending.timeout);
    this.pendingDecision = undefined;
    this.invalidateSnapshotCache();
    pending.resolve({
      type: "action_response",
      tableId: table.id,
      playerId: pending.playerId,
      action: normalizedAction,
      reasoning: "Human player action.",
    });
    return this.snapshot(userId);
  }

  private async maybeStart() {
    const table = this.activeTable;
    if (!table || table.engine.isRunning() || this.startPromise) {
      return;
    }

    if (table.engine.snapshot().players.filter((player) => player.stack > 0).length < minHumanPlayersToStart) {
      return;
    }

    this.startPromise = this.startLoop().finally(() => {
      this.startPromise = undefined;
    });
    await this.startPromise;
  }

  private async startLoop() {
    const table = this.requireTable();
    table.engine.setRunning(true);
    logger.info("human_table.started", { tableId: table.id, playerCount: table.engine.snapshot().players.length });

    if (!this.timer) {
      this.timer = setInterval(() => {
        void this.tick();
      }, 1_200);
    }

    void this.tick();
  }

  private async tick() {
    const table = this.activeTable;
    if (!table || !table.engine.isRunning() || this.inFlight) {
      return;
    }

    this.inFlight = true;
    try {
      const played = await table.engine.playOneHand((request) => this.requestHumanAction(request));
      this.refreshParticipantStacks(table);
      this.invalidateSnapshotCache();
      if (!played) {
        table.engine.setRunning(false);
        this.invalidateSnapshotCache();
        this.stopTimer();
        this.closeIfEmpty();
        return;
      }

      await sleep(handResultPauseMs);
      this.removePendingPlayers(table);
      this.removeBustedPlayers(table);
      this.refreshParticipantStacks(table);
      this.invalidateSnapshotCache();
      if (table.engine.snapshot().players.filter((player) => player.stack > 0).length < minHumanPlayersToStart) {
        table.engine.setRunning(false);
        this.invalidateSnapshotCache();
        this.stopTimer();
      }
    } catch (error) {
      logger.error("human_table.hand_failed", { tableId: table.id, error });
      this.rejectPending(error instanceof Error ? error : new Error("Human table hand failed."));
      table.engine.setRunning(false);
      this.stopTimer();
    } finally {
      this.inFlight = false;
      this.closeIfEmpty();
    }
  }

  private requestHumanAction(request: AgentDecisionRequest) {
    const table = this.requireTable();
    const playerName = request.publicState.players.find((player) => player.id === request.playerId)?.name ?? request.playerId;

    if (this.pendingDecision) {
      this.rejectPending(new Error("A newer human decision replaced this request."));
    }

    return new Promise<AgentDecisionResponse>((resolve, reject) => {
      const expiresAtMs = Date.now() + decisionTimeoutMs;
      const timeout = setTimeout(() => {
        if (this.pendingDecision?.playerId === request.playerId && this.pendingDecision.handId === request.handId) {
          this.pendingDecision = undefined;
          this.invalidateSnapshotCache();
          resolve({
            type: "action_response",
            tableId: table.id,
            playerId: request.playerId,
            action: fallbackAction(request.toCall),
            reasoning: "Human player timed out. Conservative fallback was applied.",
          });
        }
      }, decisionTimeoutMs);

      this.pendingDecision = {
        expiresAt: new Date(expiresAtMs).toISOString(),
        handId: request.handId,
        legalActions: request.legalActions,
        minRaise: request.minRaise,
        playerId: request.playerId,
        playerName,
        reject,
        resolve,
        stack: request.stack,
        startedAt: new Date().toISOString(),
        timeout,
        toCall: request.toCall,
      };
      this.invalidateSnapshotCache();
    });
  }

  private resolvePendingWithFallback(reasoning: string) {
    const pending = this.pendingDecision;
    const table = this.activeTable;
    if (!pending || !table) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingDecision = undefined;
    this.invalidateSnapshotCache();
    pending.resolve({
      type: "action_response",
      tableId: table.id,
      playerId: pending.playerId,
      action: fallbackAction(pending.toCall),
      reasoning,
    });
  }

  private rejectPending(error: Error) {
    const pending = this.pendingDecision;
    if (!pending) {
      return;
    }
    clearTimeout(pending.timeout);
    this.pendingDecision = undefined;
    this.invalidateSnapshotCache();
    pending.reject(error);
  }

  private requireTable() {
    if (!this.activeTable) {
      throw new Error("No active human table exists.");
    }
    return this.activeTable;
  }

  private rememberParticipant(table: HumanTable, user: ClubUser, playerId: string, effectiveStack: number) {
    const existing = table.participants.get(user.id);
    table.participants.set(user.id, {
      joinedAt: existing?.joinedAt ?? new Date().toISOString(),
      lastKnownEffectiveStack: existing?.lastKnownEffectiveStack ?? effectiveStack,
      name: user.name,
      playerId,
      userId: user.id,
    });
  }

  private refreshParticipantStacks(table: HumanTable) {
    const snapshot = table.engine.snapshot();
    for (const participant of table.participants.values()) {
      const player = snapshot.players.find((item) => item.id === participant.playerId);
      if (player) {
        participant.lastKnownEffectiveStack = player.stack + player.totalCommitted;
      }
    }
  }

  private removeBustedPlayers(table: HumanTable) {
    const busted = table.engine.snapshot().players.filter((player) => player.stack <= 0);
    if (busted.length === 0) {
      return;
    }

    for (const player of busted) {
      const participant = [...table.participants.values()].find((item) => item.playerId === player.id);
      if (participant) {
        participant.lastKnownEffectiveStack = 0;
        participant.leftAt = new Date().toISOString();
      }
    }
    table.engine.removePlayers(busted.map((player) => player.id));
    this.invalidateSnapshotCache();
  }

  private removePendingPlayers(table: HumanTable) {
    if (this.playersPendingRemoval.size === 0) {
      return;
    }

    table.engine.removePlayers([...this.playersPendingRemoval]);
    this.playersPendingRemoval.clear();
    this.invalidateSnapshotCache();
  }

  private playerStats(table: HumanTable, game: GameSnapshot) {
    const playersById = new Map(game.players.map((player) => [player.id, player]));
    return [...table.participants.values()]
      .map((participant) => {
        const player = playersById.get(participant.playerId);
        const currentStack = player?.stack ?? participant.lastKnownEffectiveStack;
        const committedChips = player?.totalCommitted ?? 0;
        const effectiveStack = player ? currentStack + committedChips : participant.lastKnownEffectiveStack;
        return {
          committedChips,
          currentStack,
          effectiveStack,
          inSeat: Boolean(player),
          joinedAt: participant.joinedAt,
          leftAt: participant.leftAt,
          name: player?.name ?? participant.name,
          playerId: participant.playerId,
          profit: effectiveStack - initialStack,
          status: player?.status,
          userId: participant.userId,
        };
      })
      .sort((left, right) => right.profit - left.profit || left.name.localeCompare(right.name));
  }

  private publicPendingDecision() {
    const pending = this.pendingDecision;
    if (!pending) {
      return undefined;
    }
    return {
      expiresAt: pending.expiresAt,
      handId: pending.handId,
      legalActions: pending.legalActions,
      minRaise: pending.minRaise,
      playerId: pending.playerId,
      playerName: pending.playerName,
      stack: pending.stack,
      startedAt: pending.startedAt,
      toCall: pending.toCall,
    };
  }

  private closeIfEmpty() {
    const table = this.activeTable;
    if (!table || this.inFlight || table.engine.snapshot().players.length > 0) {
      return false;
    }

    return this.closeTable(table, "empty");
  }

  private closeTable(table: HumanTable, reason: string) {
    this.rejectPending(new Error("Human table closed."));
    table.engine.setRunning(false);
    this.stopTimer();
    if (this.activeTable === table) {
      this.activeTable = undefined;
    }
    this.playersPendingRemoval.clear();
    this.invalidateSnapshotCache();
    logger.info("human_table.closed", { tableId: table.id, reason });
    return true;
  }

  private invalidateSnapshotCache() {
    this.snapshotCache.clear();
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}

export function getHumanTableManager() {
  globalForHumanTable.__texasPokerHumanTableManager ??= new HumanTableManager();
  return globalForHumanTable.__texasPokerHumanTableManager;
}

function userToHumanPlayer(user: ClubUser) {
  return {
    id: `human_${user.id}`,
    kind: "human" as const,
    name: user.name,
    ownerUserId: user.id,
  };
}

function normalizePassword(password: string) {
  const normalized = password.trim();
  if (normalized.length < 4) {
    throw new Error("Table password must be at least 4 characters.");
  }
  if (normalized.length > 80) {
    throw new Error("Table password is too long.");
  }
  return normalized;
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function validateHumanAction(action: PokerAction, pending: PendingDecision, snapshot: GameSnapshot): PokerAction {
  if (!pending.legalActions.includes(action.type)) {
    throw new Error("This action is not currently legal.");
  }

  if (action.type !== "bet" && action.type !== "raise") {
    return { type: action.type };
  }

  const amount = Math.floor(Number(action.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Bet amount must be a positive number.");
  }

  const player = snapshot.players.find((item) => item.id === pending.playerId);
  const maxTargetBet = (player?.currentBet ?? 0) + pending.stack;
  const minTargetBet = action.type === "bet" ? snapshot.bigBlind : Math.max(snapshot.currentBet + pending.minRaise, snapshot.currentBet * 2 + 1);
  if (amount > maxTargetBet) {
    throw new Error("Bet amount exceeds your stack.");
  }
  if (action.type === "raise" && amount < minTargetBet) {
    throw new Error("Raise amount must be greater than twice the previous bet.");
  }
  if (action.type === "bet" && amount < minTargetBet && amount !== maxTargetBet) {
    throw new Error("Bet amount is below the minimum action size.");
  }

  return { type: action.type, amount };
}

function publicGameForUser(game: GameSnapshot, userId?: string): GameSnapshot {
  const comparedPlayerIds = new Set(
    game.phase === "showdown"
      ? game.players.filter((player) => player.status === "active" || player.status === "all-in").map((player) => player.id)
      : [],
  );
  const showComparedCards = comparedPlayerIds.size > 1;
  return {
    ...game,
    players: game.players.map((player) => ({
      ...player,
      holeCards:
        (showComparedCards && comparedPlayerIds.has(player.id)) || (game.phase !== "showdown" && player.ownerUserId === userId)
          ? player.holeCards
          : undefined,
    })),
  };
}

function humanSnapshotVersion(snapshot: HumanTableSnapshot, key: string) {
  const game = snapshot.game;
  const lastAction = game?.actionHistory.at(-1);
  const lastLog = game?.logs[0];
  const playerState = game?.players
    .map((player) => `${player.id}:${player.stack}:${player.currentBet}:${player.totalCommitted}:${player.status}:${player.lastAction ?? ""}`)
    .join("|");
  const pending = snapshot.pendingDecision
    ? `${snapshot.pendingDecision.playerId}:${snapshot.pendingDecision.handId}:${snapshot.pendingDecision.expiresAt}`
    : "";
  const stats = snapshot.playerStats
    .map((stat) => `${stat.playerId}:${stat.effectiveStack}:${stat.profit}:${stat.inSeat ? "1" : "0"}`)
    .join("|");
  return [
    key,
    snapshot.mySeatStatus,
    snapshot.tableStatus.hasTable ? "1" : "0",
    snapshot.tableStatus.playerCount,
    snapshot.tableStatus.running ? "1" : "0",
    game?.handId ?? 0,
    game?.phase ?? "",
    game?.pot ?? 0,
    game?.currentBet ?? 0,
    game?.currentPlayerId ?? "",
    game?.communityCards.map((card) => `${card.rank}${card.suit}`).join("") ?? "",
    playerState ?? "",
    pending,
    stats,
    lastAction?.id ?? "",
    lastLog?.id ?? "",
  ].join(";");
}

function fallbackAction(toCall: number): PokerAction {
  return toCall > 0 ? { type: "fold" } : { type: "check" };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
