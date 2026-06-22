import { createDeck, formatCard, shuffle } from "./cards";
import { analyzeDecisionHand } from "./handAnalysis";
import { compareHands, evaluateTexasHand } from "./handEvaluator";
import { logger } from "../server/logger";
import type {
  ActionHistoryItem,
  ActionLog,
  AgentDecisionRequest,
  AgentDecisionResponse,
  AgentStats,
  AgentStyle,
  BettingRound,
  Card,
  GameSnapshot,
  LegalAction,
  PlayerState,
  PokerAction,
} from "./types";

type PlayerConfig = {
  id: string;
  name: string;
  ownerUserId?: string;
  modelName?: string;
  kind?: "external" | "hosted" | "human" | "resident" | "virtual";
  strategy?: AgentStyle;
  endpoint?: string;
  initialStack?: number;
};
type GameEngineOptions = {
  playerDecisionPauseMs?: number;
  tableId?: string;
  tableName?: string;
};

type RequestAction = (request: AgentDecisionRequest) => Promise<AgentDecisionResponse>;
type PlayerDecision = {
  action: PokerAction;
  reasoning?: string;
};

export const initialStack = 1_000;
const maxLogEntries = 200;
const maxActionHistoryEntries = 500;
const playerDecisionPauseMs = 3_000;

export class PokerGameEngine {
  private deck: Card[] = [];
  private players: PlayerState[];
  private communityCards: Card[] = [];
  private logs: ActionLog[] = [];
  private actionHistory: ActionHistoryItem[] = [];
  private stats: AgentStats[];
  private handId = 0;
  private dealerIndex = -1;
  private pot = 0;
  private phase: BettingRound = "preflop";
  private currentBet = 0;
  private currentPlayerId?: string;
  private running = false;

  readonly smallBlind = 5;
  readonly bigBlind = 10;
  private minRaise = this.bigBlind;

  constructor(
    players: PlayerConfig[],
    private readonly options: GameEngineOptions = {},
  ) {
    this.players = players.map((player) => ({
      ...player,
      stack: normalizedInitialStack(player.initialStack),
      holeCards: [],
      currentBet: 0,
      totalCommitted: 0,
      status: "active",
      lastReasoning: undefined,
    }));
    this.stats = players.map((player) => ({
      playerId: player.id,
      modelName: player.modelName,
      handsWon: 0,
      handsPlayed: 0,
      profit: 0,
    }));
  }

  setRunning(running: boolean) {
    this.running = running;
  }

  isRunning() {
    return this.running;
  }

  addPlayers(players: PlayerConfig[]) {
    const existingIds = new Set(this.players.map((player) => player.id));
    const newPlayers = players.filter((player) => !existingIds.has(player.id));

    if (newPlayers.length === 0) {
      return [];
    }

    this.players = [
      ...this.players,
      ...newPlayers.map((player) => ({
        ...player,
        stack: normalizedInitialStack(player.initialStack),
        holeCards: [],
        currentBet: 0,
        totalCommitted: 0,
        status: "active" as const,
        lastReasoning: undefined,
      })),
    ];
    this.stats = [
      ...this.stats,
      ...newPlayers.map((player) => ({
        playerId: player.id,
        modelName: player.modelName,
        handsWon: 0,
        handsPlayed: 0,
        profit: 0,
      })),
    ];

    for (const player of newPlayers) {
      this.log("system", `${player.name} 已开始轮询，下一手起加入牌桌。`);
    }

    return newPlayers.map((player) => player.id);
  }

  addChips(playerId: string, amount: number) {
    const index = this.players.findIndex((player) => player.id === playerId);
    const normalizedAmount = Math.floor(Number(amount));
    if (index === -1 || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return undefined;
    }

    this.players[index] = {
      ...this.players[index],
      stack: this.players[index].stack + normalizedAmount,
      status: this.players[index].status === "out" ? "active" : this.players[index].status,
    };
    this.updateProfitStats();
    this.log("system", `${this.players[index].name} 追加带入 ${normalizedAmount}，下一手起生效。`);
    return this.players[index];
  }

