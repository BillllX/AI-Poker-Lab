import { strict as assert } from "node:assert";
import { analyzeDecisionHand } from "../src/lib/poker/handAnalysis";
import type { AgentDecisionRequest, AgentDecisionResponse, Card, PlayerState } from "../src/lib/poker/types";
import { enqueueDecision, submitDecision, subscribePendingDecision } from "../src/lib/server/decisionBroker";
import {
  assignAgentToTable,
  clearAgents,
  listAgents,
  markAgentDisconnected,
  registerAgent,
  subscribeAgentRegistry,
  type RegisteredAgent,
} from "../src/lib/server/agentRegistry";
import { GameSimulator, TableManager } from "../src/lib/server/simulator";
import type { GameBuyIn, GameSettlement } from "../src/lib/server/userRegistry";
import { initialStack, PokerGameEngine } from "../src/lib/poker/gameEngine";

const agents = [
  {
    id: "agent-a",
    name: "Agent A",
    ownerUserId: "user-a",
    modelName: "test-model",
    kind: "external" as const,
    registeredAt: new Date().toISOString(),
    assignmentStatus: "playing" as const,
  },
  {
    id: "agent-b",
    name: "Agent B",
    ownerUserId: "user-b",
    modelName: "test-model",
    kind: "external" as const,
    registeredAt: new Date().toISOString(),
    assignmentStatus: "playing" as const,
  },
];
let tableIdCounter = 0;

async function main() {
  await assertConcurrentStartReservesOnce();
  await assertConcurrentEndSessionSettlesOnce();
  await assertMidDecisionResetSettlesOnce();
  await assertAutoStartWaitsForPollingAgents();
  await assertNewPollingAgentJoinsNextHand();
  await assertReservedAgentsAreNotReservedAgain();
  await assertBustedRealAgentSettlesAndLeaves();
  await assertDisconnectedLeaveRemovesEngineSeat();
  await assertDisconnectedPlayingAgentSettlesAndLeaves();
  await assertMinimumRaiseTracksPreviousRaiseSize();
  await assertShortStackCallCommitsAllIn();
  await assertCommunityCardsAreCappedAtFive();
  await assertSidePotSplitMainPotOnly();
  await assertDecisionSubscribersReceivePendingAndClear();
  await assertAgentRegistrySubscribersObserveSessionClear();
  console.log("Lifecycle smoke tests passed.");
}

async function assertConcurrentStartReservesOnce() {
  const harness = createHarness({ decisionMode: "auto-fold" });
  const simulator = createSimulator(harness);

  await Promise.all([simulator.start(), simulator.start(), simulator.start()]);
  simulator.stop();

  assert.equal(harness.reserveCalls.length, 1, "concurrent start should reserve buy-ins once");
  assert.equal(harness.reserveCalls[0].length, 2, "start should reserve one buy-in per Agent");
  assert.ok(harness.reserveCalls[0].every((buyIn) => buyIn.gameSessionId), "buy-ins should carry a gameSessionId");
}

async function assertConcurrentEndSessionSettlesOnce() {
  const harness = createHarness({ decisionMode: "auto-fold" });
  const simulator = createSimulator(harness);

  await simulator.start();
  await Promise.all([simulator.endSession("http://localhost:3000"), simulator.endSession("http://localhost:3000")]);

  assert.equal(harness.settleCalls.length, 1, "concurrent endSession should settle once");
  assert.equal(harness.clearAgentsCalls, 2, "each endSession call may clear the already-stopped roster");
}

async function assertMidDecisionResetSettlesOnce() {
  const harness = createHarness({ decisionMode: "pending" });
  const simulator = createSimulator(harness);

  await simulator.start();
  await waitFor(() => harness.pendingDecisions.length > 0);
  await Promise.all([simulator.reset("http://localhost:3000"), simulator.reset("http://localhost:3000")]);

  assert.equal(harness.settleCalls.length, 1, "reset during a pending decision should settle once");
  assert.equal(harness.pendingDecisions.length, 0, "reset should clear pending decisions");
}

