import { randomUUID } from "node:crypto";
import { decideForVirtualAgent, assignVirtualAgentsToTable, ensureVirtualAgentPool, isVirtualAgent } from "./virtualAgents";
import { initialStack, PokerGameEngine } from "../poker/gameEngine";
import type { AgentDecisionRequest, GameSnapshot } from "../poker/types";
import {
  assignAgentToTable,
  isHostedAgent,
  isResidentAgent,
  isAgentPolling,
  isUserOwnedAgent,
  listAgents as listRegisteredAgents,
  listQueuedAgents,
  listTableAgents,
  queueAgent,
  releaseAgentFromTable,
  releaseTableAgentsToQueue,
  removeAgent as removeAgentFromRegistry,
  type RegisteredAgent,
} from "./agentRegistry";
import { clearPendingDecisions as clearQueuedDecisions, enqueueDecision as enqueueAgentDecision } from "./decisionBroker";
import {
  reserveGameBuyIns as reserveUserGameBuyIns,
  settleGameBuyIns as settleUserGameBuyIns,
  type GameBuyIn,
  type GameSettlement,
} from "./userRegistry";
import { logger } from "./logger";
import { prisma } from "./prisma";
import { decideForHostedAgent } from "./hostedAgentDecision";
import { isResidentAgentsEnabled, queueResidentAgents } from "./residentAgents";

type ActiveBuyIn = GameBuyIn;
type AgentSettlementReason = "busted" | "left" | "session-ended";
type SimulatorDependencies = {
  clearAgents: () => void;
  clearPendingDecisions: (reason?: string, agentId?: string) => void;
  enqueueDecision: (request: Parameters<typeof enqueueAgentDecision>[0]) => ReturnType<typeof enqueueAgentDecision>;
  listAgents: () => RegisteredAgent[];
  recordAgentResults?: (settlements: GameSettlement[], reason: AgentSettlementReason, runner: GameSimulator) => Promise<void>;
  reserveGameBuyIns: (buyIns: GameBuyIn[]) => Promise<void>;
  settleGameBuyIns: (settlements: GameSettlement[]) => Promise<void>;
};

const defaultDependencies: SimulatorDependencies = {
  clearAgents: () => undefined,
  clearPendingDecisions: clearQueuedDecisions,
  enqueueDecision: enqueueAgentDecision,
  listAgents: listRegisteredAgents,
  reserveGameBuyIns: reserveUserGameBuyIns,
  settleGameBuyIns: settleUserGameBuyIns,
};

export const maxPlayersPerTable = 6;
export const minPlayersToStart = 2;
const virtualBotJoinThreshold = 3;
const virtualBotTargetPlayers = 4;
const maxResidentsPerTable = Math.max(2, Number(process.env.RESIDENT_AGENTS_PER_TABLE ?? 4));
const virtualBotDecisionDelayMs = 3_000;
const handResultPauseMs = 3_000;

const globalForSimulator = globalThis as typeof globalThis & {
  __texasPokerTableManager?: TableManager;
  __texasPokerTableRunLocks?: Set<string>;
};
const tableRunLocks = (globalForSimulator.__texasPokerTableRunLocks ??= new Set<string>());

export class GameSimulator {
  private engine: PokerGameEngine;
  private timer?: ReturnType<typeof setInterval>;
  private inFlight = false;
  private origin: string;
  private rosterVersion = "";
  private activeBuyIns: ActiveBuyIn[] = [];
  private playersPendingRemoval = new Set<string>();
  private gameSessionId?: string;
  private startPromise?: Promise<void>;
  private settlePromise?: Promise<void>;
  private snapshotCache?: { expiresAt: number; snapshot: GameSnapshot; version: string };

  constructor(
    origin: string,
    private readonly deps: SimulatorDependencies = defaultDependencies,
    private readonly tableId = "table-1",
    private readonly tableName = "Table 1",
  ) {
    this.origin = origin;
    this.engine = this.createEngine();
  }