  reset() {
    this.deck = [];
    this.communityCards = [];
    this.logs = [];
    this.actionHistory = [];
    this.handId = 0;
    this.dealerIndex = -1;
    this.pot = 0;
    this.phase = "preflop";
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.currentPlayerId = undefined;
    this.running = false;
    this.players = this.players.map((player) => ({
      ...player,
      stack: initialStack,
      holeCards: [],
      currentBet: 0,
      totalCommitted: 0,
      status: "active",
      lastAction: undefined,
      lastReasoning: undefined,
    }));
    this.stats = this.stats.map((stat) => ({
      ...stat,
      handsWon: 0,
      handsPlayed: 0,
      profit: 0,
    }));
  }

  async playOneHand(requestAction: RequestAction) {
    if (!this.prepareHand()) {
      return false;
    }

    await this.bettingRound("preflop", this.nextSeat(this.bigBlindIndex()), requestAction);

    if (this.activePlayers().length > 1) {
      this.dealCommunity(3);
      await this.bettingRound("flop", this.nextSeat(this.dealerIndex), requestAction);
    }

    if (this.activePlayers().length > 1) {
      this.dealCommunity(1);
      await this.bettingRound("turn", this.nextSeat(this.dealerIndex), requestAction);
    }

    if (this.activePlayers().length > 1) {
      this.dealCommunity(1);
      await this.bettingRound("river", this.nextSeat(this.dealerIndex), requestAction);
    }

    this.completeBoardForShowdown();
    this.phase = "showdown";
    this.awardPot();
    return true;
  }

  snapshot(): GameSnapshot {
    return {
      tableId: this.options.tableId,
      tableName: this.options.tableName,
      handId: this.handId,
      running: this.running,
      phase: this.phase,
      dealerIndex: this.dealerIndex,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      pot: this.pot,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      currentPlayerId: this.currentPlayerId,
      communityCards: this.communityCards,
      players: this.players.map((player) => ({ ...player })),
      actionHistory: this.publicActionHistoryForCurrentHand().slice(-80),
      logs: this.logs.slice(-80).reverse(),
      stats: this.stats,
      modelStats: this.modelStats(),
    };
  }

  statsForPlayer(playerId: string) {
    const stat = this.stats.find((item) => item.playerId === playerId);
    return stat ? { ...stat } : undefined;
  }

  refundUnsettledPot() {
    if (this.pot <= 0) {
      return;
    }

    const refundedPot = this.pot;
    this.players = this.players.map((player) => ({
      ...player,
      stack: player.stack + player.totalCommitted,
      currentBet: 0,
      totalCommitted: 0,
      status: player.status === "all-in" ? "active" : player.status,
    }));
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.pot = 0;
    this.log("system", `牌局中止，未结算底池 ${refundedPot} 已按本手投入退回各 Agent。`);
    this.updateProfitStats();
  }

  settlePlayer(playerId: string, reason: "busted" | "left") {
    const index = this.players.findIndex((player) => player.id === playerId);
    if (index === -1) {
      return undefined;
    }

    const player = this.players[index];
    const finalStack = Math.max(0, player.stack);
    this.players[index] = {
      ...player,
      holeCards: [],
      lastAction: reason,
      lastReasoning: undefined,
      stack: finalStack,
      status: "out",
    };

    if (this.currentPlayerId === playerId) {
      this.currentPlayerId = undefined;
    }

    this.log("system", `${player.name} ${reason === "busted" ? "筹码清空，已自动结算并离桌。" : "主动退出，已结算并离桌。"}`);
    this.updateProfitStats();
    return { finalStack, player: this.players[index] };
  }

  removePlayers(playerIds: string[]) {
    const removeSet = new Set(playerIds);
    if (removeSet.size === 0) {
      return [];
    }

    const removed = this.players.filter((player) => removeSet.has(player.id));
    this.players = this.players.filter((player) => !removeSet.has(player.id));
    this.stats = this.stats.filter((stat) => !removeSet.has(stat.playerId));
    this.currentPlayerId = this.currentPlayerId && removeSet.has(this.currentPlayerId) ? undefined : this.currentPlayerId;
    this.dealerIndex = Math.min(this.dealerIndex, Math.max(-1, this.players.length - 1));
    return removed.map((player) => player.id);
  }