async function assertAutoStartWaitsForPollingAgents() {
  const harness = createHarness({ decisionMode: "pending", agents: [] });
  const simulator = createSimulator(harness);

  await simulator.maybeAutoStart();
  assert.equal(harness.reserveCalls.length, 0, "auto-start should wait until two polling Agents are ready");

  harness.agents.push(...agents);
  await simulator.maybeAutoStart();
  await waitFor(() => harness.pendingDecisions.length > 0);

  assert.equal(harness.reserveCalls.length, 1, "auto-start should reserve once after two polling Agents are ready");
  simulator.stop();
}

async function assertNewPollingAgentJoinsNextHand() {
  const thirdAgent = {
    id: "agent-c",
    name: "Agent C",
    ownerUserId: "user-c",
    modelName: "test-model",
    kind: "external" as const,
    registeredAt: new Date().toISOString(),
    assignmentStatus: "playing" as const,
  };
  const harness = createHarness({ decisionMode: "pending", agents: agents.slice(0, 2) });
  const simulator = createSimulator(harness);

  await simulator.start();
  await waitFor(() => harness.pendingDecisions.length > 0);
  harness.agents.push(thirdAgent);
  harness.resolvePendingAsFold();
  await waitFor(() => harness.reserveCalls.some((call) => call.some((buyIn) => buyIn.agentId === thirdAgent.id)));
  simulator.stop();

  assert.ok(harness.reserveCalls.length >= 2, "new polling Agent should get a separate buy-in reserve call");
  assert.equal(harness.reserveCalls.at(-1)?.[0]?.agentId, thirdAgent.id, "new polling Agent should join on a hand boundary");
}

async function assertReservedAgentsAreNotReservedAgain() {
  const harness = createHarness({ decisionMode: "pending", agents: agents.slice(0, 2) });
  const simulator = createSimulator(harness);
  const internals = simulator as unknown as SimulatorInternals;

  await simulator.start();
  await waitFor(() => harness.pendingDecisions.length > 0);
  internals.engine.removePlayers([agents[0].id]);
  await internals.addNewPollingAgents();

  assert.equal(harness.reserveCalls.length, 1, "already-reserved Agents should not be frozen a second time");
  simulator.stop();
}

async function assertBustedRealAgentSettlesAndLeaves() {
  clearAgents();
  const bustedAgent = {
    id: "bust-smoke-agent-a",
    name: "Bust Smoke Agent A",
    ownerUserId: "user-bust-a",
    modelName: "test-model",
    kind: "external" as const,
    registeredAt: new Date().toISOString(),
    assignmentStatus: "playing" as const,
  };
  const survivingAgent = {
    id: "bust-smoke-agent-b",
    name: "Bust Smoke Agent B",
    ownerUserId: "user-bust-b",
    modelName: "test-model",
    kind: "external" as const,
    registeredAt: new Date().toISOString(),
    assignmentStatus: "playing" as const,
  };
  const harness = createHarness({ decisionMode: "pending", agents: [bustedAgent, survivingAgent] });
  const simulator = createSimulator(harness);
  const internals = simulator as unknown as SimulatorInternals;

  registerAgent(bustedAgent);
  internals.activeBuyIns = [
    {
      agentId: bustedAgent.id,
      amount: initialStack,
      gameSessionId: "bust-smoke-session",
      ownerUserId: bustedAgent.ownerUserId,
    },
    {
      agentId: survivingAgent.id,
      amount: initialStack,
      gameSessionId: "bust-smoke-session",
      ownerUserId: survivingAgent.ownerUserId,
    },
  ];

  const player = internals.engine.players.find((item) => item.id === bustedAgent.id);
  assert.ok(player, "busted Agent should be seated in the engine");
  player.stack = 0;

  await simulator.settleAndRemoveAgent(bustedAgent.id, "busted", true);

  assert.equal(harness.settleCalls.length, 1, "busted Agent should trigger a single-player settlement");
  assert.deepEqual(
    harness.settleCalls[0],
    [
      {
        agentId: bustedAgent.id,
        amount: initialStack,
        finalStack: 0,
        gameSessionId: "bust-smoke-session",
        ownerUserId: bustedAgent.ownerUserId,
      },
    ],
    "busted Agent settlement should release the buy-in with zero payout",
  );
  assert.ok(
    !internals.engine.snapshot().players.some((item) => item.id === bustedAgent.id),
    "busted Agent should be removed from the table engine",
  );
  assert.ok(listAgents().every((agent) => agent.id !== bustedAgent.id), "busted real Agent registration should be removed");
  assert.equal(internals.activeBuyIns.length, 1, "surviving Agent buy-in should remain active");
  clearAgents();
}

