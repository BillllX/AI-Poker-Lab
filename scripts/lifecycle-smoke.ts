import { strict as assert } from "node:assert";
import type { AgentDecisionRequest, AgentDecisionResponse } from "../src/lib/poker/types";
import { enqueueDecision, submitDecision, subscribePendingDecision } from "../src/lib/server/decisionBroker";
import { clearAgents, registerAgent, subscribeAgentRegistry } from "../src/lib/server/agentRegistry";
import { GameSimulator } from "../src/lib/server/simulator";
import type { GameBuyIn, GameSettlement } from "../src/lib/server/userRegistry";

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

async function main() {
  await assertConcurrentStartReservesOnce();
  await assertConcurrentEndSessionSettlesOnce();
  await assertMidDecisionResetSettlesOnce();
  await assertAutoStartWaitsForPollingAgents();
  await assertNewPollingAgentJoinsNextHand();
  await assertDecisionSubscribersReceivePendingAndClear();
  await assertAgentRegistrySubscribersObserveSessionClear();
  console.log("Lifecycle smoke tests passed.");
}

async function assertConcurrentStartReservesOnce() {
  const harness = createHarness({ decisionMode: "auto-fold" });
  const simulator = new GameSimulator("http://localhost:3000", harness.deps);

  await Promise.all([simulator.start(), simulator.start(), simulator.start()]);
  simulator.stop();

  assert.equal(harness.reserveCalls.length, 1, "concurrent start should reserve buy-ins once");
  assert.equal(harness.reserveCalls[0].length, 2, "start should reserve one buy-in per Agent");
  assert.ok(harness.reserveCalls[0].every((buyIn) => buyIn.gameSessionId), "buy-ins should carry a gameSessionId");
}

async function assertConcurrentEndSessionSettlesOnce() {
  const harness = createHarness({ decisionMode: "auto-fold" });
  const simulator = new GameSimulator("http://localhost:3000", harness.deps);

  await simulator.start();
  await Promise.all([simulator.endSession("http://localhost:3000"), simulator.endSession("http://localhost:3000")]);

  assert.equal(harness.settleCalls.length, 1, "concurrent endSession should settle once");
  assert.equal(harness.clearAgentsCalls, 2, "each endSession call may clear the already-stopped roster");
}

async function assertMidDecisionResetSettlesOnce() {
  const harness = createHarness({ decisionMode: "pending" });
  const simulator = new GameSimulator("http://localhost:3000", harness.deps);

  await simulator.start();
  await waitFor(() => harness.pendingDecisions.length > 0);
  await Promise.all([simulator.reset("http://localhost:3000"), simulator.reset("http://localhost:3000")]);

  assert.equal(harness.settleCalls.length, 1, "reset during a pending decision should settle once");
  assert.equal(harness.pendingDecisions.length, 0, "reset should clear pending decisions");
}

async function assertAutoStartWaitsForPollingAgents() {
  const harness = createHarness({ decisionMode: "pending", agents: [] });
  const simulator = new GameSimulator("http://localhost:3000", harness.deps);

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
  const simulator = new GameSimulator("http://localhost:3000", harness.deps);

  await simulator.start();
  await waitFor(() => harness.pendingDecisions.length > 0);
  harness.agents.push(thirdAgent);
  harness.resolvePendingAsFold();
  await waitFor(() => harness.reserveCalls.some((call) => call.some((buyIn) => buyIn.agentId === thirdAgent.id)));
  simulator.stop();

  assert.ok(harness.reserveCalls.length >= 2, "new polling Agent should get a separate buy-in reserve call");
  assert.equal(harness.reserveCalls.at(-1)?.[0]?.agentId, thirdAgent.id, "new polling Agent should join on a hand boundary");
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

function createHarness(options: { decisionMode: "auto-fold" | "pending"; agents?: typeof agents }) {
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