  private prepareHand() {
    this.players = this.players.map((player) => ({
      ...player,
      holeCards: [],
      currentBet: 0,
      totalCommitted: 0,
      status: player.stack > 0 ? "active" : "out",
      lastAction: undefined,
      lastReasoning: undefined,
    }));

    if (this.players.filter((player) => player.stack > 0).length < 2) {
      this.running = false;
      this.currentPlayerId = undefined;
      this.log("system", "剩余有筹码的 Agent 不足 2 人，牌局结束，不再自动买入或开新局。");
      return false;
    }

    this.handId += 1;
    this.dealerIndex = this.nextSeat(this.dealerIndex);
    this.deck = shuffle(createDeck());
    this.communityCards = [];
    this.actionHistory = [];
    this.pot = 0;
    this.currentBet = this.bigBlind;
    this.minRaise = this.bigBlind;
    this.currentPlayerId = undefined;
    this.phase = "preflop";

    this.players = this.players.map((player) => ({
      ...player,
      holeCards: player.stack > 0 ? [this.draw(), this.draw()] : [],
    }));

    for (const stat of this.stats) {
      const player = this.players.find((item) => item.id === stat.playerId);
      if (player && player.stack > 0) {
        stat.handsPlayed += 1;
      }
    }

    this.postBlind(this.smallBlindIndex(), this.smallBlind, "小盲");
    this.postBlind(this.bigBlindIndex(), this.bigBlind, "大盲");
    this.log("system", `第 ${this.handId} 手牌开始。`);
    return true;
  }

  private async bettingRound(round: BettingRound, startIndex: number, requestAction: RequestAction) {
    this.phase = round;

    if (round !== "preflop") {
      this.currentBet = 0;
      this.minRaise = this.bigBlind;
      this.players = this.players.map((player) => ({ ...player, currentBet: 0 }));
    }

    const pending = new Set(this.actionablePlayers().map((player) => player.id));
    let seat = startIndex;
    let guard = 0;

    while (pending.size > 0 && this.activePlayers().length > 1 && guard < 100) {
      guard += 1;
      const player = this.players[seat];
      seat = this.nextSeat(seat);

      if (!player || !pending.has(player.id) || player.status !== "active" || player.stack <= 0) {
        continue;
      }

      const decision = await this.requestPlayerAction(player, pending, requestAction);
      const raised = this.applyAction(player.id, decision);
      pending.delete(player.id);

      if (raised) {
        for (const opponent of this.actionablePlayers()) {
          if (opponent.id !== player.id) {
            pending.add(opponent.id);
          }
        }
      }
      await this.pauseAfterPlayerDecision();
    }
  }

  private async pauseAfterPlayerDecision() {
    const pauseMs = this.options.playerDecisionPauseMs ?? configuredPlayerDecisionPauseMs();
    if (pauseMs <= 0) {
      return;
    }
    await sleep(pauseMs);
  }

  private async requestPlayerAction(player: PlayerState, pending: Set<string>, requestAction: RequestAction) {
    this.currentPlayerId = player.id;
    const toCall = Math.max(0, this.currentBet - player.currentBet);
    const legalActions = this.legalActionsFor(player);
    const request: AgentDecisionRequest = {
      type: "decision_request",
      tableId: this.options.tableId,
      handId: this.handId,
      playerId: player.id,
      privateCards: player.holeCards,
      publicState: this.decisionPublicState(player.id),
      actionHistory: this.publicActionHistoryForCurrentHand().slice(-20),
      legalActions,
      toCall,
      minRaise: this.minRaise,
      stack: player.stack,
      handAnalysis: analyzeDecisionHand(player.holeCards, this.communityCards),
    };

    try {
      const decision = await requestAction(request);
      return {
        action: normalizeAction(decision.action, legalActions, toCall),
        reasoning: decision.reasoning,
      };
    } catch (error) {
      pending.delete(player.id);
      this.log(player.id, `Agent 决策失败或超时，自动执行保守动作：${String(error)}`);
      return { action: fallbackAction(toCall), reasoning: "Agent 决策失败或超时，服务端执行保守兜底动作。" };
    } finally {
      if (this.currentPlayerId === player.id) {
        this.currentPlayerId = undefined;
      }
    }
  }

  private legalActionsFor(player: PlayerState): LegalAction[] {
    const toCall = Math.max(0, this.currentBet - player.currentBet);

    if (toCall > 0) {
      return player.stack > toCall ? ["fold", "call", "raise"] : ["fold", "call"];
    }

    return player.stack > 0 ? ["check", "bet"] : ["check"];
  }