  configure(origin: string) {
    const rosterVersion = this.currentRosterVersion();
    this.origin = origin;

    if (this.rosterVersion === rosterVersion) {
      return;
    }

    if (this.engine.isRunning() || this.activeBuyIns.length > 0 || this.startPromise || this.settlePromise) {
      return;
    }

    this.engine = this.createEngine();
    this.invalidateSnapshotCache();
  }

  async start() {
    if (!this.startPromise) {
      logger.info("table.start_requested", { tableId: this.tableId, agentCount: this.deps.listAgents().length });
      this.startPromise = this.startInternal().finally(() => {
        this.startPromise = undefined;
      });
    }

    await this.startPromise;
  }

  async maybeAutoStart() {
    if (this.engine.isRunning() || this.startPromise || this.settlePromise) {
      return;
    }

    if (this.deps.listAgents().length < 2) {
      return;
    }

    await this.start();
  }

  private async startInternal() {
    await this.settlePromise;

    if (this.deps.listAgents().length < 2) {
      throw new Error("At least two external Agents are required to start a game.");
    }

    if (!this.engine.isRunning()) {
      this.deps.clearPendingDecisions("Game is starting a new run.");
      this.inFlight = false;
      if (this.engine.snapshot().handId > 0 || this.rosterVersion !== this.currentRosterVersion()) {
        this.engine = this.createEngine();
        this.invalidateSnapshotCache();
      }
      await this.reserveSessionBuyIns();
      for (const agent of this.deps.listAgents()) {
        assignAgentToTable(agent.id, this.tableId, "playing");
      }
      logger.info("table.session_started", {
        tableId: this.tableId,
        gameSessionId: this.gameSessionId,
        players: this.deps.listAgents().map((agent) => ({ id: agent.id, kind: agent.kind, modelName: agent.modelName })),
      });
    }

    this.engine.setRunning(true);

    if (!this.timer) {
      this.timer = setInterval(() => {
        void this.tick();
      }, 1_200);
    }

    void this.tick();
  }

  isRunning() {
    return this.engine.isRunning();
  }