async function assertDisconnectedLeaveRemovesEngineSeat() {
  clearAgents();
  const leavingAgent = {
    id: "ghost-leave-agent-a",
    name: "Ghost Leave Agent A",
    ownerUserId: "user-ghost-a",
    modelName: "test-model",
    kind: "external" as const,
    registeredAt: new Date().toISOString(),
    assignmentStatus: "registered" as const,
  };
  const survivingAgent = {
    id: "ghost-leave-agent-b",
    name: "Ghost Leave Agent B",
    ownerUserId: "user-ghost-b",
    modelName: "test-model",
    kind: "external" as const,
    registeredAt: new Date().toISOString(),
    assignmentStatus: "playing" as const,
  };
  const harness = createHarness({ decisionMode: "pending", agents: [leavingAgent, survivingAgent] });
  const simulator = new GameSimulator("http://localhost:3000", harness.deps, "ghost-table", "Ghost Table");
  const simulatorInternals = simulator as unknown as SimulatorInternals;
  const manager = new TableManager("http://localhost:3000");
  const managerInternals = manager as unknown as TableManagerInternals;

  registerAgent(leavingAgent);
  harness.agents.splice(0, harness.agents.length, survivingAgent);
  simulatorInternals.activeBuyIns = [
    {
      agentId: leavingAgent.id,
      amount: initialStack,
      gameSessionId: "ghost-leave-session",
      ownerUserId: leavingAgent.ownerUserId,
    },
    {
      agentId: survivingAgent.id,
      amount: initialStack,
      gameSessionId: "ghost-leave-session",
      ownerUserId: survivingAgent.ownerUserId,
    },
  ];
  managerInternals.tables.set("ghost-table", {
    id: "ghost-table",
    name: "Ghost Table",
    createdAt: new Date().toISOString(),
    runner: simulator,
  });

  const result = await manager.leaveAgent(leavingAgent.id);

  assert.deepEqual(result, { removed: true, tableEnded: true }, "leave should find and clear an engine seat even when registry tableId is missing");
  assert.equal(harness.settleCalls.length, 1, "ghost leave should settle the leaving Agent");
  assert.equal(harness.settleCalls[0][0].agentId, leavingAgent.id, "settlement should target the leaving Agent");
  assert.ok(
    !simulatorInternals.engine.snapshot().players.some((player) => player.id === leavingAgent.id),
    "leaving Agent should be removed from the engine snapshot",
  );
  assert.ok(listAgents().every((agent) => agent.id !== leavingAgent.id), "leaving Agent registration should be removed");
  clearAgents();
}

async function assertDisconnectedPlayingAgentSettlesAndLeaves() {
  clearAgents();
  const disconnectedAgent = {
    id: "disconnect-smoke-agent-a",
    name: "Disconnect Smoke Agent A",
    ownerUserId: "user-disconnect-a",
    modelName: "test-model",
    kind: "external" as const,
    registeredAt: new Date().toISOString(),
    assignmentStatus: "registered" as const,
  };
  const survivingAgent = {
    id: "disconnect-smoke-agent-b",
    name: "Disconnect Smoke Agent B",
    ownerUserId: "user-disconnect-b",
    modelName: "test-model",
    kind: "external" as const,
    registeredAt: new Date().toISOString(),
    assignmentStatus: "playing" as const,
  };
  const harness = createHarness({ decisionMode: "pending", agents: [disconnectedAgent, survivingAgent] });
  const simulator = new GameSimulator("http://localhost:3000", harness.deps, "disconnect-table", "Disconnect Table");
  const simulatorInternals = simulator as unknown as SimulatorInternals;
  const manager = new TableManager("http://localhost:3000");
  const managerInternals = manager as unknown as TableManagerInternals;

  registerAgent(disconnectedAgent);
  assignAgentToTable(disconnectedAgent.id, "disconnect-table", "playing");
  markAgentDisconnected(disconnectedAgent.id);
  harness.agents.splice(0, harness.agents.length, survivingAgent);
  simulatorInternals.activeBuyIns = [
    {
      agentId: disconnectedAgent.id,
      amount: initialStack,
      gameSessionId: "disconnect-smoke-session",
      ownerUserId: disconnectedAgent.ownerUserId,
    },
    {
      agentId: survivingAgent.id,
      amount: initialStack,
      gameSessionId: "disconnect-smoke-session",
      ownerUserId: survivingAgent.ownerUserId,
    },
  ];
  managerInternals.tables.set("disconnect-table", {
    id: "disconnect-table",
    name: "Disconnect Table",
    createdAt: new Date().toISOString(),
    runner: simulator,
  });

  const result = await manager.leaveAgent(disconnectedAgent.id);

  assert.deepEqual(result, { removed: true, tableEnded: true }, "disconnected Agent should auto-leave its retained table");
  assert.equal(harness.settleCalls.length, 1, "disconnected Agent auto-leave should settle the Agent");
  assert.equal(harness.settleCalls[0][0].agentId, disconnectedAgent.id, "settlement should target the disconnected Agent");
  assert.ok(
    !simulatorInternals.engine.snapshot().players.some((player) => player.id === disconnectedAgent.id),
    "disconnected Agent should be removed from the engine snapshot",
  );
  assert.ok(listAgents().every((agent) => agent.id !== disconnectedAgent.id), "disconnected Agent registration should be removed");
  clearAgents();
}