  private decisionPublicState(currentPlayerId: string): AgentDecisionRequest["publicState"] {
    return {
      tableId: this.options.tableId,
      tableName: this.options.tableName,
      handId: this.handId,
      running: this.running,
      phase: this.phase,
      dealerIndex: this.dealerIndex,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      pot: this.pot,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      currentPlayerId,
      communityCards: this.communityCards,
      players: this.players.map((visiblePlayer) => ({
        id: visiblePlayer.id,
        name: visiblePlayer.name,
        kind: visiblePlayer.kind,
        stack: visiblePlayer.stack,
        currentBet: visiblePlayer.currentBet,
        totalCommitted: visiblePlayer.totalCommitted,
        status: visiblePlayer.status,
        lastAction: visiblePlayer.lastAction,
      })),
    };
  }

  private applyAction(playerId: string, decision: PlayerDecision): boolean {
    const action = decision.action;
    const reasoning = sanitizeReasoning(decision.reasoning);
    const index = this.players.findIndex((player) => player.id === playerId);
    if (index === -1) {
      return false;
    }
    const player = this.players[index];
    if (player.status === "out") {
      return false;
    }
    const beforeBet = this.currentBet;
    const minRaiseBeforeAction = this.minRaise;
    const toCall = Math.max(0, this.currentBet - player.currentBet);

    if (action.type === "fold") {
      this.players[index] = { ...player, status: "folded", lastAction: "fold", lastReasoning: reasoning };
      this.recordAction(player, "fold");
      this.log(player.id, withReasoning(`${player.name} 弃牌。`, reasoning));
      return false;
    }

    if (action.type === "check" && toCall === 0) {
      this.players[index] = { ...player, lastAction: "check", lastReasoning: reasoning };
      this.recordAction(player, "check");
      this.log(player.id, withReasoning(`${player.name} 过牌。`, reasoning));
      return false;
    }

    if (action.type === "call" || (action.type === "check" && toCall > 0)) {
      this.commitChips(index, toCall);
      this.players[index] = { ...this.players[index], lastReasoning: reasoning };
      const committed = Math.min(toCall, player.stack);
      this.recordAction(player, "call", { amount: committed, isAllIn: this.players[index].stack === 0, targetBet: this.players[index].currentBet });
      this.log(player.id, withReasoning(`${player.name} 跟注 ${committed}。`, reasoning));
      return false;
    }

    const targetBet = this.targetBetFor(action);
    this.commitChips(index, Math.max(0, targetBet - player.currentBet));
    const updated = this.players[index];
    this.currentBet = Math.max(this.currentBet, updated.currentBet);
    const raiseIncrement = this.currentBet - beforeBet;
    const isFullBetOrRaise = raiseIncrement >= minRaiseBeforeAction;
    if (isFullBetOrRaise) {
      this.minRaise = raiseIncrement;
    }
    this.players[index] = { ...updated, lastReasoning: reasoning };
    const actionAmount = action.type === "raise" ? this.currentBet - beforeBet : updated.currentBet - player.currentBet;
    this.recordAction(player, action.type, {
      amount: actionAmount,
      isAllIn: updated.stack === 0,
      targetBet: updated.currentBet,
    });
    this.log(
      player.id,
      withReasoning(
        beforeBet === 0
          ? `${player.name} 下注 ${updated.currentBet}。`
          : `${player.name} 加注 ${actionAmount} 到 ${updated.currentBet}。`,
        reasoning,
      ),
    );

    return this.currentBet > beforeBet && isFullBetOrRaise;
  }

  private targetBetFor(action: PokerAction) {
    if (action.type === "bet") {
      return Math.max(this.bigBlind, safeAmount(action.amount, this.bigBlind));
    }

    if (action.type === "raise") {
      return this.currentBet + Math.max(this.minRaise, safeAmount(action.amount, this.minRaise));
    }

    return this.currentBet;
  }

  private commitChips(index: number, requestedAmount: number) {
    const player = this.players[index];
    const amount = Number.isFinite(requestedAmount) ? Math.max(0, Math.min(requestedAmount, player.stack)) : 0;
    const nextStack = player.stack - amount;

    this.players[index] = {
      ...player,
      stack: nextStack,
      currentBet: player.currentBet + amount,
      totalCommitted: player.totalCommitted + amount,
      status: nextStack === 0 ? "all-in" : player.status,
      lastAction: amount >= requestedAmount ? "commit" : "all-in",
    };
    this.pot += amount;
  }