  stop() {
    logger.info("table.stop_requested", { tableId: this.tableId, running: this.engine.isRunning() });
    this.engine.setRunning(false);
    this.invalidateSnapshotCache();
    this.deps.clearPendingDecisions("Game was stopped or reconfigured.");
    this.inFlight = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async settleAndRemoveAgent(agentId: string, reason: "busted" | "left", removeRegistration = false) {
    logger.info("agent.settle_remove_started", { tableId: this.tableId, agentId, reason, removeRegistration });
    this.deps.clearPendingDecisions(`Agent ${agentId} ${reason === "busted" ? "was busted" : "left the table"}.`, agentId);
    const player = this.engine.snapshot().players.find((item) => item.id === agentId);
    const settlement = this.engine.settlePlayer(agentId, reason) ?? (player ? { finalStack: Math.max(0, player.stack), player } : undefined);
    this.invalidateSnapshotCache();
    await this.settleAgentBuyIn(agentId, settlement?.finalStack ?? 0, reason);
    if (this.inFlight && player && player.totalCommitted > 0) {
      this.playersPendingRemoval.add(agentId);
    } else {
      this.engine.removePlayers([agentId]);
      this.playersPendingRemoval.delete(agentId);
      this.invalidateSnapshotCache();
    }
    releaseAgentFromTable(agentId, reason === "left" ? "disconnected" : "registered");
    this.rosterVersion = this.currentRosterVersion();

    if (removeRegistration) {
      removeAgentFromRegistry(agentId);
    }

    logger.info("agent.settle_remove_completed", {
      tableId: this.tableId,
      agentId,
      reason,
      finalStack: settlement?.finalStack ?? 0,
      pendingRemoval: this.playersPendingRemoval.has(agentId),
    });

    if (this.engine.snapshot().players.every((player) => player.kind === "virtual")) {
      this.stop();
      this.deps.clearAgents();
    }
  }

  async reset(origin: string) {
    logger.warn("table.reset_requested", { tableId: this.tableId });
    this.stop();
    await this.settleCurrentSession();
    this.origin = origin;
    this.engine = this.createEngine();
    this.engine.reset();
    this.invalidateSnapshotCache();
  }

  async endSession(origin: string) {
    logger.warn("table.end_session_requested", { tableId: this.tableId });
    this.stop();
    await this.settleCurrentSession();
    this.deps.clearAgents();
    this.origin = origin;
    this.engine = this.createEngine();
    this.engine.reset();
    this.invalidateSnapshotCache();
    logger.warn("table.end_session_completed", { tableId: this.tableId });
  }

  snapshot(): GameSnapshot {
    this.configure(this.origin);
    return this.engine.snapshot();
  }

  cachedSnapshot(maxAgeMs = 750) {
    const now = Date.now();
    if (this.snapshotCache && this.snapshotCache.expiresAt > now) {
      return this.snapshotCache;
    }

    const snapshot = this.snapshot();
    const cached = {
      expiresAt: now + maxAgeMs,
      snapshot,
      version: gameSnapshotVersion(snapshot),
    };
    this.snapshotCache = cached;
    return cached;
  }

  private invalidateSnapshotCache() {
    this.snapshotCache = undefined;
  }

  private async tick() {
    if (!this.engine.isRunning() || this.inFlight || tableRunLocks.has(this.tableId)) {
      return;
    }

    this.inFlight = true;
    tableRunLocks.add(this.tableId);
    try {
      if (this.onlyVirtualPlayersRemain()) {
        logger.warn("table.only_virtual_players_remaining", { tableId: this.tableId });
        this.stop();
        this.deps.clearAgents();
        this.stopTimer();
        return;
      }

      await this.addNewPollingAgents();
      const played = await this.engine.playOneHand((request) => this.decide(request));
      this.invalidateSnapshotCache();
      if (!played) {
        logger.info("table.no_hand_played", { tableId: this.tableId });
        await this.settleCurrentSession();
        this.deps.clearAgents();
        this.stopTimer();
        return;
      }
      await sleep(handResultPauseMs);
      this.removePendingSettledPlayers();
      await this.settleBustedPlayers();
      await this.addNewPollingAgents();
      this.invalidateSnapshotCache();
      if (this.onlyVirtualPlayersRemain()) {
        logger.warn("table.only_virtual_players_remaining", { tableId: this.tableId });
        this.stop();
        this.deps.clearAgents();
        this.stopTimer();
      }
    } catch (error) {
      logger.error("table.hand_failed", { tableId: this.tableId, error });
      this.engine.setRunning(false);
      this.deps.clearPendingDecisions("Game stopped after an internal hand error.");
      await this.settleCurrentSession();
      this.deps.clearAgents();
      this.stopTimer();
    } finally {
      tableRunLocks.delete(this.tableId);
      this.inFlight = false;
    }
  }

  private createEngine() {
    const agents = this.deps.listAgents();
    this.rosterVersion = this.currentRosterVersion();

    return new PokerGameEngine(agents, { tableId: this.tableId, tableName: this.tableName });
  }

  private onlyVirtualPlayersRemain() {
    const players = this.engine.snapshot().players;
    return players.length > 0 && players.every((player) => player.kind === "virtual");
  }

  private currentRosterVersion() {
    return JSON.stringify(this.deps.listAgents().map((agent) => [agent.id, agent.name, agent.ownerUserId, agent.modelName, agent.kind, agent.strategy]));
  }

  private async decide(request: AgentDecisionRequest) {
    const agent = this.deps.listAgents().find((item) => item.id === request.playerId);
    if (isVirtualAgent(agent)) {
      const delayMs = virtualBotDecisionDelayMs;
      logger.info("virtual_agent.thinking_started", {
        tableId: request.tableId,
        agentId: agent.id,
        handId: request.handId,
        delayMs,
      });
      await sleep(delayMs);
      return decideForVirtualAgent(agent, request);
    }

    if (isHostedAgent(agent) || isResidentAgent(agent)) {
      return decideForHostedAgent(agent, request);
    }

    return this.deps.enqueueDecision(request);
  }

  private async addNewPollingAgents() {
    if (this.activeBuyIns.length === 0) {
      return;
    }

    const activeAgentIds = new Set(this.engine.snapshot().players.map((player) => player.id));
    const reservedAgentIds = new Set(this.activeBuyIns.map((buyIn) => buyIn.agentId));
    const newAgents = this.deps.listAgents().filter((agent) => !activeAgentIds.has(agent.id) && !reservedAgentIds.has(agent.id));

    if (newAgents.length === 0) {
      return;
    }

    const sessionId = this.gameSessionId ?? createGameSessionId();
    this.gameSessionId = sessionId;
    const buyIns = newAgents.filter((agent) => !isVirtualAgent(agent)).map((agent) => agentToBuyIn(agent, sessionId));
    await this.deps.reserveGameBuyIns(buyIns);
    const addedAgentIds = this.engine.addPlayers(newAgents);
    this.invalidateSnapshotCache();
    this.activeBuyIns = [...this.activeBuyIns, ...buyIns.filter((buyIn) => addedAgentIds.includes(buyIn.agentId))];
    if (addedAgentIds.length > 0) {
      logger.info("table.players_added", { tableId: this.tableId, addedAgentIds, buyInCount: buyIns.length });
    }
    this.rosterVersion = this.currentRosterVersion();
  }

  private async reserveSessionBuyIns() {
    if (this.activeBuyIns.length > 0) {
      return;
    }

    const sessionId = (this.gameSessionId = this.gameSessionId ?? createGameSessionId());
    const buyIns = this.deps.listAgents().filter((agent) => !isVirtualAgent(agent)).map((agent) => agentToBuyIn(agent, sessionId));
    await this.deps.reserveGameBuyIns(buyIns);
    this.activeBuyIns = buyIns;
    logger.info("table.buy_ins_reserved", { tableId: this.tableId, gameSessionId: sessionId, buyInCount: buyIns.length });
  }

  private async settleCurrentSession() {
    if (this.activeBuyIns.length === 0) {
      return;
    }

    if (!this.settlePromise) {
      this.settlePromise = this.settleCurrentSessionInternal().finally(() => {
        this.settlePromise = undefined;
      });
    }

    await this.settlePromise;
  }

  private async settleAgentBuyIn(agentId: string, finalStack: number, reason: AgentSettlementReason) {
    const buyIn = this.activeBuyIns.find((item) => item.agentId === agentId);
    if (!buyIn) {
      return;
    }

    const settlement = { ...buyIn, finalStack: Math.max(0, finalStack) };
    await this.deps.settleGameBuyIns([settlement]);
    await this.recordAgentResultsThroughDependency([settlement], reason);
    this.activeBuyIns = this.activeBuyIns.filter((item) => item.agentId !== agentId);
    logger.info("table.buy_in_settled", { tableId: this.tableId, agentId, finalStack: Math.max(0, finalStack) });
    if (this.activeBuyIns.length === 0) {
      this.gameSessionId = undefined;
    }
  }

  private async settleBustedPlayers() {
    const bustedPlayers = this.engine.snapshot().players.filter((player) => player.stack <= 0);

    for (const player of bustedPlayers) {
      await this.settleAndRemoveAgent(player.id, "busted", player.kind !== "virtual" && player.kind !== "resident");
    }
  }

  private removePendingSettledPlayers() {
    if (this.playersPendingRemoval.size === 0) {
      return;
    }

    this.engine.removePlayers([...this.playersPendingRemoval]);
    this.playersPendingRemoval.clear();
    this.invalidateSnapshotCache();
  }

  private async settleCurrentSessionInternal() {
    this.engine.refundUnsettledPot();
    const players = this.engine.snapshot().players;
    const settlements = this.activeBuyIns.map((buyIn) => ({
        ...buyIn,
        finalStack: Math.max(0, players.find((player) => player.id === buyIn.agentId)?.stack ?? 0),
      }));
    await this.deps.settleGameBuyIns(settlements);
    await this.recordAgentResultsThroughDependency(settlements, "session-ended");
    logger.info("table.session_settled", {
      tableId: this.tableId,
      gameSessionId: this.gameSessionId,
      settlementCount: settlements.length,
    });
    this.activeBuyIns = [];
    this.gameSessionId = undefined;
  }

  private async recordAgentResults(settlements: GameSettlement[], reason: AgentSettlementReason) {
    const resultRows = settlements
      .filter((settlement) => settlement.ownerUserId)
      .map((settlement) => {
        const stat = this.engine.statsForPlayer(settlement.agentId);
        const agent = this.deps.listAgents().find((item) => item.id === settlement.agentId);
        const finalStack = Math.max(0, settlement.finalStack);
        return {
          id: `agent_result_${randomUUID().replace(/-/g, "")}`,
          agentId: settlement.agentId,
          ownerUserId: settlement.ownerUserId,
          modelName: stat?.modelName ?? agent?.modelName,
          tableId: this.tableId,
          gameSessionId: settlement.gameSessionId,
          buyIn: settlement.amount,
          finalStack,
          profit: finalStack - settlement.amount,
          handsPlayed: stat?.handsPlayed ?? 0,
          handsWon: stat?.handsWon ?? 0,
          settledReason: reason,
        };
      });

    if (resultRows.length === 0) {
      return;
    }

    await prisma.agentResult.createMany({ data: resultRows });
    logger.info("agent_results.recorded", { tableId: this.tableId, count: resultRows.length, reason });
  }

  private async recordAgentResultsThroughDependency(settlements: GameSettlement[], reason: AgentSettlementReason) {
    if (this.deps.recordAgentResults) {
      await this.deps.recordAgentResults(settlements, reason, this);
      return;
    }

    await this.recordAgentResults(settlements, reason);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  tableSummary() {
    const snapshot = this.cachedSnapshot().snapshot;
    return {
      id: this.tableId,
      name: this.tableName,
      running: snapshot.running,
      phase: snapshot.phase,
      handId: snapshot.handId,
      playerCount: snapshot.players.length,
      maxPlayers: maxPlayersPerTable,
      currentPlayerId: snapshot.currentPlayerId,
    };
  }
}

function agentToBuyIn(agent: RegisteredAgent, gameSessionId: string): ActiveBuyIn {
  if (!agent.ownerUserId) {
    throw new Error(`Agent ${agent.id} is not bound to an ownerUserId.`);
  }

  return {
    agentId: agent.id,
    ownerUserId: agent.ownerUserId,
    amount: initialStack,
    gameSessionId,
  };
}

function createGameSessionId() {
  return `game_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type TableRecord = {
  id: string;
  name: string;
  runner: GameSimulator;
  createdAt: string;
};

export class TableManager {
  private tables = new Map<string, TableRecord>();
  private allocationPromise?: Promise<void>;

  constructor(private origin: string) {}

  configure(origin: string) {
    this.origin = origin;
    for (const table of this.tables.values()) {
      table.runner.configure(origin);
    }
  }

  defaultRunner() {
    return this.activeTables()[0]?.runner ?? this.createTable().runner;
  }

  activeTables() {
    return [...this.tables.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  table(tableId: string) {
    return this.tables.get(tableId);
  }

  summaries() {
    return this.activeTables().map((table) => table.runner.tableSummary());
  }

  modelStats() {
    const statsByModel = new Map<string, { modelName: string; handsPlayed: number; agents: Set<string> }>();

    for (const table of this.activeTables()) {
      for (const stat of table.runner.cachedSnapshot().snapshot.modelStats) {
        const existing = statsByModel.get(stat.modelName) ?? {
          modelName: stat.modelName,
          handsPlayed: 0,
          agents: new Set<string>(),
        };
        existing.handsPlayed += stat.handsPlayed;
        for (let index = 0; index < stat.agents; index += 1) {
          existing.agents.add(`${table.id}:${stat.modelName}:${index}`);
        }
        statsByModel.set(stat.modelName, existing);
      }
    }

    return [...statsByModel.values()]
      .map((stat) => ({ modelName: stat.modelName, handsPlayed: stat.handsPlayed, agents: stat.agents.size }))
      .sort((left, right) => right.handsPlayed - left.handsPlayed || left.modelName.localeCompare(right.modelName));
  }

  async handleAgentOnline(agentId: string) {
    queueAgent(agentId);
    logger.info("agent.online_seen", { agentId });
    await this.allocateQueuedAgents();
  }

  async allocateQueuedAgents() {
    if (this.allocationPromise) {
      return this.allocationPromise;
    }

    this.allocationPromise = this.allocateQueuedAgentsOnce().finally(() => {
      this.allocationPromise = undefined;
    });
    return this.allocationPromise;
  }

  private async allocateQueuedAgentsOnce() {
    await queueResidentAgents();
    if (!isResidentAgentsEnabled()) {
      ensureVirtualAgentPool();
    }

    for (const agent of listQueuedAgents()) {
      const table = this.findTableForAgent(agent) ?? this.createTable();
      assignAgentToTable(agent.id, table.id);
      logger.info("agent.assigned_to_table", { agentId: agent.id, tableId: table.id });
      if (!isResidentAgentsEnabled()) {
        this.fillTableWithVirtualAgents(table.id);
      }
      await table.runner.maybeAutoStart();
    }

    for (const table of this.activeTables()) {
      if (!isResidentAgentsEnabled()) {
        this.fillTableWithVirtualAgents(table.id);
      }
      await table.runner.maybeAutoStart();
    }
  }

  async resetTable(tableId: string) {
    const table = this.table(tableId);
    if (!table) {
      throw new Error(`Table ${tableId} does not exist.`);
    }

    logger.warn("table.manager_reset_requested", { tableId });
    await table.runner.reset(this.origin);
  }

  async endTable(tableId: string) {
    const table = this.table(tableId);
    if (!table) {
      throw new Error(`Table ${tableId} does not exist.`);
    }

    logger.warn("table.manager_end_requested", { tableId });
    await table.runner.endSession(this.origin);
    this.tables.delete(tableId);
  }

  async endAllTables() {
    logger.warn("table.manager_end_all_requested", { tableCount: this.tables.size });
    await Promise.all([...this.tables.values()].map((table) => table.runner.endSession(this.origin)));
    this.tables.clear();
  }

  async leaveAgent(agentId: string) {
    const agent = listRegisteredAgents().find((item) => item.id === agentId);
    if (!agent) {
      logger.warn("agent.leave_missing", { agentId });
      return { removed: false, tableEnded: false };
    }

    const table = this.findTableContainingPlayer(agentId, agent.tableId);
    const tableId = table?.id ?? agent.tableId;
    if (table) {
      await table.runner.settleAndRemoveAgent(agentId, "left");
    }

    const removed = removeAgentFromRegistry(agentId);
    await this.allocateQueuedAgents();
    logger.info("agent.leave_manager_completed", { agentId, tableId, removed });
    return { removed, tableEnded: Boolean(tableId) };
  }

  async joinAgentToTable(agentId: string, tableId: string) {
    const agent = listRegisteredAgents().find((item) => item.id === agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} does not exist.`);
    }

