"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, memo } from "react";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { pushEngagementToast } from "@/lib/client/engagementToast";
import { FormFieldError } from "@/components/FormFieldMessage";
import { LazyEngagementToastStack } from "@/components/LazyEngagementToastStack";
import { SoundToggle } from "@/components/SoundToggle";
import { TableMomentOverlay } from "@/components/TableMomentOverlay";
import {
  TableEmptySeat,
  TablePlayerSeat,
  formatSeatDelta,
  seatDeltaClassName,
  seatPositionLabel,
  tableSeatStyle,
  visualSeatIndex,
} from "@/components/TableSeat";
import { withBasePath } from "@/lib/client/basePath";
import { recordQuestPracticeVisit } from "@/lib/client/questOptionalProgress";
import { connectReconnectingEventSource } from "@/lib/client/reconnectingEventSource";
import { useLanguage } from "@/lib/client/i18n";
import { mergeHumanTableSnapshotForSse } from "@/lib/client/sseSnapshotMerge";
import { useTableSounds } from "@/lib/client/tableSoundEvents";
import type { Card, GameSnapshot, LegalAction, PokerAction } from "@/lib/poker/types";
import styles from "../table/table.module.css";

type HumanTableSnapshot = {
  game?: GameSnapshot;
  handSummaries: Array<{
    actions: GameSnapshot["actionHistory"];
    bigBlind: number;
    communityCards: Card[];
    completedAt: string;
    handId: number;
    players: Array<{
      endingStack: number;
      holeCards: Card[];
      name: string;
      netChips: number;
      playerId: string;
      startingStack: number;
    }>;
    totalAwarded: number;
    winners: Array<{
      amount: number;
      handLabel?: string;
      name: string;
      playerId: string;
    }>;
  }>;
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
  playerStats: Array<{
    buyIn: number;
    committedChips: number;
    currentStack: number;
    effectiveStack: number;
    inSeat: boolean;
    joinedAt: string;
    leftAt?: string;
    name: string;
    pendingBuyIn?: number;
    playerId: string;
    profit: number;
    status?: string;
    userId: string;
  }>;
  tableStatus: {
    createdAt?: string;
    hasTable: boolean;
    maxPlayers: number;
    needsCreate: boolean;
    needsJoin: boolean;
    canEndGame?: boolean;
    playerCount: number;
    running: boolean;
    tableId?: string;
    tableName?: string;
  };
};