  private awardPot() {
    const contenders = this.activePlayers();
    const handWinners = new Set<string>();

    if (contenders.length === 1) {
      const wonAmount = this.pot;
      this.payWinner(contenders[0].id, wonAmount);
      this.recordAction(contenders[0], "win", { amount: wonAmount, handLabel: "all opponents folded" });
      handWinners.add(contenders[0].id);
      this.log(contenders[0].id, `${contenders[0].name} 赢得底池 ${wonAmount}。`);
      logger.info("poker.pot_awarded", {
        tableId: this.options.tableId,
        handId: this.handId,
        communityCards: this.communityCards.map(formatCard),
        pots: [
          {
            label: "底池",
            amount: wonAmount,
            winners: [{ playerId: contenders[0].id, name: contenders[0].name, amount: wonAmount }],
          },
        ],
        players: this.players.map((player) => ({
          id: player.id,
          name: player.name,
          status: player.status,
          stack: player.stack,
          totalCommitted: player.totalCommitted,
          holeCards: player.holeCards.map(formatCard),
        })),
      });
      this.recordHandWins(handWinners);
      this.updateProfitStats();
      this.pot = 0;
      return;
    }

    const evaluated = contenders.map((player) => ({
      player,
      hand: evaluateTexasHand([...player.holeCards, ...this.communityCards]),
    }));

    const pots = buildPots(this.players);
    const potBreakdowns: Array<{
      amount: number;
      contributors: string[];
      eligible: string[];
      label: string;
      winners: Array<{ amount: number; handRank: string; name: string; playerId: string }>;
    }> = [];
    this.log(
      "system",
      `摊牌分池：公共牌 ${this.communityCards.map(formatCard).join(" ")}；${pots
        .map(
          (pot) =>
            `${pot.label} ${pot.amount}，贡献者 ${this.playerLabels(pot.contributorPlayerIds).join("、")}，可争夺 ${this.playerLabels(pot.eligiblePlayerIds).join("、")}`,
        )
        .join("；")}。`,
    );

    for (const pot of pots) {
      const eligible = evaluated.filter((entry) => pot.eligiblePlayerIds.includes(entry.player.id));
      const best = eligible.sort((left, right) => compareHands(left.hand, right.hand)).at(-1);

      if (!best) {
        continue;
      }

      const winners = eligible.filter((entry) => compareHands(entry.hand, best.hand) === 0);
      const share = Math.floor(pot.amount / winners.length);
      let remainder = pot.amount % winners.length;
      const awards = winners.map((winner) => {
        const wonAmount = share + (remainder > 0 ? 1 : 0);
        remainder = Math.max(0, remainder - 1);
        return { winner, wonAmount };
      });

      potBreakdowns.push({
        amount: pot.amount,
        contributors: pot.contributorPlayerIds,
        eligible: pot.eligiblePlayerIds,
        label: pot.label,
        winners: awards.map(({ winner, wonAmount }) => ({
          amount: wonAmount,
          handRank: winner.hand.rank,
          name: winner.player.name,
          playerId: winner.player.id,
        })),
      });

      for (const { winner, wonAmount } of awards) {
        this.payWinner(winner.player.id, wonAmount);
        this.recordAction(winner.player, "win", {
          amount: wonAmount,
          handLabel: handRankLabel(winner.hand.rank),
          handRank: winner.hand.rank,
        });
        handWinners.add(winner.player.id);
        this.log(
          winner.player.id,
          `${winner.player.name} 以 ${winner.hand.rank} 赢得${pot.label} ${wonAmount}，手牌 ${winner.player.holeCards.map(formatCard).join(" ")}。`,
        );
      }
    }

    logger.info("poker.pot_awarded", {
      tableId: this.options.tableId,
      handId: this.handId,
      communityCards: this.communityCards.map(formatCard),
      pots: potBreakdowns,
      players: this.players.map((player) => ({
        id: player.id,
        name: player.name,
        status: player.status,
        stack: player.stack,
        totalCommitted: player.totalCommitted,
        holeCards: player.holeCards.map(formatCard),
      })),
    });

    this.recordHandWins(handWinners);
    this.updateProfitStats();
    this.pot = 0;
  }

