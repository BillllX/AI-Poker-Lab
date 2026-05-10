import { randomUUID } from "node:crypto";
import { decideForVirtualAgent, assignVirtualAgentsToTable, ensureVirtualAgentPool, isVirtualAgent } from "./virtualAgents";
import { initialStack, PokerGameEngine } from "../poker/gameEngine";
import type { AgentDecisionRequest, GameSnapshot } from "../poker/types";
import {
  assignAgentToTable,
  isAgentPolling,
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

type ActiveBuyIn = GameBuyIn;
type SimulatorDependencies = {
  clearAgents: () => void;
  clearPendingDecisions: (reason?: string, agentId?: string) => void;
  enqueueDecision: (request: Parameters<typeof enqueueAgentDecision>[0]) => ReturnType<typeof enqueueAgentDecision>;
  listAgents: () => RegisteredAgent[];
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
const virtualBotDecisionDelayMinMs = 5_000;
const virtualBotDecisionDelayMaxMs = 20_000;

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
  }

  async start() {
    if (!this.startPromise) {
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
      }
      await this.reserveSessionBuyIns();
      for (const agent of this.deps.listAgents()) {
        assignAgentToTable(agent.id, this.tableId, "playing");
      }
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
    this.engine.setRunning(false);
    this.deps.clearPendingDecisions("Game was stopped or reconfigured.");
    this.inFlight = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async settleAndRemoveAgent(agentId: string, reason: "busted" | "left", removeRegistration = false) {
    this.deps.clearPendingDecisions(`Agent ${agentId} ${reason === "busted" ? "was busted" : "left the table"}.`, agentId);
    const player = this.engine.snapshot().players.find((item) => item.id === agentId);
    const settlement = this.engine.settlePlayer(agentId, reason) ?? (player ? { finalStack: Math.max(0, player.stack), player } : undefined);
    await this.settleAgentBuyIn(agentId, settlement?.finalStack ?? 0);
    if (this.inFlight && player && player.totalCommitted > 0) {
      this.playersPendingRemoval.add(agentId);
    } else {
      this.engine.removePlayers([agentId]);
      this.playersPendingRemoval.delete(agentId);
    }
    releaseAgentFromTable(agentId, reason === "left" ? "disconnected" : "registered");
    this.rosterVersion = this.currentRosterVersion();

    if (removeRegistration) {
      removeAgentFromRegistry(agentId);
    }

    if (this.engine.snapshot().players.every((player) => player.kind === "virtual")) {
      this.stop();
      this.deps.clearAgents();
    }
  }

  async reset(origin: string) {
    this.stop();
    await this.settleCurrentSession();
    this.origin = origin;
    this.engine = this.createEngine();
    this.engine.reset();
  }

  async endSession(origin: string) {
    this.stop();
    await this.settleCurrentSession();
    this.deps.clearAgents();
    this.origin = origin;
    this.engine = this.createEngine();
    this.engine.reset();
  }

  snapshot(): GameSnapshot {
    this.configure(this.origin);
    return this.engine.snapshot();
  }

  private async tick() {
    if (!this.engine.isRunning() || this.inFlight) {
      return;
    }

    this.inFlight = true;
    try {
      await this.addNewPollingAgents();
      const played = await this.engine.playOneHand((request) => this.decide(request));
      if (!played) {
        await this.settleCurrentSession();
        this.deps.clearAgents();
        this.stopTimer();
        return;
      }
      this.removePendingSettledPlayers();
      await this.settleBustedPlayers();
      await this.addNewPollingAgents();
    } catch (error) {
      console.error("Poker hand failed; stopping simulator to avoid a runaway loop.", error);
      this.engine.setRunning(false);
      this.deps.clearPendingDecisions("Game stopped after an internal hand error.");
      await this.settleCurrentSession();
      this.deps.clearAgents();
      this.stopTimer();
    } finally {
      this.inFlight = false;
    }
  }

  private createEngine() {
    const agents = this.deps.listAgents();
    this.rosterVersion = this.currentRosterVersion();

    return new PokerGameEngine(agents, { tableId: this.tableId, tableName: this.tableName });
  }

  private currentRosterVersion() {
    return JSON.stringify(this.deps.listAgents().map((agent) => [agent.id, agent.name, agent.ownerUserId, agent.modelName, agent.kind, agent.strategy]));
  }

  private async decide(request: AgentDecisionRequest) {
    const agent = this.deps.listAgents().find((item) => item.id === request.playerId);
    if (isVirtualAgent(agent)) {
      await sleep(randomBetween(virtualBotDecisionDelayMinMs, virtualBotDecisionDelayMaxMs));
      return decideForVirtualAgent(agent, request);
    }

    return this.deps.enqueueDecision(request);
  }

  private async addNewPollingAgents() {
    if (this.activeBuyIns.length === 0) {
      return;
    }

    const activeAgentIds = new Set(this.engine.snapshot().players.map((player) => player.id));
    const newAgents = this.deps.listAgents().filter((agent) => !activeAgentIds.has(agent.id));

    if (newAgents.length === 0) {
      return;
    }

    const sessionId = this.gameSessionId ?? createGameSessionId();
    this.gameSessionId = sessionId;
    const buyIns = newAgents.filter((agent) => !isVirtualAgent(agent)).map((agent) => agentToBuyIn(agent, sessionId));
    await this.deps.reserveGameBuyIns(buyIns);
    const addedAgentIds = this.engine.addPlayers(newAgents);
    this.activeBuyIns = [...this.activeBuyIns, ...buyIns.filter((buyIn) => addedAgentIds.includes(buyIn.agentId))];
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

  private async settleAgentBuyIn(agentId: string, finalStack: number) {
    const buyIn = this.activeBuyIns.find((item) => item.agentId === agentId);
    if (!buyIn) {
      return;
    }

    await this.deps.settleGameBuyIns([{ ...buyIn, finalStack: Math.max(0, finalStack) }]);
    this.activeBuyIns = this.activeBuyIns.filter((item) => item.agentId !== agentId);
    if (this.activeBuyIns.length === 0) {
      this.gameSessionId = undefined;
    }
  }

  private async settleBustedPlayers() {
    const bustedPlayers = this.engine.snapshot().players.filter((player) => player.stack <= 0);

    for (const player of bustedPlayers) {
      await this.settleAndRemoveAgent(player.id, "busted", player.kind !== "virtual");
    }
  }

  private removePendingSettledPlayers() {
    if (this.playersPendingRemoval.size === 0) {
      return;
    }

    this.engine.removePlayers([...this.playersPendingRemoval]);
    this.playersPendingRemoval.clear();
  }

  private async settleCurrentSessionInternal() {
    this.engine.refundUnsettledPot();
    const players = this.engine.snapshot().players;
    await this.deps.settleGameBuyIns(
      this.activeBuyIns.map((buyIn) => ({
        ...buyIn,
        finalStack: Math.max(0, players.find((player) => player.id === buyIn.agentId)?.stack ?? 0),
      })),
    );
    this.activeBuyIns = [];
    this.gameSessionId = undefined;
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  tableSummary() {
    const snapshot = this.snapshot();
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

function randomBetween(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
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
      for (const stat of table.runner.snapshot().modelStats) {
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
    await this.allocateQueuedAgents();
  }

  async allocateQueuedAgents() {
    ensureVirtualAgentPool();

    for (const agent of listQueuedAgents()) {
      const table = this.findTableForAgent() ?? this.createTable();
      assignAgentToTable(agent.id, table.id);
      this.fillTableWithVirtualAgents(table.id);
      await table.runner.maybeAutoStart();
    }

    for (const table of this.activeTables()) {
      this.fillTableWithVirtualAgents(table.id);
      await table.runner.maybeAutoStart();
    }
  }

  async resetTable(tableId: string) {
    const table = this.table(tableId);
    if (!table) {
      throw new Error(`Table ${tableId} does not exist.`);
    }

    await table.runner.reset(this.origin);
  }

  async endTable(tableId: string) {
    const table = this.table(tableId);
    if (!table) {
      throw new Error(`Table ${tableId} does not exist.`);
    }

    await table.runner.endSession(this.origin);
  }

  async leaveAgent(agentId: string) {
    const agent = listRegisteredAgents().find((item) => item.id === agentId);
    if (!agent) {
      return { removed: false, tableEnded: false };
    }

    const tableId = agent.tableId;
    if (tableId) {
      const table = this.table(tableId);
      if (table?.runner.isRunning()) {
        await table.runner.settleAndRemoveAgent(agentId, "left");
      }
    }

    const removed = removeAgentFromRegistry(agentId);
    await this.allocateQueuedAgents();
    return { removed, tableEnded: Boolean(tableId) };
  }

  private findTableForAgent() {
    return this.activeTables().find(
      (table) => Math.max(table.runner.tableSummary().playerCount, listTableAgents(table.id).length) < maxPlayersPerTable,
    );
  }

  private fillTableWithVirtualAgents(tableId: string) {
    const tableAgents = listTableAgents(tableId);
    if (!tableAgents.some((agent) => agent.kind === "external")) {
      return [];
    }

    if (tableAgents.length >= virtualBotJoinThreshold || tableAgents.length >= maxPlayersPerTable) {
      return [];
    }

    const seatsToFill = Math.min(maxPlayersPerTable, virtualBotTargetPlayers) - tableAgents.length;
    return assignVirtualAgentsToTable(tableId, seatsToFill);
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
    return record;
  }
}

const globalForSimulator = globalThis as typeof globalThis & {
  __texasPokerTableManager?: TableManager;
};

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