async function assertMinimumRaiseTracksPreviousRaiseSize() {
  const engine = new PokerGameEngine([
    { id: "raise-smoke-a", name: "Raise Smoke A", modelName: "test-model" },
    { id: "raise-smoke-b", name: "Raise Smoke B", modelName: "test-model" },
    { id: "raise-smoke-c", name: "Raise Smoke C", modelName: "test-model" },
  ]);
  const requests: AgentDecisionRequest[] = [];

  engine.setRunning(true);
  await engine.playOneHand(async (request) => {
    requests.push(request);

    if (request.playerId === "raise-smoke-a" && request.toCall === 10) {
      return {
        type: "action_response",
        playerId: request.playerId,
        action: { type: "raise", amount: 50 },
        reasoning: "测试第一次完整加注到 50。",
      };
    }

    if (request.playerId === "raise-smoke-b") {
      assert.equal(request.minRaise, 40, "minimum raise should equal the previous full raise increment");
      return {
        type: "action_response",
        playerId: request.playerId,
        action: { type: "raise", amount: 60 },
        reasoning: "测试低于最小加注的输入会被校正。",
      };
    }

    if (request.playerId === "raise-smoke-c") {
      assert.equal(request.toCall, 80, "second raise should be coerced to a 90 target bet");
      assert.equal(request.minRaise, 40, "coerced raise should preserve the 40 raise increment");
      return {
        type: "action_response",
        playerId: request.playerId,
        action: { type: "fold" },
        reasoning: "测试结束行动。",
      };
    }

    return {
      type: "action_response",
      playerId: request.playerId,
      action: request.toCall > 0 ? { type: "fold" } : { type: "check" },
      reasoning: "测试结束行动。",
    };
  });

  const firstRaise = engine.snapshot().logs.find((log) => log.actor === "raise-smoke-a" && log.message.includes("加注到 50"));
  const coercedRaise = engine.snapshot().logs.find((log) => log.actor === "raise-smoke-b" && log.message.includes("加注到 90"));

  assert.ok(firstRaise, "first raise should be applied at the requested 50 target");
  assert.ok(coercedRaise, "undersized second raise should be coerced to 90");
  assert.ok(requests.some((request) => request.minRaise === 40), "decision requests should expose the dynamic minRaise");
}

async function assertShortStackCallCommitsAllIn() {
  const engine = new PokerGameEngine([
    { id: "short-call-a", name: "Short Call A", modelName: "test-model" },
    { id: "short-call-b", name: "Short Call B", modelName: "test-model" },
  ]);
  const internals = engine as unknown as {
    applyAction: (playerId: string, decision: { action: { type: "call" }; reasoning: string }) => boolean;
    currentBet: number;
    players: PlayerState[];
    pot: number;
  };

  internals.currentBet = 910;
  internals.pot = 1_200;
  internals.players[0] = {
    ...internals.players[0],
    currentBet: 0,
    stack: 370,
    status: "active",
    totalCommitted: 0,
  };

  internals.applyAction("short-call-a", {
    action: { type: "call" },
    reasoning: "测试短筹码 call 应自动 all-in。",
  });

  const player = engine.snapshot().players.find((item) => item.id === "short-call-a");
  assert.equal(player?.stack, 0, "short-stack call should commit the remaining stack");
  assert.equal(player?.currentBet, 370, "short-stack call should add only affordable chips to currentBet");
  assert.equal(player?.totalCommitted, 370, "short-stack call should record the all-in commitment");
  assert.equal(player?.status, "all-in", "short-stack call should mark the player all-in");
  assert.equal(engine.snapshot().pot, 1_570, "short-stack call should add committed chips to the pot");
  assert.ok(engine.snapshot().logs.some((log) => log.message.includes("跟注 370")), "short-stack call log should show committed all-in amount");
}