  private payWinner(playerId: string, amount: number) {
    const index = this.players.findIndex((player) => player.id === playerId);
    this.players[index] = {
      ...this.players[index],
      stack: this.players[index].stack + amount,
    };
  }

  private recordHandWins(winnerIds: Set<string>) {
    for (const winnerId of winnerIds) {
      const stat = this.stats.find((item) => item.playerId === winnerId);
      if (stat) {
        stat.handsWon += 1;
      }
    }
  }

  private updateProfitStats() {
    for (const player of this.players) {
      const playerStat = this.stats.find((item) => item.playerId === player.id);
      if (playerStat) {
        playerStat.profit = player.stack - initialStack;
      }
    }
  }

  private playerLabels(playerIds: string[]) {
    return playerIds.map((playerId) => {
      const player = this.players.find((item) => item.id === playerId);
      return player ? `${player.name}(${player.totalCommitted})` : playerId;
    });
  }

  private modelStats() {
    const statsByModel = new Map<string, { modelName: string; handsPlayed: number; agents: Set<string> }>();

    for (const stat of this.stats) {
      const modelName = stat.modelName ?? "Unknown Model";
      const existing = statsByModel.get(modelName) ?? { modelName, handsPlayed: 0, agents: new Set<string>() };
      existing.handsPlayed += stat.handsPlayed;
      existing.agents.add(stat.playerId);
      statsByModel.set(modelName, existing);
    }

    return [...statsByModel.values()]
      .map((stat) => ({
        modelName: stat.modelName,
        handsPlayed: stat.handsPlayed,
        agents: stat.agents.size,
      }))
      .sort((left, right) => right.handsPlayed - left.handsPlayed || left.modelName.localeCompare(right.modelName));
  }

  private postBlind(index: number, amount: number, label: string) {
    const player = this.players[index];
    this.commitChips(index, amount);
    this.recordAction(player, "post-blind", { amount, targetBet: this.players[index].currentBet });
    this.log(player.id, `${player.name} 支付${label} ${amount}。`);
  }

  private dealCommunity(count: number) {
    const remainingBoardCards = Math.max(0, 5 - this.communityCards.length);
    const actualCount = Math.min(count, remainingBoardCards);

    if (actualCount <= 0) {
      logger.warn("poker.community_deal_skipped", {
        tableId: this.options.tableId,
        handId: this.handId,
        requestedCount: count,
        existingCount: this.communityCards.length,
      });
      return;
    }

    if (actualCount < count) {
      logger.warn("poker.community_deal_capped", {
        tableId: this.options.tableId,
        handId: this.handId,
        requestedCount: count,
        dealtCount: actualCount,
        existingCount: this.communityCards.length,
      });
    }

    this.communityCards.push(...Array.from({ length: actualCount }, () => this.draw()));
    this.log("dealer", `公共牌：${this.communityCards.map(formatCard).join(" ")}。`);
  }

  private completeBoardForShowdown() {
    if (this.activePlayers().length <= 1 || this.communityCards.length >= 5) {
      return;
    }

    this.dealCommunity(5 - this.communityCards.length);
  }

  private draw() {
    const card = this.deck.pop();
    if (!card) {
      throw new Error("Deck is empty.");
    }
    return card;
  }

  private smallBlindIndex() {
    return this.nextSeat(this.dealerIndex);
  }

  private bigBlindIndex() {
    return this.nextSeat(this.smallBlindIndex());
  }

  private nextSeat(index: number) {
    if (this.players.length === 0) {
      return 0;
    }

    for (let offset = 1; offset <= this.players.length; offset += 1) {
      const next = (index + offset + this.players.length) % this.players.length;
      if (this.players[next].stack > 0 && this.players[next].status !== "out") {
        return next;
      }
    }

    return 0;
  }

  private activePlayers() {
    return this.players.filter((player) => player.status === "active" || player.status === "all-in");
  }

  private actionablePlayers() {
    return this.players.filter((player) => player.status === "active" && player.stack > 0);
  }