const copy = {
  zh: {
    action: "动作",
    actionAmount: "目标注额",
    actionFailed: "操作失败。",
    allIn: "全下",
    amountInvalid: "输入金额不合法。",
    amountPlaceholder: "输入目标注额",
    activePlayers: "在桌玩家",
    activePlayer: "行动中",
    bet: "下注",
    balanced: "已平衡",
    call: "跟注",
    check: "过牌",
    committed: "本手已投入",
    create: "创建牌桌",
    createHint: "当前没有真人牌桌。你将成为这张桌的创建者，并设置进入密码。",
    createTable: "创建真人牌桌",
    buyIn: "带入筹码",
    buyInHint: "带入必须是 1000 的整数倍。",
    buyInNextHand: "下一手带入",
    buyInQueued: "已预约下一手带入",
    currentBet: "当前注额",
    currentStack: "当前 Stack",
    effectiveStack: "归属筹码",
    endGame: "结束游戏",
    endConfirm: "确定要结束真人桌吗？当前手未结算筹码会退回，然后展示最终统计。",
    endFailed: "结束游戏失败。",
    finalStats: "最终统计",
    emptySeat: "空位",
    fold: "弃牌",
    hand: "hand",
    handReview: "最近复盘",
    handWinners: "本局赢家",
    humanTable: "真人牌桌",
    inSeat: "在桌",
    join: "加入牌桌",
    joinHint: "已有真人牌桌。输入创建者设置的密码后加入同一张桌。",
    leave: "离开真人牌桌",
    leaveConfirm: "确定要离开真人牌桌吗？",
    leaveFailed: "离桌失败。",
    leftSeat: "已离桌",
    login: "去登录",
    loginHint: "登录后可以创建或加入真人牌桌。",
    maxPlayers: "最多 6 人",
    myAction: "我的操作",
    noActions: "还没有行动。",
    noHandSummaries: "还没有完成的手牌摘要。",
    noCommunity: "等待公共牌",
    notMyTurn: "还没有轮到你行动。",
    password: "牌桌密码",
    passwordPlaceholder: "至少 4 位",
    players: "玩家统计",
    pot: "底池",
    potQuarter: "1/4池",
    potHalf: "1/2池",
    potFull: "满池",
    profit: "输赢",
    raise: "加注",
    raiseRule: "加注金额必须大于前位玩家下注数量的 2 倍。",
    rebuyTitle: "筹码已清空",
    rebuyText: "你已经被清台，但仍保留在本桌统计中。选择带入筹码可从下一手继续；不买入则离开真人桌。",
    recentActions: "最近动作",
    running: "运行中",
    seatedHint: "你已在本桌入座。轮到你时，这里会出现所有合法动作。",
    seats: "seats",
    stack: "筹码",
    stats: "牌桌统计",
    status: "状态",
    submit: "提交",
    submitting: "提交中...",
    customAmount: "自定义",
    chooseAmount: "选择下注金额",
    tableStatsHint: "桌上已下注但未结算的筹码按下注前归属计算。",
    thinking: "正在行动",
    timeoutHint: "超时后将自动执行保守动作：可过牌则过牌，否则弃牌。",
    timeLeft: "剩余时间",
    totalProfit: "总盈亏",
    unbalanced: "统计待校验",
    waiting: "等待",
    waitingNextHand: "等待下一手",
    waitingNextHandText: "你已加入真人桌，当前手已经开始。本手不会轮到你行动，下一手发牌时会自动入局。",
    waitingInviteTitle: "等待玩家加入",
    waitingInviteText: "已有真人桌创建成功。分享当前页面并告知牌桌密码，至少 2 人入座后自动开局。",
    copyInviteLink: "复制邀请链接",
    inviteLinkCopied: "已复制",
    inviteCopyToast: "邀请链接已复制，可分享给好友入座",
    inviteShareText: (tableName: string, url: string) =>
      `来 AI Poker Lab 真人练习桌「${tableName}」：打开链接后输入牌桌密码即可入座。\n${url}`,
    waitingStart: "等待开局",
    wonChips: "赢得筹码",
    winReason: "胜利原因",
  },
  en: {
    action: "Action",
    actionAmount: "Target bet",
    actionFailed: "Action failed.",
    allIn: "All-in",
    amountInvalid: "Invalid amount.",
    amountPlaceholder: "Enter target bet",
    activePlayers: "Active players",
    activePlayer: "Acting",
    bet: "Bet",
    balanced: "Balanced",
    call: "Call",
    check: "Check",
    committed: "Committed this hand",
    create: "Create table",
    createHint: "No human table is active. You will create it and set the entry password.",
    createTable: "Create Human Table",
    buyIn: "Buy-in",
    buyInHint: "Buy-in must be a multiple of 1000.",
    buyInNextHand: "Buy in next hand",
    buyInQueued: "Buy-in queued for next hand",
    currentBet: "Current bet",
    currentStack: "Current Stack",
    effectiveStack: "Owned chips",
    endGame: "End Game",
    endConfirm: "End the human table? Unsettled chips in the current hand will be refunded before final stats are shown.",
    endFailed: "Failed to end game.",
    finalStats: "Final Stats",
    emptySeat: "Empty Seat",
    fold: "Fold",
    hand: "hand",
    handReview: "Recent Review",
    handWinners: "Hand Winners",
    humanTable: "Human Table",
    inSeat: "Seated",
    join: "Join table",
    joinHint: "A human table is active. Enter its password to join the same table.",
    leave: "Leave human table",
    leaveConfirm: "Leave the human table?",
    leaveFailed: "Failed to leave table.",
    leftSeat: "Left",
    login: "Log in",
    loginHint: "Log in to create or join the human table.",
    maxPlayers: "Up to 6 players",
    myAction: "My Action",
    noActions: "No actions yet.",
    noHandSummaries: "No completed hand summaries yet.",
    noCommunity: "Waiting for community cards",
    notMyTurn: "It is not your turn yet.",
    password: "Table password",
    passwordPlaceholder: "At least 4 characters",
    players: "Player Stats",
    pot: "Pot",
    potQuarter: "1/4 pot",
    potHalf: "1/2 pot",
    potFull: "Pot",
    profit: "P&L",
    raise: "Raise",
    raiseRule: "Raise amount must be greater than twice the previous bet.",
    rebuyTitle: "Out of chips",
    rebuyText: "You are out of chips but still kept in this table's stats. Buy in to continue next hand, or leave if you do not want to rebuy.",
    recentActions: "Recent Actions",
    running: "Running",
    seatedHint: "You are seated. Legal actions will appear here when it is your turn.",
    seats: "seats",
    stack: "Stack",
    stats: "Table Stats",
    status: "Status",
    submit: "Submit",
    submitting: "Submitting...",
    customAmount: "Custom",
    chooseAmount: "Choose Amount",
    tableStatsHint: "Unsettled chips already committed to the pot are counted as still owned by the bettor.",
    thinking: "Acting",
    timeoutHint: "On timeout, the table will check when possible, otherwise fold.",
    timeLeft: "Time left",
    totalProfit: "Total P&L",
    unbalanced: "Needs check",
    waiting: "Waiting",
    waitingNextHand: "Waiting for next hand",
    waitingNextHandText: "You have joined this human table after the current hand started. You will not act this hand and will be dealt in automatically next hand.",
    waitingInviteTitle: "Waiting for Players",
    waitingInviteText: "The human table is ready. Share this page and the table password; play starts automatically with at least two seated players.",
    copyInviteLink: "Copy invite link",
    inviteLinkCopied: "Copied",
    inviteCopyToast: "Invite link copied — share with friends to join",
    inviteShareText: (tableName: string, url: string) =>
      `Join my human practice table "${tableName}" on AI Poker Lab — open the link and enter the table password to sit down:\n${url}`,
    waitingStart: "Waiting to start",
    wonChips: "Won chips",
    winReason: "Winning hand",
  },
};

const initialStack = 1_000;

type WinnerReveal = {
  handId: number;
  overlayVisible: boolean;
  winners: Array<{ amount: number; handLabel?: string; name: string; playerId: string }>;
};