async function assertSidePotSplitMainPotOnly() {
  const engine = new PokerGameEngine([
    { id: "side-pot-a", name: "Side Pot A", modelName: "test-model" },
    { id: "side-pot-b", name: "Side Pot B", modelName: "test-model" },
    { id: "side-pot-c", name: "Side Pot C", modelName: "test-model" },
  ]);
  const internals = engine as unknown as {
    awardPot: () => void;
    communityCards: Card[];
    handId: number;
    phase: string;
    players: PlayerState[];
    pot: number;
  };

  internals.handId = 1;
  internals.phase = "showdown";
  internals.communityCards = [
    { rank: "A", suit: "c" },
    { rank: "K", suit: "c" },
    { rank: "9", suit: "h" },
    { rank: "8", suit: "d" },
    { rank: "3", suit: "s" },
  ];
  internals.players[0] = {
    ...internals.players[0],
    holeCards: [
      { rank: "A", suit: "s" },
      { rank: "K", suit: "d" },
    ],
    stack: 0,
    currentBet: 15,
    totalCommitted: 15,
    status: "all-in",
  };
  internals.players[1] = {
    ...internals.players[1],
    holeCards: [
      { rank: "A", suit: "h" },
      { rank: "K", suit: "s" },
    ],
    stack: 950,
    currentBet: 50,
    totalCommitted: 50,
    status: "active",
  };
  internals.players[2] = {
    ...internals.players[2],
    holeCards: [
      { rank: "7", suit: "d" },
      { rank: "2", suit: "c" },
    ],
    stack: 950,
    currentBet: 50,
    totalCommitted: 50,
    status: "active",
  };
  internals.pot = 115;

  internals.awardPot();

  const snapshot = engine.snapshot();
  const playerA = snapshot.players.find((player) => player.id === "side-pot-a");
  const playerB = snapshot.players.find((player) => player.id === "side-pot-b");
  const playerC = snapshot.players.find((player) => player.id === "side-pot-c");

  assert.equal(playerA?.stack, 23, "short all-in tied winner should receive half of the 45 main pot plus odd chip");
  assert.equal(playerB?.stack, 1042, "deep tied winner should receive main pot share plus the 70 side pot");
  assert.equal(playerC?.stack, 950, "side pot loser should not receive chips");
  assert.ok(snapshot.logs.some((log) => log.message.includes("摊牌分池") && log.message.includes("主池 45") && log.message.includes("边池 1 70")));
}

async function assertCommunityCardsAreCappedAtFive() {
  const engine = new PokerGameEngine([
    { id: "board-cap-a", name: "Board Cap A", modelName: "test-model" },
    { id: "board-cap-b", name: "Board Cap B", modelName: "test-model" },
  ]);
  const internals = engine as unknown as {
    communityCards: Card[];
    deck: Card[];
    dealCommunity: (count: number) => void;
  };

  internals.deck = [{ rank: "T", suit: "c" }];
  internals.communityCards = [
    { rank: "A", suit: "c" },
    { rank: "K", suit: "c" },
    { rank: "Q", suit: "c" },
    { rank: "J", suit: "c" },
  ];
  internals.dealCommunity(3);

  assert.equal(engine.snapshot().communityCards.length, 5, "community board should never exceed five cards");
}