  private log(actor: string, message: string) {
    this.logs.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      handId: this.handId,
      actor,
      message,
      createdAt: new Date().toISOString(),
    });
    if (this.logs.length > maxLogEntries) {
      this.logs.splice(0, this.logs.length - maxLogEntries);
    }
  }

  private recordAction(
    player: Pick<PlayerState, "id" | "name">,
    action: ActionHistoryItem["action"],
    details: { amount?: number; handLabel?: string; handRank?: ActionHistoryItem["handRank"]; isAllIn?: boolean; targetBet?: number } = {},
  ) {
    this.actionHistory.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      handId: this.handId,
      round: this.phase,
      playerId: player.id,
      playerName: player.name,
      action,
      amount: details.amount,
      handLabel: details.handLabel,
      handRank: details.handRank,
      isAllIn: details.isAllIn,
      targetBet: details.targetBet,
      potAfter: this.pot,
      createdAt: new Date().toISOString(),
    });
    if (this.actionHistory.length > maxActionHistoryEntries) {
      this.actionHistory.splice(0, this.actionHistory.length - maxActionHistoryEntries);
    }
  }

  private publicActionHistoryForCurrentHand(): ActionHistoryItem[] {
    return this.actionHistory
      .filter((item) => item.handId === this.handId)
      .map((item) => ({
        id: item.id,
        handId: item.handId,
        round: item.round,
        playerId: item.playerId,
        playerName: item.playerName,
        action: item.action,
        amount: item.amount,
        handLabel: item.handLabel,
        handRank: item.handRank,
        isAllIn: item.isAllIn,
        targetBet: item.targetBet,
        potAfter: item.potAfter,
        createdAt: item.createdAt,
      }));
  }
}

function handRankLabel(rank: ActionHistoryItem["handRank"]) {
  const labels: Record<NonNullable<ActionHistoryItem["handRank"]>, string> = {
    flush: "flush",
    "four-kind": "four of a kind",
    "full-house": "full house",
    "high-card": "high card",
    pair: "pair",
    "straight-flush": "straight flush",
    straight: "straight",
    "three-kind": "three of a kind",
    "two-pair": "two pair",
  };
  return rank ? labels[rank] : undefined;
}

function fallbackAction(toCall: number): PokerAction {
  return toCall > 0 ? { type: "fold" } : { type: "check" };
}

function normalizeAction(action: PokerAction | undefined, legalActions: LegalAction[], toCall: number): PokerAction {
  if (!action || !legalActions.includes(action.type)) {
    return fallbackAction(toCall);
  }

  if (action.type === "bet" || action.type === "raise") {
    const amount = Number(action.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return fallbackAction(toCall);
    }

    return { type: action.type, amount };
  }

  return { type: action.type };
}

function safeAmount(amount: number, fallback: number) {
  const parsed = Number(amount);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizedInitialStack(stack: number | undefined) {
  return Number.isFinite(stack) && stack && stack > 0 ? Math.floor(stack) : initialStack;
}

function sanitizeReasoning(reasoning?: string) {
  const trimmed = reasoning?.trim();
  return trimmed ? trimmed.slice(0, 500) : undefined;
}

function withReasoning(message: string, reasoning?: string) {
  return reasoning ? `${message} 理由：${reasoning}` : message;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function configuredPlayerDecisionPauseMs() {
  const configured = Number(process.env.POKER_PLAYER_DECISION_PAUSE_MS);
  return Number.isFinite(configured) && configured >= 0 ? configured : playerDecisionPauseMs;
}

function buildPots(players: PlayerState[]) {
  const levels = [...new Set(players.map((player) => player.totalCommitted).filter((amount) => amount > 0))].sort(
    (left, right) => left - right,
  );
  const pots: Array<{ amount: number; contributorPlayerIds: string[]; eligiblePlayerIds: string[]; label: string }> = [];
  let previousLevel = 0;

  for (const level of levels) {
    const contributors = players.filter((player) => player.totalCommitted >= level);
    const amount = (level - previousLevel) * contributors.length;
    const eligiblePlayerIds = contributors
      .filter((player) => player.status === "active" || player.status === "all-in")
      .map((player) => player.id);

    if (amount > 0 && eligiblePlayerIds.length > 0) {
      pots.push({
        amount,
        contributorPlayerIds: contributors.map((player) => player.id),
        eligiblePlayerIds,
        label: pots.length === 0 ? "主池" : `边池 ${pots.length}`,
      });
    }

    previousLevel = level;
  }

  return pots;
}