    const table = this.table(tableId);
    if (!table) {
      throw new Error(`Table ${tableId} does not exist.`);
    }

    if (agent.tableId && agent.tableId !== tableId && (agent.assignmentStatus === "seated" || agent.assignmentStatus === "playing")) {
      throw new Error("Your player is already seated at another table.");
    }

    const occupiedSeats = Math.max(table.runner.tableSummary().playerCount, listTableAgents(tableId).length);
    if (!agent.tableId && occupiedSeats >= maxPlayersPerTable) {
      throw new Error("This table is full.");
    }

    assignAgentToTable(agent.id, tableId);
    await table.runner.maybeAutoStart();
    logger.info("agent.joined_specific_table", { agentId, tableId });
    return listRegisteredAgents().find((item) => item.id === agentId) ?? agent;
  }

  private findTableContainingPlayer(agentId: string, preferredTableId?: string) {
    const preferredTable = preferredTableId ? this.table(preferredTableId) : undefined;
    if (preferredTable?.runner.snapshot().players.some((player) => player.id === agentId)) {
      return preferredTable;
    }

    return this.activeTables().find((table) => table.runner.snapshot().players.some((player) => player.id === agentId));
  }

  private findTableForAgent(agent?: RegisteredAgent) {
    if (agent?.kind === "resident" && isResidentAgentsEnabled()) {
      return this.findTableForResidentAgent();
    }

    return this.activeTables().find((table) => this.tableOccupancy(table) < maxPlayersPerTable);
  }

  private findTableForResidentAgent() {
    const candidate = this.activeTables()
      .filter((table) => {
        const residents = this.residentCountAtTable(table.id);
        return residents < maxResidentsPerTable && this.tableOccupancy(table) < maxPlayersPerTable;
      })
      .sort((left, right) => {
        const leftResidents = this.residentCountAtTable(left.id);
        const rightResidents = this.residentCountAtTable(right.id);
        const leftNeedsPartner = leftResidents === 1 ? 0 : 1;
        const rightNeedsPartner = rightResidents === 1 ? 0 : 1;
        if (leftNeedsPartner !== rightNeedsPartner) {
          return leftNeedsPartner - rightNeedsPartner;
        }
        if (leftResidents !== rightResidents) {
          return rightResidents - leftResidents;
        }
        return left.createdAt.localeCompare(right.createdAt);
      })[0];

    return candidate;
  }

  private tableOccupancy(table: TableRecord) {
    return Math.max(table.runner.tableSummary().playerCount, listTableAgents(table.id).length);
  }

  private residentCountAtTable(tableId: string) {
    return listTableAgents(tableId).filter((agent) => agent.kind === "resident").length;
  }

  private fillTableWithVirtualAgents(tableId: string) {
    const tableAgents = listTableAgents(tableId);
    if (!tableAgents.some((agent) => isUserOwnedAgent(agent))) {
      return [];
    }

    if (tableAgents.length >= virtualBotJoinThreshold || tableAgents.length >= maxPlayersPerTable) {
      return [];
    }

    const seatsToFill = Math.min(maxPlayersPerTable, virtualBotTargetPlayers) - tableAgents.length;
    const assigned = assignVirtualAgentsToTable(tableId, seatsToFill);
    if (assigned.length > 0) {
      logger.info("virtual_agents.assigned", { tableId, agentIds: assigned.map((agent) => agent.id) });
    }
    return assigned;
  }

  private createTable() {
    const index = this.tables.size + 1;
    const id = `table-${index}`;
    const name = `Table ${index}`;
    const runner = new GameSimulator(
      this.origin,
      {
        ...defaultDependencies,
        clearAgents: () => {
          const activeAgentIds = listTableAgents(id)
            .filter((agent) => isAgentPolling(agent))
            .map((agent) => agent.id);
          releaseTableAgentsToQueue(id, activeAgentIds);
          void this.allocateQueuedAgents();
        },
        clearPendingDecisions: (reason, agentId) => clearQueuedDecisions(reason, id, agentId),
        listAgents: () => listTableAgents(id),
      },
      id,
      name,
    );
    const record = {
      id,
      name,
      runner,
      createdAt: new Date().toISOString(),
    };
    this.tables.set(id, record);
    logger.info("table.created", { tableId: id, name });
    return record;
  }
}

export function getSimulator(origin = "http://localhost:3000") {
  return getTableManager(origin).defaultRunner();
}

export function getTableManager(origin = "http://localhost:3000") {
  if (!globalForSimulator.__texasPokerTableManager) {
    globalForSimulator.__texasPokerTableManager = new TableManager(origin);
  } else {
    globalForSimulator.__texasPokerTableManager.configure(origin);
  }

  return globalForSimulator.__texasPokerTableManager;
}

function gameSnapshotVersion(snapshot: GameSnapshot) {
  const lastAction = snapshot.actionHistory.at(-1);
  const lastLog = snapshot.logs[0];
  const playerState = snapshot.players
    .map((player) => `${player.id}:${player.stack}:${player.currentBet}:${player.totalCommitted}:${player.status}:${player.lastAction ?? ""}`)
    .join("|");
  return [
    snapshot.running ? "1" : "0",
    snapshot.handId,
    snapshot.phase,
    snapshot.pot,
    snapshot.currentBet,
    snapshot.currentPlayerId ?? "",
    snapshot.communityCards.map((card) => `${card.rank}${card.suit}`).join(""),
    playerState,
    lastAction?.id ?? "",
    lastLog?.id ?? "",
  ].join(";");
}