async function assertDecisionSubscribersReceivePendingAndClear() {
  const playerId = `ws-smoke-${Date.now()}`;
  const observed: Array<string | null> = [];
  const unsubscribe = subscribePendingDecision(playerId, (decision) => {
    observed.push(decision?.request.requestId ?? null);
  });
  const decisionPromise = enqueueDecision({
    type: "decision_request",
    handId: 1,
    playerId,
    privateCards: [],
    publicState: {
      handId: 1,
      running: true,
      phase: "preflop",
      dealerIndex: 0,
      smallBlind: 5,
      bigBlind: 10,
      pot: 0,
      currentBet: 0,
      minRaise: 10,
      communityCards: [],
      players: [],
    },
    actionHistory: [],
    legalActions: ["check"],
    toCall: 0,
    minRaise: 10,
    stack: 1000,
    handAnalysis: analyzeDecisionHand([], []),
  });
  const requestId = observed.find((value): value is string => Boolean(value));

  assert.ok(requestId, "subscriber should receive pending decision requestId");
  submitDecision({
    type: "action_response",
    requestId,
    playerId,
    action: { type: "check" },
    reasoning: "WebSocket 订阅测试提交动作。",
  });
  await decisionPromise;
  unsubscribe();

  assert.equal(observed.at(-1), null, "subscriber should be notified when pending decision clears");
}

async function assertAgentRegistrySubscribersObserveSessionClear() {
  let notifications = 0;
  const unsubscribe = subscribeAgentRegistry(() => {
    notifications += 1;
  });

  registerAgent({ id: "registry-smoke-agent", name: "Registry Smoke Agent", modelName: "test-model", ownerUserId: "user-test" });
  clearAgents();
  unsubscribe();

  assert.ok(notifications >= 2, "registry subscribers should observe agent registration and session clear");
}

function createHarness(options: { decisionMode: "auto-fold" | "pending"; agents?: RegisteredAgent[] }) {
  const activeAgents = options.agents ?? agents;
  const reserveCalls: GameBuyIn[][] = [];
  const settleCalls: GameSettlement[][] = [];
  const pendingDecisions: Array<{
    reject: (error: Error) => void;
    request: AgentDecisionRequest;
    resolve: (response: AgentDecisionResponse) => void;
  }> = [];
  let clearAgentsCalls = 0;

  return {
    get clearAgentsCalls() {
      return clearAgentsCalls;
    },
    deps: {
      clearAgents: () => {
        clearAgentsCalls += 1;
      },
      clearPendingDecisions: (reason = "cleared") => {
        for (const decision of pendingDecisions.splice(0)) {
          decision.reject(new Error(reason));
        }
      },
      enqueueDecision: (request: AgentDecisionRequest) => {
        if (options.decisionMode === "auto-fold") {
          return Promise.resolve<AgentDecisionResponse>({
            type: "action_response",
            playerId: request.playerId,
            action: request.toCall > 0 ? { type: "fold" } : { type: "check" },
            reasoning: "生命周期测试自动决策。",
          });
        }

        return new Promise<AgentDecisionResponse>((resolve, reject) => {
          pendingDecisions.push({ reject, request, resolve });
        });
      },
      listAgents: () => activeAgents,
      reserveGameBuyIns: async (buyIns: GameBuyIn[]) => {
        reserveCalls.push(buyIns);
      },
      settleGameBuyIns: async (settlements: GameSettlement[]) => {
        settleCalls.push(settlements);
      },
    },
    agents: activeAgents,
    pendingDecisions,
    reserveCalls,
    resolvePendingAsFold: () => {
      for (const decision of pendingDecisions.splice(0)) {
        decision.resolve({
          type: "action_response",
          playerId: decision.request.playerId,
          action: decision.request.toCall > 0 ? { type: "fold" } : { type: "check" },
          reasoning: "生命周期测试释放等待决策。",
        });
      }
    },
    settleCalls,
  };
}

function createSimulator(harness: ReturnType<typeof createHarness>) {
  tableIdCounter += 1;
  const tableId = `smoke-table-${tableIdCounter}`;
  return new GameSimulator("http://localhost:3000", harness.deps, tableId, `Smoke Table ${tableIdCounter}`);
}

type SimulatorInternals = {
  addNewPollingAgents: () => Promise<void>;
  activeBuyIns: GameBuyIn[];
  engine: {
    players: Array<{ id: string; stack: number }>;
    removePlayers: (playerIds: string[]) => string[];
    snapshot: () => { players: Array<{ id: string }> };
  };
};

type TableManagerInternals = {
  tables: Map<string, { id: string; name: string; createdAt: string; runner: GameSimulator }>;
};

async function waitFor(predicate: () => boolean) {
  const deadline = Date.now() + 1_000;

  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for lifecycle smoke test condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