export default function HumanTablePage() {
  const { language } = useLanguage();
  const t = copy[language];
  const [snapshot, setSnapshot] = useState<HumanTableSnapshot>();
  const [password, setPassword] = useState("");
  const [buyIn, setBuyIn] = useState(String(initialStack));
  const [nextBuyIn, setNextBuyIn] = useState(String(initialStack));
  const [busy, setBusy] = useState<"action" | "create" | "join" | "leave" | "end">();
  const [status, setStatus] = useState<string>();
  const [statsOpen, setStatsOpen] = useState(false);
  const [buyInDialogOpen, setBuyInDialogOpen] = useState(false);
  const [finalPlayerStats, setFinalPlayerStats] = useState<HumanTableSnapshot["playerStats"]>();
  const [now, setNow] = useState(() => Date.now());
  const [winnerReveal, setWinnerReveal] = useState<WinnerReveal>();
  const [inviteCopied, setInviteCopied] = useState(false);
  const lastWinnerRevealHandIdRef = useRef<number | undefined>(undefined);
  const winnerRevealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const state = snapshot?.game;
  const players = state?.players ?? [];
  const myPlayer = snapshot?.myPlayerId ? players.find((player) => player.id === snapshot.myPlayerId) : undefined;
  const myPlayerSeatIndex = myPlayer ? players.findIndex((player) => player.id === myPlayer.id) : -1;
  const activePlayer = players.find((player) => player.id === state?.currentPlayerId);
  const streetActions = currentStreetActions(state);
  const pendingDecision = snapshot?.pendingDecision;
  const isMyTurn = Boolean(pendingDecision && pendingDecision.playerId === snapshot?.myPlayerId);
  const timeLeftMs = pendingDecision ? Math.max(0, new Date(pendingDecision.expiresAt).getTime() - now) : 0;
  const handWinners = winnerReveal?.winners ?? [];
  const winningPlayerIds = new Set(handWinners.map((winner) => winner.playerId));
  const handSummaries = snapshot?.handSummaries ?? [];
  const playerStats = finalPlayerStats ?? snapshot?.playerStats ?? [];
  const myPlayerStat = snapshot?.myPlayerId ? playerStats.find((stat) => stat.playerId === snapshot.myPlayerId) : undefined;
  const isWaitingNextHand = myPlayerStat?.status === "waiting-next-hand";
  const needsRebuy = myPlayerStat?.status === "needs-rebuy";
  const buyInByPlayerId = new Map(playerStats.map((stat) => [stat.playerId, stat.buyIn]));
  const seatedStatsCount = playerStats.filter((stat) => stat.inSeat).length;
  const totalProfit = playerStats.reduce((sum, stat) => sum + stat.profit, 0);
  const isWaitingForPlayers = snapshot?.mySeatStatus === "seated" && Boolean(snapshot.tableStatus.hasTable) && !snapshot.tableStatus.running && (state?.players.length ?? 0) < 2;
  const canShareInvite = Boolean(snapshot?.tableStatus.hasTable);

  const inviteShareText = useMemo(() => {
    if (typeof window === "undefined" || !canShareInvite) {
      return "";
    }
    const tableName = snapshot?.tableStatus.tableName ?? copy[language].humanTable;
    return copy[language].inviteShareText(tableName, window.location.href);
  }, [canShareInvite, language, snapshot?.tableStatus.tableName]);

  useTableSounds(state, { enableYourTurn: true, myPlayerId: snapshot?.myPlayerId });

  function revealWinnersForSnapshot(nextState?: GameSnapshot) {
    if (!nextState || nextState.handId === lastWinnerRevealHandIdRef.current) {
      return;
    }

    const winners = handWinnerSummaries(nextState);
    if (winners.length === 0) {
      return;
    }

    lastWinnerRevealHandIdRef.current = nextState.handId;
    setWinnerReveal({ handId: nextState.handId, overlayVisible: false, winners });
    if (winnerRevealTimerRef.current) {
      clearTimeout(winnerRevealTimerRef.current);
    }
    winnerRevealTimerRef.current = setTimeout(() => {
      setWinnerReveal((current) => (current?.handId === nextState.handId ? { ...current, overlayVisible: true } : current));
      winnerRevealTimerRef.current = setTimeout(() => {
        setWinnerReveal(undefined);
        winnerRevealTimerRef.current = undefined;
      }, 3_000);
    }, 3_000);
  }

  useEffect(() => {
    recordQuestPracticeVisit();
  }, []);

  useEffect(() => {
    return connectReconnectingEventSource({
      url: withBasePath("/api/human-table/events"),
      onSnapshot: (data) => {
        const incoming = JSON.parse(data) as HumanTableSnapshot;
        setSnapshot((previous) => mergeHumanTableSnapshotForSse(previous, incoming));
        revealWinnersForSnapshot(incoming.game);
      },
      onRecover: async () => {
        const response = await fetch(withBasePath("/api/human-table/state"), { cache: "no-store" });
        if (response.ok) {
          const nextSnapshot = (await response.json()) as HumanTableSnapshot;
          setSnapshot(nextSnapshot);
          revealWinnersForSnapshot(nextSnapshot.game);
        }
      },
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (winnerRevealTimerRef.current) {
        clearTimeout(winnerRevealTimerRef.current);
      }
    };
  }, []);

  async function submitPasswordForm(event: FormEvent<HTMLFormElement>, mode: "create" | "join") {
    event.preventDefault();
    setBusy(mode);
    setStatus(undefined);
    try {
      const response = await fetch(withBasePath(`/api/human-table/${mode}`), {
        body: JSON.stringify({ buyIn: Number(buyIn), password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error ?? (mode === "create" ? t.createTable : t.join));
        return;
      }
      setPassword("");
      setBuyIn(String(initialStack));
      setFinalPlayerStats(undefined);
      setSnapshot(payload);
    } finally {
      setBusy(undefined);
    }
  }

  async function submitAction(action: PokerAction) {
    setBusy("action");
    setStatus(undefined);
    try {
      const response = await fetch(withBasePath("/api/human-table/action"), {
        body: JSON.stringify(action),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error ?? t.actionFailed);
        return;
      }
      setSnapshot(payload);
    } finally {
      setBusy(undefined);
    }
  }

  async function requestBuyIn(event: FormEvent<HTMLFormElement>, { closeOnSuccess = false }: { closeOnSuccess?: boolean } = {}) {
    event.preventDefault();
    setBusy("join");
    setStatus(undefined);
    try {
      const response = await fetch(withBasePath("/api/human-table/buy-in"), {
        body: JSON.stringify({ buyIn: Number(nextBuyIn) }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error ?? t.actionFailed);
        return;
      }
      setSnapshot(payload);
      const nextMyPlayerId = payload.myPlayerId;
      const nextMyStat = nextMyPlayerId ? payload.playerStats?.find((stat: HumanTableSnapshot["playerStats"][number]) => stat.playerId === nextMyPlayerId) : undefined;
      setStatus(nextMyStat?.pendingBuyIn ? t.buyInQueued : undefined);
      setNextBuyIn(String(initialStack));
      if (closeOnSuccess) {
        setBuyInDialogOpen(false);
      }
    } finally {
      setBusy(undefined);
    }
  }

  async function leaveTable() {
    if (!window.confirm(t.leaveConfirm)) {
      return;
    }
    setBusy("leave");
    setStatus(undefined);
    try {
      const response = await fetch(withBasePath("/api/human-table/leave"), { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error ?? t.leaveFailed);
        return;
      }
      setSnapshot(payload.snapshot);
    } finally {
      setBusy(undefined);
    }
  }

  async function endGame() {
    if (!window.confirm(t.endConfirm)) {
      return;
    }
    setBusy("end");
    setStatus(undefined);
    try {
      const response = await fetch(withBasePath("/api/human-table/end"), { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error ?? t.endFailed);
        return;
      }
      setFinalPlayerStats(payload.snapshot?.playerStats ?? []);
      setSnapshot(payload.snapshot);
      setStatsOpen(true);
    } finally {
      setBusy(undefined);
    }
  }

  async function copyInviteLink() {
    if (!inviteShareText) {
      return;
    }
    const ok = await copyText(inviteShareText);
    if (!ok) {
      return;
    }
    setInviteCopied(true);
    trackEngagement({
      at: new Date().toISOString(),
      name: "engagement.human_table.invite_copy",
      tableId: snapshot?.tableStatus.tableId,
    });
    pushEngagementToast({
      expiresMs: 4500,
      id: `human-invite-copy-${snapshot?.tableStatus.tableId ?? "table"}`,
      kind: "settled",
      message: copy[language].inviteCopyToast,
    });
    window.setTimeout(() => setInviteCopied(false), 2_000);
  }

  const visibleStatus = status === t.buyInQueued && !myPlayerStat?.pendingBuyIn ? undefined : status;

  const tableControls = (
    <div className={styles.controls}>
      <button type="button" onClick={() => setStatsOpen(true)}>{t.stats}</button>
      {snapshot?.mySeatStatus === "seated" && !needsRebuy ? (
        <button type="button" onClick={() => setBuyInDialogOpen(true)}>{t.buyIn}</button>
      ) : null}
      {snapshot?.mySeatStatus === "seated" && !snapshot.tableStatus.canEndGame ? (
        <button className={styles.danger} disabled={busy === "leave"} type="button" onClick={() => void leaveTable()}>
          {t.leave}
        </button>
      ) : null}
      {snapshot?.tableStatus.canEndGame ? (
        <button className={styles.danger} disabled={busy === "end"} type="button" onClick={() => void endGame()}>
          {t.endGame}
        </button>
      ) : null}
    </div>
  );

  const actionDock = snapshot?.mySeatStatus === "seated" ? (
    <div className={`${styles.actionDock} ${isMyTurn ? styles.activeActionDock : styles.idleActionDock}`}>
      <span className={styles.actionStatus}>
        {isMyTurn && pendingDecision
          ? `${t.timeLeft} ${formatTimeLeft(timeLeftMs)} · ${t.pot} ${state?.pot ?? 0} · ${t.currentBet} ${state?.currentBet ?? 0}`
          : isWaitingNextHand
            ? t.waitingNextHandText
            : needsRebuy
              ? t.rebuyText
              : activePlayer
                ? `${activePlayer.name} ${t.thinking}`
                : t.seatedHint}
      </span>
      {isMyTurn && pendingDecision && state && !isWaitingNextHand && !needsRebuy ? (
        <ActionButtons
          bigBlind={state.bigBlind}
          busy={busy === "action"}
          currentBet={state.currentBet}
          maxAmount={(myPlayer?.currentBet ?? 0) + pendingDecision.stack}
          legalActions={pendingDecision.legalActions}
          minRaise={pendingDecision.minRaise}
          onSubmit={(action) => void submitAction(action)}
          pot={state.pot}
          setStatus={setStatus}
          t={t}
        />
      ) : null}
    </div>
  ) : null;

  const pendingBuyInNotice = snapshot?.mySeatStatus === "seated" && !needsRebuy && myPlayerStat?.pendingBuyIn ? (
    <section className={styles.buyInPanel}>
      <div>
        <p className={styles.eyebrow}>{t.buyIn}</p>
        <p className={styles.muted}>{`${t.buyInQueued}: ${myPlayerStat.pendingBuyIn}`}</p>
      </div>
    </section>
  ) : null;

  return (
    <main className={`${styles.page} ${snapshot?.mySeatStatus === "seated" ? styles.humanTablePageSeated : ""}`}>
      <LazyEngagementToastStack />
      <section className={styles.header}>
        <div className={styles.mobileHeaderMain}>
          <p className={styles.eyebrow}>Live Poker Room</p>
          <h1>{snapshot?.tableStatus.tableName ?? t.humanTable}</h1>
          <p className={styles.subtitle}>
            {state?.running ? t.running : t.waitingStart} · {snapshot?.tableStatus.playerCount ?? 0}/6 {t.seats} · {t.hand} #{state?.handId ?? 0}
          </p>
          <div className={styles.mobileTableStatus}>
            <span>{state?.running ? t.running : t.waitingStart}</span>
            <span>{t.hand} #{state?.handId ?? 0}</span>
            <span>{t.pot} {state?.pot ?? 0}</span>
            <span>{activePlayer ? `${t.activePlayer}: ${activePlayer.name}` : t.waitingStart}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          {canShareInvite ? (
            <button className={styles.shareCopyAction} type="button" onClick={() => void copyInviteLink()}>
              {inviteCopied ? t.inviteLinkCopied : t.copyInviteLink}
            </button>
          ) : null}
          <SoundToggle />
        </div>
      </section>

      {snapshot?.mySeatStatus === "not-logged-in" ? (
        <section className={styles.joinPanel}>
          <h2>{t.humanTable}</h2>
          <p className={styles.muted}>{t.loginHint}</p>
          <Link className={styles.primaryAction} href="/login">{t.login}</Link>
        </section>
      ) : snapshot?.tableStatus.needsCreate ? (
        <PasswordPanel
          busy={busy === "create"}
          buttonText={t.create}
          description={t.createHint}
          onSubmit={(event) => void submitPasswordForm(event, "create")}
          buyIn={buyIn}
          buyInHint={t.buyInHint}
          buyInLabel={t.buyIn}
          password={password}
          passwordLabel={t.password}
          passwordPlaceholder={t.passwordPlaceholder}
          setPassword={setPassword}
          setBuyIn={setBuyIn}
          title={t.createTable}
        />
      ) : snapshot?.tableStatus.needsJoin ? (
        <PasswordPanel
          busy={busy === "join"}
          buttonText={t.join}
          description={t.joinHint}
          onSubmit={(event) => void submitPasswordForm(event, "join")}
          buyIn={buyIn}
          buyInHint={t.buyInHint}
          buyInLabel={t.buyIn}
          password={password}
          passwordLabel={t.password}
          passwordPlaceholder={t.passwordPlaceholder}
          setPassword={setPassword}
          setBuyIn={setBuyIn}
          title={t.join}
        />
      ) : null}

      {!state && visibleStatus ? <FormFieldError message={visibleStatus} /> : null}

      {state ? (
        <section className={styles.layout}>
          <div className={styles.tableArea}>
            <div className={styles.table}>
              <div className={styles.tableCenter}>
                <div className={styles.centerStats}>
                  <span className={styles.phase}>{state.phase}</span>
                  <span className={styles.centerPot}>{t.pot} {state.pot}</span>
                </div>
                <div className={styles.cards}>
                  {state.communityCards.length ? (
                    state.communityCards.map((card, index) => <PlayingCard card={card} key={`${card.rank}${card.suit}${index}`} />)
                  ) : (
                    <span className={styles.emptyCards}>{t.noCommunity}</span>
                  )}
                </div>
              </div>

              {Array.from({ length: 6 }, (_, index) => {
                const player = players[index];
                const seatStyle = tableSeatStyle(visualSeatIndex(index, myPlayerSeatIndex, 6), 6);
                if (!player) {
                  return (
                    <TableEmptySeat
                      key={`empty-${index}`}
                      seatStyle={seatStyle}
                      subtitle={t.waiting}
                      title={t.emptySeat}
                    />
                  );
                }

                const profitDelta =
                  player.stack + player.totalCommitted - (buyInByPlayerId.get(player.id) ?? initialStack);

                return (
                  <TablePlayerSeat
                    copy={{ profit: t.profit, stack: t.stack, winBadge: "WIN" }}
                    isCurrent={player.id === state.currentPlayerId}
                    isWinning={winningPlayerIds.has(player.id)}
                    key={player.id}
                    player={player}
                    position={seatPositionLabel(index, state.dealerIndex, players.length)}
                    profitDelta={profitDelta}
                    seatStyle={seatStyle}
                    streetAction={streetActions.get(player.id) ?? (player.id === state.currentPlayerId ? t.thinking : t.waiting)}
                  />
                );
              })}
            </div>
            <div className={styles.tableInfoBar}>
              <span>{t.pot} {state.pot}</span>
              <span>{t.hand} #{state.handId}</span>
              <span>{t.currentBet} {state.currentBet}</span>
              <span>{activePlayer ? `${activePlayer.name} ${t.thinking}` : t.waitingStart}</span>
            </div>
            <div className={styles.tableControlStack}>
              {actionDock ? (
                <div
                  className={`${styles.humanTableStickyActionBar} ${isMyTurn && pendingDecision ? styles.humanTableStickyActionBarActive : ""}`}
                >
                  {actionDock}
                </div>
              ) : null}
              <FormFieldError message={visibleStatus} />
              {isWaitingNextHand && !needsRebuy ? (
                <section className={`${styles.waitingInvite} ${styles.waitingNextHandPanel}`}>
                  <div>
                    <p className={styles.eyebrow}>{t.humanTable}</p>
                    <h2>{t.waitingNextHand}</h2>
                    <p className={styles.muted}>{t.waitingNextHandText}</p>
                  </div>
                  <button type="button" onClick={() => setStatsOpen(true)}>{t.stats}</button>
                </section>
              ) : null}
              {isWaitingForPlayers ? (
                <section className={styles.waitingInvite}>
                  <div>
                    <p className={styles.eyebrow}>{t.humanTable}</p>
                    <h2>{t.waitingInviteTitle}</h2>
                    <p className={styles.muted}>{t.waitingInviteText}</p>
                  </div>
                  <button className={styles.shareCopyAction} type="button" onClick={() => void copyInviteLink()}>
                    {inviteCopied ? t.inviteLinkCopied : t.copyInviteLink}
                  </button>
                </section>
              ) : null}
              {pendingBuyInNotice}
              {tableControls}
            </div>
          </div>

          <aside className={styles.sidePanel}>
            <section className={styles.panel}>
              <h2>{t.recentActions}</h2>
              <div className={styles.logList}>
                {state.logs.map((log) => (
                  <article className={styles.logItem} key={log.id}>
                    <time>{new Date(log.createdAt).toLocaleTimeString()}</time>
                    <span>{log.message}</span>
                  </article>
                ))}
                {state.logs.length === 0 && <p className={styles.muted}>{t.noActions}</p>}
              </div>
            </section>
            <section className={styles.panel}>
              <h2>{t.handReview}</h2>
              <div className={styles.handSummaryList}>
                {handSummaries.slice(0, 5).map((summary) => (
                  <article className={styles.handSummaryCard} key={`${summary.handId}-${summary.completedAt}`}>
                    <div className={styles.handSummaryHeader}>
                      <strong>{t.hand} #{summary.handId}</strong>
                      <span>{summary.totalAwarded.toLocaleString()}</span>
                    </div>
                    <div className={styles.handSummaryCards}>
                      {summary.communityCards.length > 0 ? (
                        summary.communityCards.map((card, index) => <PlayingCard card={card} key={`${summary.handId}-${card.rank}${card.suit}-${index}`} small />)
                      ) : (
                        <small>{t.noCommunity}</small>
                      )}
                    </div>
                    <div className={styles.handSummaryWinners}>
                      {summary.winners.map((winner) => (
                        <span key={`${summary.handId}-${winner.playerId}`}>
                          {winner.name} +{winner.amount.toLocaleString()}
                          {winner.handLabel ? <small>{formatWinReason(winner.handLabel, language)}</small> : null}
                        </span>
                      ))}
                    </div>
                    <div className={styles.handSummaryPlayers}>
                      {summary.players.map((player) => (
                        <span key={`${summary.handId}-${player.playerId}`}>
                          {player.name}
                          <em className={seatDeltaClassName(player.netChips)}>{formatSeatDelta(player.netChips)}</em>
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
                {handSummaries.length === 0 ? <p className={styles.muted}>{t.noHandSummaries}</p> : null}
              </div>
            </section>
          </aside>
        </section>
      ) : null}

      {statsOpen ? (
        <section className={styles.statsOverlay} role="dialog" aria-modal="true">
          <div className={styles.statsDialog}>
            <div className={styles.statsHeader}>
              <div>
                <p className={styles.eyebrow}>{t.humanTable}</p>
                <h2>{finalPlayerStats ? t.finalStats : t.stats}</h2>
                <p className={styles.muted}>{t.tableStatsHint}</p>
              </div>
              <button type="button" onClick={() => setStatsOpen(false)}>×</button>
            </div>
            <div className={styles.statsList}>
              <div className={styles.scoreSummary}>
                <span><small>{t.inSeat}</small><strong>{seatedStatsCount}</strong></span>
                <span><small>{t.totalProfit}</small><strong className={seatDeltaClassName(totalProfit)}>{formatSeatDelta(totalProfit)}</strong></span>
                <span><small>{t.status}</small><strong>{totalProfit === 0 ? t.balanced : t.unbalanced}</strong></span>
              </div>
              {playerStats.map((stat) => (
                <article className={`${styles.statsCard} ${stat.inSeat ? styles.activeStatsCard : ""}`} key={stat.playerId}>
                  <div className={styles.statsPlayer}>
                    <strong>{stat.name}</strong>
                    <span>{stat.status === "needs-rebuy" ? t.rebuyTitle : stat.status === "waiting-next-hand" ? t.waitingNextHand : stat.inSeat ? t.inSeat : t.leftSeat}</span>
                  </div>
                  <span className={styles.statsStack}><small>{t.currentStack}</small><b>{stat.effectiveStack}</b></span>
                  <span className={styles.statsCommitted}><small>{t.committed}</small><b>{stat.committedChips}</b></span>
                  <span className={styles.statsEffective}><small>{t.effectiveStack}</small><b>{stat.effectiveStack}</b></span>
                  <em className={seatDeltaClassName(stat.profit)}>{formatSeatDelta(stat.profit)}</em>
                </article>
              ))}
              {playerStats.length === 0 ? <p className={styles.muted}>{t.noActions}</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      {needsRebuy || buyInDialogOpen ? (
        <section className={styles.buyInOverlay} role="dialog" aria-modal="true">
          <div className={styles.buyInDialog}>
            <div className={styles.statsHeader}>
              <div>
                <p className={styles.eyebrow}>{t.buyIn}</p>
                <h2>{needsRebuy ? t.rebuyTitle : t.buyInNextHand}</h2>
                <p className={styles.muted}>{needsRebuy ? t.rebuyText : t.buyInHint}</p>
              </div>
              {!needsRebuy ? <button type="button" onClick={() => setBuyInDialogOpen(false)}>×</button> : null}
            </div>
            <FormFieldError message={visibleStatus} />
            <form className={styles.buyInDialogForm} onSubmit={(event) => void requestBuyIn(event, { closeOnSuccess: !needsRebuy })}>
              <label>
                {t.buyIn}
                <input
                  className={styles.textInput}
                  inputMode="numeric"
                  min={initialStack}
                  onChange={(event) => setNextBuyIn(event.target.value)}
                  step={initialStack}
                  type="number"
                  value={nextBuyIn}
                />
              </label>
              <button disabled={busy === "join" || !isValidBuyIn(nextBuyIn)} type="submit">{t.buyInNextHand}</button>
            </form>
          </div>
        </section>
      ) : null}

      <TableMomentOverlay
        eyebrow={t.handWinners}
        handId={winnerReveal?.handId ?? state?.handId ?? 0}
        handLabel={t.hand}
        open={Boolean(winnerReveal?.overlayVisible && handWinners.length > 0)}
        variant="handWin"
        winners={handWinners.map((winner) => ({
          amount: winner.amount,
          name: winner.name,
          playerId: winner.playerId,
          winReason: winner.handLabel ? `${t.winReason}: ${formatWinReason(winner.handLabel, language)}` : undefined,
          wonChipsLabel: t.wonChips,
        }))}
      />
    </main>
  );
}

function PasswordPanel({
  busy,
  buttonText,
  buyIn,
  buyInHint,
  buyInLabel,
  description,
  onSubmit,
  password,
  passwordLabel,
  passwordPlaceholder,
  setBuyIn,
  setPassword,
  title,
}: {
  busy: boolean;
  buttonText: string;
  buyIn: string;
  buyInHint: string;
  buyInLabel: string;
  description: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  password: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  setBuyIn: (value: string) => void;
  setPassword: (value: string) => void;
  title: string;
}) {
  const parsedBuyIn = Number(buyIn);
  const buyInValid = Number.isFinite(parsedBuyIn) && parsedBuyIn >= initialStack && parsedBuyIn % initialStack === 0;
  return (
    <section className={styles.joinPanel}>
      <h2>{title}</h2>
      <p className={styles.muted}>{description}</p>
      <form className={styles.coachingForm} onSubmit={onSubmit}>
        <label>
          {passwordLabel}
          <input
            className={styles.textInput}
            minLength={4}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={passwordPlaceholder}
            type="password"
            value={password}
          />
        </label>
        <label>
          {buyInLabel}
          <input
            className={styles.textInput}
            inputMode="numeric"
            min={initialStack}
            onChange={(event) => setBuyIn(event.target.value)}
            step={initialStack}
            type="number"
            value={buyIn}
          />
          <span className={styles.fieldHint}>{buyInHint}</span>
        </label>
        <button disabled={busy || password.trim().length < 4 || !buyInValid} type="submit">
          {busy ? "..." : buttonText}
        </button>
      </form>
    </section>
  );
}

function ActionButtons({
  bigBlind,
  busy,
  currentBet,
  legalActions,
  maxAmount,
  minRaise,
  onSubmit,
  pot,
  setStatus,
  t,
}: {
  bigBlind: number;
  busy: boolean;
  currentBet: number;
  legalActions: LegalAction[];
  maxAmount: number;
  minRaise: number;
  onSubmit: (action: PokerAction) => void;
  pot: number;
  setStatus: (status: string | undefined) => void;
  t: (typeof copy)["zh"];
}) {
  const [amountPicker, setAmountPicker] = useState<"bet" | "raise">();
  const [customAmount, setCustomAmount] = useState("");
  const amountActionType: "bet" | "raise" | undefined = legalActions.includes("bet") ? "bet" : legalActions.includes("raise") ? "raise" : undefined;
  const potOptions = amountPicker
    ? [
        { label: t.potQuarter, amount: amountForRatio(amountPicker, 0.25) },
        { label: t.potHalf, amount: amountForRatio(amountPicker, 0.5) },
        { label: t.potFull, amount: amountForRatio(amountPicker, 1) },
      ]
    : [];

  function amountForRatio(type: "bet" | "raise", ratio: number) {
    const minimum = minimumAmount(type);
    const potAmount = Math.floor(Math.max(0, pot) * ratio);
    return Math.min(maxAmount, Math.max(minimum, potAmount));
  }

  function minimumAmount(type: "bet" | "raise") {
    return type === "raise" ? Math.max(currentBet + minRaise, currentBet * 2 + 1) : bigBlind;
  }

  function submitAmount(type: "bet" | "raise", amount: number) {
    if (!Number.isFinite(amount) || amount <= 0 || amount > maxAmount) {
      setStatus(t.amountInvalid);
      return;
    }
    if (type === "raise" && amount <= currentBet * 2 && amount !== maxAmount) {
      setStatus(t.raiseRule);
      return;
    }
    setStatus(undefined);
    setAmountPicker(undefined);
    setCustomAmount("");
    onSubmit({ type, amount });
  }

  function openAmountPicker(type: "bet" | "raise") {
    const minimum = minimumAmount(type);
    setStatus(undefined);
    setCustomAmount(String(Math.min(maxAmount, minimum)));
    setAmountPicker(type);
  }

  function closeAmountPicker() {
    setStatus(undefined);
    setCustomAmount("");
    setAmountPicker(undefined);
  }

  function submitAllIn() {
    setStatus(undefined);
    setAmountPicker(undefined);
    setCustomAmount("");
    if (legalActions.includes("raise")) {
      onSubmit({ type: "raise", amount: maxAmount });
      return;
    }
    if (legalActions.includes("bet")) {
      onSubmit({ type: "bet", amount: maxAmount });
      return;
    }
    if (legalActions.includes("call")) {
      onSubmit({ type: "call" });
    }
  }

  function submitCustomAmount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!amountPicker) {
      return;
    }
    submitAmount(amountPicker, Math.floor(Number(customAmount)));
  }

  return (
    <div className={styles.actionPanel}>
      <div className={styles.actionGrid}>
        {legalActions.includes("fold") ? <button disabled={busy} type="button" onClick={() => onSubmit({ type: "fold" })}>{t.fold}</button> : null}
        {legalActions.includes("check") ? <button disabled={busy} type="button" onClick={() => onSubmit({ type: "check" })}>{t.check}</button> : null}
        {legalActions.includes("call") ? <button disabled={busy} type="button" onClick={() => onSubmit({ type: "call" })}>{t.call}</button> : null}
        {legalActions.includes("bet") ? <button disabled={busy} type="button" onClick={() => openAmountPicker("bet")}>{t.bet}</button> : null}
        {legalActions.includes("raise") ? <button disabled={busy} type="button" onClick={() => openAmountPicker("raise")}>{t.raise}</button> : null}
        {legalActions.some((action) => action === "bet" || action === "raise" || action === "call") ? (
          <button className={styles.allInAction} disabled={busy} type="button" onClick={submitAllIn}>{t.allIn}</button>
        ) : null}
      </div>
      {amountActionType && amountPicker ? (
        <section className={styles.amountOverlay} role="dialog" aria-modal="true">
          <div className={styles.amountDialog}>
            <div className={styles.statsHeader}>
              <div>
                <p className={styles.eyebrow}>{amountPicker === "raise" ? t.raise : t.bet}</p>
                <h2>{t.chooseAmount}</h2>
                {amountPicker === "raise" ? <p className={styles.muted}>{t.raiseRule}</p> : null}
              </div>
              <button type="button" onClick={closeAmountPicker}>×</button>
            </div>
            <div className={styles.amountChoices}>
              {potOptions.map((option) => (
                <button disabled={busy} key={option.label} type="button" onClick={() => submitAmount(amountPicker, option.amount)}>
                  <span>{option.label}</span>
                  <strong>{option.amount}</strong>
                </button>
              ))}
            </div>
            <form className={styles.amountCustom} onSubmit={submitCustomAmount}>
              <input
                inputMode="numeric"
                max={maxAmount}
                min={1}
                onChange={(event) => setCustomAmount(event.target.value)}
                placeholder={t.amountPlaceholder}
                type="number"
                value={customAmount}
              />
              <button disabled={busy} type="submit">{t.submit}</button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function currentStreetActions(state?: GameSnapshot) {
  const actions = new Map<string, string>();
  if (!state) {
    return actions;
  }

  for (const item of state.actionHistory) {
    if (item.handId !== state.handId || item.round !== state.phase || item.action === "deal" || item.action === "win") {
      continue;
    }
    actions.set(item.playerId, formatStreetAction(item));
  }

  return actions;
}

function handWinnerSummaries(state?: GameSnapshot) {
  if (!state) {
    return [];
  }

  const winners = new Map<string, { amount: number; handLabel?: string; name: string; playerId: string }>();
  for (const item of state.actionHistory) {
    if (item.handId !== state.handId || item.action !== "win") {
      continue;
    }
    const current = winners.get(item.playerId);
    winners.set(item.playerId, {
      amount: (current?.amount ?? 0) + (item.amount ?? 0),
      handLabel: current?.handLabel ?? item.handLabel,
      name: item.playerName,
      playerId: item.playerId,
    });
  }

  return [...winners.values()].sort((left, right) => right.amount - left.amount);
}

function formatWinReason(reason: string | undefined, language: "en" | "zh") {
  if (!reason) {
    return language === "zh" ? "未摊牌获胜" : "won without showdown";
  }
  const zh: Record<string, string> = {
    flush: "同花",
    "four of a kind": "四条",
    "full house": "葫芦",
    "high card": "高牌",
    pair: "一对",
    "straight flush": "同花顺",
    straight: "顺子",
    "three of a kind": "三条",
    "two pair": "两对",
    "all opponents folded": "其他玩家弃牌",
  };
  return language === "zh" ? (zh[reason] ?? reason) : reason;
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to a textarea fallback for non-secure browser contexts.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.opacity = "0";
  textarea.style.position = "fixed";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}

function formatStreetAction(item: GameSnapshot["actionHistory"][number]) {
  if (item.action === "post-blind") {
    return item.amount ? `blind ${item.amount}` : "blind";
  }
  if (item.amount !== undefined && (item.action === "bet" || item.action === "raise" || item.action === "call")) {
    return `${item.action} ${item.amount}`;
  }
  return item.action;
}

const PlayingCard = memo(function PlayingCard({ card, small = false }: { card: Card; small?: boolean }) {
  const red = card.suit === "h" || card.suit === "d";
  const suit = { s: "♠", h: "♥", d: "♦", c: "♣" }[card.suit];
  return <span className={`${styles.playingCard} ${small ? styles.smallCard : ""} ${red ? styles.redCard : ""}`}>{`${card.rank}${suit}`}</span>;
});

function PlayingCardBack() {
  return <span className={`${styles.playingCard} ${styles.smallCard} ${styles.cardBack}`} aria-label="card pending" />;
}

function isValidBuyIn(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= initialStack && parsed % initialStack === 0;
}

function formatTimeLeft(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
