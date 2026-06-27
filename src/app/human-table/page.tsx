"use client";

import Link from "next/link";
import type { FormEvent, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, memo } from "react";
import { AnimatedPotValue } from "@/components/AnimatedPotValue";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { pushEngagementToast } from "@/lib/client/engagementToast";
import { FormFieldError } from "@/components/FormFieldMessage";
import { HumanTableMobileSideTabs } from "@/components/HumanTableMobileSideTabs";
import { LazyEngagementToastStack } from "@/components/LazyEngagementToastStack";
import { LazySpectatorActionLogList } from "@/components/LazySpectatorActionLogList";
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
import { formatChipAmount } from "@/lib/client/formatChipAmount";
import { formatStreetActionLabel } from "@/lib/client/formatStreetActionLabel";
import { formatTablePhase } from "@/lib/client/formatTablePhase";
import { recordQuestPracticeVisit } from "@/lib/client/questOptionalProgress";
import { connectReconnectingEventSource, type StreamConnectionStatus } from "@/lib/client/reconnectingEventSource";
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
    backToLobbyCta: "回大厅",
    call: "跟注",
    check: "过牌",
    close: "关闭",
    committed: "本手已投入",
    create: "创建牌桌",
    createHint: "当前没有真人牌桌。你将成为这张桌的创建者，并设置进入密码。",
    createTable: "创建真人牌桌",
    buyIn: "带入筹码",
    buyInHint: "带入必须是 1000 的整数倍。",
    buyInNextHand: "下一手带入",
    buyInQueued: "已预约下一手带入",
    currentBet: "当前注额",
    currentStack: "当前筹码",
    effectiveStack: "归属筹码",
    endGame: "结束游戏",
    endConfirm: "确定要结束真人桌吗？当前手未结算筹码会退回，然后展示最终统计。",
    endFailed: "结束游戏失败。",
    finalStats: "最终统计",
    finalStatsClose: "关闭统计",
    finalStatsCreateNext: "创建下一桌",
    finalStatsCtaHint: "本桌已结束。创建新桌继续练习，或返回牌桌大厅。",
    finalStatsJoinNext: "加入牌桌",
    finalStatsLoginContinue: "登录后继续",
    emptySeat: "空位",
    fold: "弃牌",
    hand: "手牌",
    handReview: "最近复盘",
    handWinners: "本局赢家",
    humanTable: "真人牌桌",
    inSeat: "在桌",
    join: "加入牌桌",
    joinHint: "已有真人牌桌。输入创建者设置的密码后加入同一张桌。",
    joinModeEyebrow: "好友邀请",
    joinModeJoinHint: "请输入房主私下告诉你的牌桌密码。链接只负责带你进入加入流程，不会包含密码。",
    joinModeJoinTitle: "加入好友的真人牌桌",
    joinModeLoginHint: "你收到了真人练习桌邀请。请先登录，登录后在本页输入房主提供的牌桌密码即可入座。",
    joinModeLoginTitle: "登录后加入牌桌",
    joinModePasswordHelper: "密码需向房主索取，至少 4 位。",
    leave: "离开真人牌桌",
    leaveConfirm: "确定要离开真人牌桌吗？",
    leaveFailed: "离桌失败。",
    leaveSettledToast: "已离开真人牌桌，本桌统计已保留。",
    leftSeat: "已离桌",
    logCapHint: "仅显示最近 {shown} 条，另有 {hidden} 条较早记录未展示。",
    login: "去登录",
    loginHint: "登录后可以创建或加入真人牌桌。",
    maxPlayers: "最多 6 人",
    myAction: "我的操作",
    netChips: "净赢",
    nextHandCountdown: (seconds: number) => `下一手倒计时 ${seconds}s`,
    noActions: "还没有行动。",
    noHandSummaries: "还没有完成的手牌摘要。",
    noCommunity: "等待公共牌",
    notMyTurn: "还没有轮到你行动。",
    password: "牌桌密码",
    passwordPlaceholder: "至少 4 位",
    phaseLabel: "阶段",
    players: "玩家统计",
    pot: "底池",
    preparingHand: "准备发牌",
    potQuarter: "1/4池",
    potHalf: "1/2池",
    potFull: "满池",
    profit: "输赢",
    raise: "加注",
    raiseRule: "加注金额表示在当前注码上追加的筹码，至少为最小加注额。",
    rebuyTitle: "筹码已清空",
    rebuyText: "你已经被清台，但仍保留在本桌统计中。选择带入筹码可从下一手继续；不买入则离开真人桌。",
    recentActions: "最近动作",
    running: "运行中",
    seatedHint: "你已在本桌入座。轮到你时，这里会出现所有合法动作。",
    seats: "座位",
    stack: "筹码",
    stats: "牌桌统计",
    status: "状态",
    streamConnecting: "连接中",
    streamLive: "实时连接",
    streamRecovering: "重连中",
    submit: "提交",
    submitting: "提交中...",
    customAmount: "自定义",
    chooseAmount: "选择下注金额",
    tableStatsHint: "桌上已下注但未结算的筹码按下注前归属计算。",
    tableEyebrow: "真人牌局",
    thinking: "正在行动",
    thisHand: "本手",
    timeoutHint: "超时后将自动执行保守动作：可过牌则过牌，否则弃牌。",
    timeLeft: "剩余时间",
    totalProfit: "总盈亏",
    unbalanced: "统计待校验",
    waiting: "等待",
    waitingNextHand: "等待下一手",
    waitingNextHandText: "你已加入真人桌，当前手已经开始。本手不会轮到你行动，下一手发牌时会自动入局。",
    waitingInviteTitle: "等待玩家加入",
    waitingInviteText: "真人桌已就绪。分享邀请链接，并私下告知牌桌密码；至少 2 人入座后自动开局。",
    copyInviteLink: "复制邀请链接",
    inviteLinkCopied: "已复制",
    inviteCopyToast: "邀请链接已复制。请一并私下发送牌桌密码。",
    inviteShareText: (tableName: string, url: string) =>
      `来 AI Poker Lab 真人练习桌「${tableName}」：打开链接进入加入模式，并向房主索取牌桌密码后入座。\n${url}`,
    waitingStart: "等待开局",
    viewHandLog: "查看本手日志",
    wonChips: "赢得筹码",
    winReason: "胜利原因",
    winBadge: "胜",
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
    backToLobbyCta: "Back to lobby",
    call: "Call",
    check: "Check",
    close: "Close",
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
    finalStatsClose: "Close stats",
    finalStatsCreateNext: "Create next table",
    finalStatsCtaHint: "This table has ended. Start a new one or return to the table lobby.",
    finalStatsJoinNext: "Join table",
    finalStatsLoginContinue: "Log in to continue",
    emptySeat: "Empty Seat",
    fold: "Fold",
    hand: "Hand",
    handReview: "Recent Review",
    handWinners: "Hand Winners",
    humanTable: "Human Table",
    inSeat: "Seated",
    join: "Join table",
    joinHint: "A human table is active. Enter its password to join the same table.",
    joinModeEyebrow: "Friend invite",
    joinModeJoinHint: "Enter the table password the host shared with you separately. The link opens join mode only; it does not include the password.",
    joinModeJoinTitle: "Join your friend's human table",
    joinModeLoginHint: "You were invited to a human practice table. Log in first, then enter the table password from the host on this page.",
    joinModeLoginTitle: "Log in to join the table",
    joinModePasswordHelper: "Ask the host for the password; at least 4 characters.",
    leave: "Leave human table",
    leaveConfirm: "Leave the human table?",
    leaveFailed: "Failed to leave table.",
    leaveSettledToast: "Left the human table. Your table stats were kept.",
    leftSeat: "Left",
    logCapHint: "Showing {shown} recent entries ({hidden} older entries hidden).",
    login: "Log in",
    loginHint: "Log in to create or join the human table.",
    maxPlayers: "Up to 6 players",
    myAction: "My Action",
    netChips: "Net",
    nextHandCountdown: (seconds: number) => `Next hand in ${seconds}s`,
    noActions: "No actions yet.",
    noHandSummaries: "No completed hand summaries yet.",
    noCommunity: "Waiting for community cards",
    notMyTurn: "It is not your turn yet.",
    password: "Table password",
    passwordPlaceholder: "At least 4 characters",
    phaseLabel: "Phase",
    players: "Player Stats",
    pot: "Pot",
    preparingHand: "Preparing hand",
    potQuarter: "1/4 pot",
    potHalf: "1/2 pot",
    potFull: "Full pot",
    profit: "P&L",
    raise: "Raise",
    raiseRule: "Raise amount is added on top of the current bet and must meet the minimum raise.",
    rebuyTitle: "Out of chips",
    rebuyText: "You are out of chips but still kept in this table's stats. Buy in to continue next hand, or leave if you do not want to rebuy.",
    recentActions: "Recent Actions",
    running: "Running",
    seatedHint: "You are seated. Legal actions will appear here when it is your turn.",
    seats: "Seats",
    stack: "Stack",
    stats: "Table Stats",
    status: "Status",
    streamConnecting: "Connecting",
    streamLive: "Live",
    streamRecovering: "Reconnecting",
    submit: "Submit",
    submitting: "Submitting...",
    customAmount: "Custom",
    chooseAmount: "Choose Amount",
    tableStatsHint: "Unsettled chips already committed to the pot are counted as still owned by the bettor.",
    tableEyebrow: "Live Poker Room",
    thinking: "Acting",
    thisHand: "This hand",
    timeoutHint: "On timeout, the table will check when possible, otherwise fold.",
    timeLeft: "Time left",
    totalProfit: "Total P&L",
    unbalanced: "Needs check",
    waiting: "Waiting",
    waitingNextHand: "Waiting for next hand",
    waitingNextHandText: "You have joined this human table after the current hand started. You will not act this hand and will be dealt in automatically next hand.",
    waitingInviteTitle: "Waiting for Players",
    waitingInviteText: "The human table is ready. Share the invite link and send the table password privately; play starts automatically with at least two seated players.",
    copyInviteLink: "Copy invite link",
    inviteLinkCopied: "Copied",
    inviteCopyToast: "Invite link copied. Send the table password privately too.",
    inviteShareText: (tableName: string, url: string) =>
      `Join my human practice table "${tableName}" on AI Poker Lab — open the link to enter join mode, then ask me for the table password:\n${url}`,
    waitingStart: "Waiting to start",
    viewHandLog: "View hand log",
    wonChips: "Won chips",
    winReason: "Winning hand",
    winBadge: "WIN",
  },
};

const initialStack = 1_000;
const actionOverlayVisibleMs = 3_000;

function subscribeToLocationSnapshot() {
  return () => undefined;
}

function getJoinModeSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).get("join") === "1";
}

function mapHumanTablePasswordError(error: unknown, mode: "create" | "join", language: keyof typeof copy) {
  const fallback =
    language === "zh"
      ? mode === "create"
        ? "创建真人牌桌失败，请稍后重试。"
        : "加入真人牌桌失败，请稍后重试。"
      : mode === "create"
        ? "Unable to create the human table. Please try again."
        : "Unable to join the human table. Please try again.";
  const raw = typeof error === "string" ? error.trim() : "";
  if (!raw) {
    return fallback;
  }
  const messages: Record<string, { zh: string; en: string }> = {
    "A human table is already active. Join it with the table password.": {
      en: "A human table is already active. Enter the password to join.",
      zh: "已有真人牌桌在运行，请输入密码加入。",
    },
    "Buy-in is too large.": {
      en: "Buy-in is too large. Please use a smaller amount.",
      zh: "带入金额过大，请降低后重试。",
    },
    "Buy-in must be a positive multiple of 1000.": {
      en: "Buy-in must be a positive multiple of 1000.",
      zh: "带入金额需为 1000 的正整数倍。",
    },
    "Login is required.": {
      en: "Please log in before creating or joining a table.",
      zh: "请先登录后再创建或加入牌桌。",
    },
    "No active human table exists.": {
      en: "No active human table is available to join right now.",
      zh: "当前没有可加入的真人牌桌，请稍后刷新或让房主先创建。",
    },
    "Table password is incorrect.": {
      en: "Incorrect password. Please confirm with the host and try again.",
      zh: "密码不正确，请向房主确认后重试。",
    },
    "Table password is too long.": {
      en: "Password is too long (max 80 characters).",
      zh: "密码过长，请控制在 80 位以内。",
    },
    "Table password must be at least 4 characters.": {
      en: "Password must be at least 4 characters.",
      zh: "密码至少需要 4 位字符。",
    },
    "The human table is full.": {
      en: "The table is full (max 6 players). Please try again later.",
      zh: "牌桌已满（最多 6 人），请稍后再试。",
    },
    "Unable to create human table.": {
      en: "Unable to create the human table. Please try again.",
      zh: "创建真人牌桌失败，请稍后重试。",
    },
    "Unable to join human table.": {
      en: "Unable to join the human table. Please try again.",
      zh: "加入真人牌桌失败，请稍后重试。",
    },
  };
  return messages[raw]?.[language] ?? raw;
}

type WinnerReveal = {
  handId: number;
  overlayVisible: boolean;
  winners: Array<{ amount: number; handLabel?: string; name: string; netAmount: number; playerId: string }>;
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
  const [actionError, setActionError] = useState<{ decisionKey: string; message: string }>();
  const [statsOpen, setStatsOpen] = useState(false);
  const [buyInDialogOpen, setBuyInDialogOpen] = useState(false);
  const [finalPlayerStats, setFinalPlayerStats] = useState<HumanTableSnapshot["playerStats"]>();
  const [now, setNow] = useState(() => Date.now());
  const [winnerReveal, setWinnerReveal] = useState<WinnerReveal>();
  const [winnerRevealSecondsLeft, setWinnerRevealSecondsLeft] = useState(0);
  const [highlightHandId, setHighlightHandId] = useState<number>();
  const [mobileSideTab, setMobileSideTab] = useState<"log" | "review">("log");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [passwordPanelError, setPasswordPanelError] = useState<string>();
  const [streamStatus, setStreamStatus] = useState<StreamConnectionStatus>("connecting");
  const joinMode = useSyncExternalStore(subscribeToLocationSnapshot, getJoinModeSnapshot, () => false);
  const lastWinnerRevealHandIdRef = useRef<number | undefined>(undefined);
  const winnerRevealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const winnerRevealCountdownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const createPanelRef = useRef<HTMLElement | null>(null);
  const createPasswordInputRef = useRef<HTMLInputElement | null>(null);
  const joinPanelRef = useRef<HTMLElement | null>(null);
  const joinPasswordInputRef = useRef<HTMLInputElement | null>(null);
  const joinPanelFocusedRef = useRef(false);

  const state = snapshot?.game ? normalizeGameSnapshot(snapshot.game) : undefined;
  const players = state?.players ?? [];
  const phaseLabel = state ? formatTablePhase(state.phase, language) : undefined;
  const myPlayer = snapshot?.myPlayerId ? players.find((player) => player.id === snapshot.myPlayerId) : undefined;
  const myPlayerSeatIndex = myPlayer ? players.findIndex((player) => player.id === myPlayer.id) : -1;
  const activePlayer = players.find((player) => player.id === state?.currentPlayerId);
  const waitingForFirstDeal = Boolean(state?.running && state.handId === 0 && players.length >= 2 && players.every((player) => (player.holeCards?.length ?? 0) === 0));
  const streetActions = currentStreetActions(state, language);
  const actionOverlays = currentActionOverlays(state, now, language);
  const pendingDecision = snapshot?.pendingDecision;
  const isMyTurn = Boolean(pendingDecision && pendingDecision.playerId === snapshot?.myPlayerId);
  const actionDecisionKey = pendingDecision ? `${pendingDecision.handId}:${pendingDecision.playerId}` : undefined;
  const visibleActionError = isMyTurn && actionError && actionDecisionKey === actionError.decisionKey ? actionError.message : undefined;
  const expiresAtMs = pendingDecision ? new Date(pendingDecision.expiresAt).getTime() : 0;
  const timeLeftMs = pendingDecision && Number.isFinite(expiresAtMs) ? Math.max(0, expiresAtMs - now) : 0;
  const handWinners = winnerReveal?.winners ?? [];
  const winningPlayerIds = new Set(handWinners.map((winner) => winner.playerId));
  const handSummaries = safeArray(snapshot?.handSummaries);
  const playerStats = safeArray(finalPlayerStats ?? snapshot?.playerStats);
  const myPlayerStat = snapshot?.myPlayerId ? playerStats.find((stat) => stat.playerId === snapshot.myPlayerId) : undefined;
  const isWaitingNextHand = myPlayerStat?.status === "waiting-next-hand";
  const needsRebuy = myPlayerStat?.status === "needs-rebuy";
  const buyInByPlayerId = new Map(playerStats.map((stat) => [stat.playerId, stat.buyIn]));
  const seatedStatsCount = playerStats.filter((stat) => stat.inSeat).length;
  const totalProfit = playerStats.reduce((sum, stat) => sum + stat.profit, 0);
  const isWaitingForPlayers =
    snapshot?.mySeatStatus === "seated" &&
    Boolean(snapshot.tableStatus?.hasTable) &&
    !snapshot.tableStatus?.running &&
    (state?.players?.length ?? 0) < 2;
  const canShareInvite = Boolean(snapshot?.tableStatus?.hasTable);
  const showInviteLoginMode = joinMode && snapshot?.mySeatStatus === "not-logged-in" && Boolean(snapshot.tableStatus?.hasTable);
  const showInviteJoinMode = joinMode && snapshot?.mySeatStatus === "spectator" && Boolean(snapshot.tableStatus?.needsJoin);
  const loginHref = showInviteLoginMode ? `/login?next=${encodeURIComponent("/human-table?join=1")}` : "/login";
  const streamStatusLabel =
    streamStatus === "live" ? t.streamLive : streamStatus === "recovering" ? t.streamRecovering : t.streamConnecting;
  const streamStatusClassName = `${styles.streamStatusPill} ${styles[`streamStatus_${streamStatus}`]}`;
  const finalStatsPrimaryLabel =
    snapshot?.mySeatStatus === "not-logged-in"
      ? t.finalStatsLoginContinue
      : snapshot?.tableStatus?.needsCreate
        ? t.finalStatsCreateNext
        : snapshot?.tableStatus?.needsJoin
          ? t.finalStatsJoinNext
          : t.finalStatsClose;

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined" || !canShareInvite) {
      return "";
    }
    return `${window.location.origin}${withBasePath("/human-table")}?join=1`;
  }, [canShareInvite]);

  const inviteShareText = useMemo(() => {
    if (!inviteUrl) {
      return "";
    }
    const tableName = snapshot?.tableStatus?.tableName ?? copy[language].humanTable;
    return copy[language].inviteShareText(tableName, inviteUrl);
  }, [inviteUrl, language, snapshot?.tableStatus?.tableName]);

  useTableSounds(state, { enableYourTurn: true, myPlayerId: snapshot?.myPlayerId });

  const focusJoinPasswordPanel = useCallback(({ allowRepeat = false }: { allowRepeat?: boolean } = {}) => {
    if (!allowRepeat && joinPanelFocusedRef.current) {
      return;
    }
    joinPanelFocusedRef.current = true;
    const reducedMotion = prefersReducedMotion();
    joinPanelRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
    window.setTimeout(() => joinPasswordInputRef.current?.focus({ preventScroll: true }), reducedMotion ? 0 : 220);
  }, []);

  const focusCreatePasswordPanel = useCallback(() => {
    const reducedMotion = prefersReducedMotion();
    createPanelRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
    window.setTimeout(() => createPasswordInputRef.current?.focus({ preventScroll: true }), reducedMotion ? 0 : 220);
  }, []);

  function setCurrentActionError(message: string | undefined) {
    setActionError(message && actionDecisionKey ? { decisionKey: actionDecisionKey, message } : undefined);
  }

  function handleFinalStatsPrimary() {
    setStatsOpen(false);
    window.setTimeout(() => {
      if (snapshot?.tableStatus?.needsCreate) {
        focusCreatePasswordPanel();
        return;
      }
      if (snapshot?.tableStatus?.needsJoin) {
        focusJoinPasswordPanel({ allowRepeat: true });
        return;
      }
      if (snapshot?.mySeatStatus === "not-logged-in") {
        window.scrollTo({ behavior: prefersReducedMotion() ? "auto" : "smooth", top: 0 });
      }
    }, 0);
  }

  const clearWinnerRevealTimers = useCallback(() => {
    if (winnerRevealTimerRef.current) {
      clearTimeout(winnerRevealTimerRef.current);
      winnerRevealTimerRef.current = undefined;
    }
    if (winnerRevealCountdownRef.current) {
      clearInterval(winnerRevealCountdownRef.current);
      winnerRevealCountdownRef.current = undefined;
    }
  }, []);

  function scrollToHandLogs() {
    const handId = winnerReveal?.handId ?? state?.handId;
    if (handId !== undefined) {
      setHighlightHandId(handId);
    }
    clearWinnerRevealTimers();
    setWinnerReveal(undefined);
    setWinnerRevealSecondsLeft(0);
    setMobileSideTab("log");

    window.setTimeout(() => {
      const reducedMotion = prefersReducedMotion();
      const isMobileSidePanel = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 1180px)").matches;
      const idPrefix = isMobileSidePanel ? "human-table-mobile-action" : "human-table-desktop-action";
      const logsSection = document.getElementById(`${idPrefix}-logs`);
      logsSection?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
      document.getElementById(`${idPrefix}-log-list`)?.focus({ preventScroll: true });
    }, 50);
  }

  const revealWinnersForSnapshot = useCallback((nextState?: GameSnapshot) => {
    if (!nextState || nextState.handId === lastWinnerRevealHandIdRef.current) {
      return;
    }

    const winners = handWinnerSummaries(nextState);
    if (winners.length === 0) {
      return;
    }

    lastWinnerRevealHandIdRef.current = nextState.handId;
    clearWinnerRevealTimers();
    setWinnerReveal({ handId: nextState.handId, overlayVisible: true, winners });
    setHighlightHandId(nextState.handId);
    setWinnerRevealSecondsLeft(5);
    winnerRevealCountdownRef.current = setInterval(() => {
      setWinnerRevealSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1_000);
    winnerRevealTimerRef.current = setTimeout(() => {
      setWinnerReveal(undefined);
      setWinnerRevealSecondsLeft(0);
      clearWinnerRevealTimers();
    }, 5_000);
  }, [clearWinnerRevealTimers]);

  useEffect(() => {
    recordQuestPracticeVisit();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadInitialSnapshot() {
      try {
        const response = await fetch(withBasePath("/api/human-table/state"), { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const nextSnapshot = (await response.json()) as HumanTableSnapshot;
        if (cancelled) {
          return;
        }
        setSnapshot(nextSnapshot);
        revealWinnersForSnapshot(nextSnapshot.game);
      } catch (error) {
        console.error("human_table_initial_snapshot_failed", error);
      }
    }

    void loadInitialSnapshot();
    return () => {
      cancelled = true;
    };
  }, [revealWinnersForSnapshot]);

  useEffect(() => {
    return connectReconnectingEventSource({
      url: withBasePath("/api/human-table/events"),
      onStatusChange: setStreamStatus,
      onSnapshot: (data) => {
        try {
          const incoming = JSON.parse(data) as HumanTableSnapshot;
          setSnapshot((previous) => mergeHumanTableSnapshotForSse(previous, incoming));
          revealWinnersForSnapshot(incoming.game);
        } catch (error) {
          console.error("human_table_sse_snapshot_parse_failed", error);
        }
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
  }, [revealWinnersForSnapshot]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      clearWinnerRevealTimers();
    };
  }, [clearWinnerRevealTimers]);

  useEffect(() => {
    if (!showInviteJoinMode || joinPanelFocusedRef.current) {
      return;
    }
    focusJoinPasswordPanel();
  }, [focusJoinPasswordPanel, showInviteJoinMode]);

  async function submitPasswordForm(event: FormEvent<HTMLFormElement>, mode: "create" | "join") {
    event.preventDefault();
    setBusy(mode);
    setStatus(undefined);
    setPasswordPanelError(undefined);
    try {
      const response = await fetch(withBasePath(`/api/human-table/${mode}`), {
        body: JSON.stringify({ buyIn: Number(buyIn), password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        setPasswordPanelError(mapHumanTablePasswordError(payload.error, mode, language));
        if (mode === "join" && showInviteJoinMode) {
          focusJoinPasswordPanel({ allowRepeat: true });
        }
        return;
      }
      setPassword("");
      setBuyIn(String(initialStack));
      setPasswordPanelError(undefined);
      setFinalPlayerStats(undefined);
      setSnapshot(payload);
    } finally {
      setBusy(undefined);
    }
  }

  async function submitAction(action: PokerAction) {
    setBusy("action");
    setStatus(undefined);
    setCurrentActionError(undefined);
    try {
      const response = await fetch(withBasePath("/api/human-table/action"), {
        body: JSON.stringify(action),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        setCurrentActionError(payload.error ?? t.actionFailed);
        return;
      }
      setCurrentActionError(undefined);
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
      pushEngagementToast({
        expiresMs: 4500,
        id: `human-leave-${Date.now()}`,
        kind: "settled",
        message: t.leaveSettledToast,
      });
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
      tableId: snapshot?.tableStatus?.tableId,
    });
    pushEngagementToast({
      expiresMs: 4500,
      id: `human-invite-copy-${snapshot?.tableStatus?.tableId ?? "table"}`,
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
      {snapshot?.mySeatStatus === "seated" && !snapshot.tableStatus?.canEndGame ? (
        <button className={styles.danger} disabled={busy === "leave"} type="button" onClick={() => void leaveTable()}>
          {t.leave}
        </button>
      ) : null}
      {snapshot?.tableStatus?.canEndGame ? (
        <button className={styles.danger} disabled={busy === "end"} type="button" onClick={() => void endGame()}>
          {t.endGame}
        </button>
      ) : null}
    </div>
  );

  const actionDock = snapshot?.mySeatStatus === "seated" ? (
    <div className={`${styles.actionDock} ${isMyTurn ? styles.activeActionDock : styles.idleActionDock}`}>
      <span className={styles.actionStatus}>
        {isMyTurn && pendingDecision ? (
          <>
            {t.timeLeft} {formatTimeLeft(timeLeftMs)} · {t.pot} <AnimatedPotValue announce={false} value={state?.pot ?? 0} /> · {t.currentBet} {formatChipAmount(state?.currentBet ?? 0)}
          </>
        ) : isWaitingNextHand
            ? t.waitingNextHandText
            : needsRebuy
              ? t.rebuyText
              : activePlayer
                ? `${activePlayer.name} ${t.thinking}`
                : t.seatedHint}
      </span>
      {isMyTurn && pendingDecision && !isWaitingNextHand && !needsRebuy ? (
        <p className={styles.actionTimeoutHint}>{t.timeoutHint}</p>
      ) : null}
      <FormFieldError className={styles.actionInlineError} message={visibleActionError} variant="inline" />
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
          setStatus={setCurrentActionError}
          stack={pendingDecision.stack}
          t={t}
          toCall={pendingDecision.toCall}
        />
      ) : null}
    </div>
  ) : null;

  const pendingBuyInNotice = snapshot?.mySeatStatus === "seated" && !needsRebuy && myPlayerStat?.pendingBuyIn ? (
    <section className={styles.buyInPanel} role="status" aria-live="polite">
      <div>
        <p className={styles.eyebrow}>{t.buyIn}</p>
        <p className={styles.muted}>{`${t.buyInQueued}: ${formatChipAmount(myPlayerStat.pendingBuyIn)}`}</p>
      </div>
    </section>
  ) : null;

  const actionLogCopy = {
    logCapHint: t.logCapHint,
    noActions: t.noActions,
    recentActions: t.recentActions,
  };

  function renderLogPanel(idPrefix: string) {
    if (!state) {
      return null;
    }
    return (
      <LazySpectatorActionLogList
        copy={actionLogCopy}
        highlightHandId={highlightHandId ?? state.handId}
        idPrefix={idPrefix}
        logs={state.logs}
        myPlayerName={myPlayer?.name}
      />
    );
  }

  function renderReviewPanel() {
    return (
      <section className={styles.panel}>
        <h2>{t.handReview}</h2>
        <div className={styles.handSummaryList}>
          {handSummaries.slice(0, 5).map((summary) => {
            const isSyncedHand = highlightHandId !== undefined && summary.handId === highlightHandId;
            const communityCards = safeArray(summary.communityCards);
            const winners = safeArray(summary.winners);
            const summaryPlayers = safeArray(summary.players);
            return (
              <article
                aria-current={isSyncedHand ? "true" : undefined}
                className={`${styles.handSummaryCard} ${isSyncedHand ? styles.handSummaryHighlight : ""}`}
                key={`${summary.handId}-${summary.completedAt}`}
              >
                <div className={styles.handSummaryHeader}>
                  <strong>
                    {t.hand} #{summary.handId}
                    {isSyncedHand ? <span className={`${styles.handSummaryTag} ${styles.handSummaryTagNatural}`}>{t.thisHand}</span> : null}
                  </strong>
                  <span>
                    <time dateTime={summary.completedAt}>{new Date(summary.completedAt).toLocaleTimeString()}</time>
                    {formatChipAmount(summary.totalAwarded)}
                  </span>
                </div>
                <div className={styles.handSummaryCards}>
                  {communityCards.length > 0 ? (
                    communityCards.map((card, index) => <PlayingCard card={card} key={`${summary.handId}-${card.rank}${card.suit}-${index}`} small />)
                  ) : (
                    <small>{t.noCommunity}</small>
                  )}
                </div>
                <div className={styles.handSummaryWinners}>
                  {winners.map((winner) => (
                    <span key={`${summary.handId}-${winner.playerId}`}>
                      {winner.name} +{formatChipAmount(winner.amount)}
                      {winner.handLabel ? <small>{formatWinReason(winner.handLabel, language)}</small> : null}
                    </span>
                  ))}
                </div>
                <div className={styles.handSummaryPlayers}>
                  {summaryPlayers.map((player) => (
                    <span key={`${summary.handId}-${player.playerId}`}>
                      {player.name}
                      <em className={seatDeltaClassName(player.netChips)}>{formatSeatDelta(player.netChips)}</em>
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
          {handSummaries.length === 0 ? <p className={styles.muted}>{t.noHandSummaries}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <main className={`${styles.page} ${snapshot?.mySeatStatus === "seated" ? styles.humanTablePageSeated : ""}`}>
      <LazyEngagementToastStack />
      <section className={styles.header}>
        <div className={styles.mobileHeaderMain}>
          <p className={styles.eyebrow}>{t.tableEyebrow}</p>
          <h1>{snapshot?.tableStatus?.tableName ?? t.humanTable}</h1>
          <p className={styles.subtitle}>
            {state?.running ? t.running : t.waitingStart} · {snapshot?.tableStatus?.playerCount ?? 0}/6 {t.seats} · {t.hand} #{state?.handId ?? 0}
          </p>
          <div className={styles.mobileTableStatus}>
            <span className={streamStatusClassName} role="status" aria-live="polite">{streamStatusLabel}</span>
            <span>{state?.running ? t.running : t.waitingStart}</span>
            <span>{t.hand} #{state?.handId ?? 0}</span>
            {phaseLabel ? <span>{t.phaseLabel} {phaseLabel}</span> : null}
            <span>{t.pot} <AnimatedPotValue announce={false} value={state?.pot ?? 0} /></span>
            <span>{activePlayer ? `${t.activePlayer}: ${activePlayer.name}` : t.waitingStart}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <span className={streamStatusClassName} role="status" aria-live="polite">{streamStatusLabel}</span>
          {canShareInvite ? (
            <button className={styles.shareCopyAction} type="button" onClick={() => void copyInviteLink()}>
              {inviteCopied ? t.inviteLinkCopied : t.copyInviteLink}
            </button>
          ) : null}
          <SoundToggle />
        </div>
      </section>

      {snapshot?.mySeatStatus === "not-logged-in" ? (
        <section className={`${styles.joinPanel} ${showInviteLoginMode ? styles.joinPanelInviteMode : ""}`}>
          {showInviteLoginMode ? <p className={styles.eyebrow}>{t.joinModeEyebrow}</p> : null}
          <h2>{showInviteLoginMode ? t.joinModeLoginTitle : t.humanTable}</h2>
          <p className={styles.muted}>{showInviteLoginMode ? t.joinModeLoginHint : t.loginHint}</p>
          <Link className={styles.primaryAction} href={loginHref}>{t.login}</Link>
        </section>
      ) : snapshot?.tableStatus?.needsCreate ? (
        <PasswordPanel
          busy={busy === "create"}
          buttonText={t.create}
          description={t.createHint}
          errorMessage={passwordPanelError}
          onSubmit={(event) => void submitPasswordForm(event, "create")}
          panelRef={createPanelRef}
          buyIn={buyIn}
          buyInHint={t.buyInHint}
          buyInLabel={t.buyIn}
          password={password}
          passwordInputRef={createPasswordInputRef}
          passwordLabel={t.password}
          passwordPlaceholder={t.passwordPlaceholder}
          setPassword={(value) => {
            setPassword(value);
            setPasswordPanelError(undefined);
          }}
          setBuyIn={(value) => {
            setBuyIn(value);
            setPasswordPanelError(undefined);
          }}
          title={t.createTable}
        />
      ) : snapshot?.tableStatus?.needsJoin ? (
        <PasswordPanel
          autoFocusPassword={showInviteJoinMode}
          busy={busy === "join"}
          buttonText={t.join}
          description={showInviteJoinMode ? t.joinModeJoinHint : t.joinHint}
          eyebrow={showInviteJoinMode ? t.joinModeEyebrow : undefined}
          errorMessage={passwordPanelError}
          joinMode={showInviteJoinMode}
          onSubmit={(event) => void submitPasswordForm(event, "join")}
          panelRef={joinPanelRef}
          buyIn={buyIn}
          buyInHint={t.buyInHint}
          buyInLabel={t.buyIn}
          password={password}
          passwordHint={showInviteJoinMode ? t.joinModePasswordHelper : undefined}
          passwordInputRef={joinPasswordInputRef}
          passwordLabel={t.password}
          passwordPlaceholder={t.passwordPlaceholder}
          setPassword={(value) => {
            setPassword(value);
            setPasswordPanelError(undefined);
          }}
          setBuyIn={(value) => {
            setBuyIn(value);
            setPasswordPanelError(undefined);
          }}
          title={showInviteJoinMode ? t.joinModeJoinTitle : t.join}
        />
      ) : null}

      {!state && visibleStatus ? <FormFieldError message={visibleStatus} /> : null}

      {state ? (
        <section className={styles.layout}>
          <div className={styles.tableArea}>
            <div className={styles.table}>
              <div className={styles.tableCenter}>
                <div className={styles.centerStats}>
                  <span className={`${styles.phase} ${styles.phaseLocalized}`}>{phaseLabel}</span>
                  <span className={styles.centerPot}>{t.pot} <AnimatedPotValue value={state.pot} /></span>
                </div>
                <div className={styles.cards}>
                  {state.communityCards.length ? (
                    state.communityCards.map((card, index) => <PlayingCard card={card} key={`${card.rank}${card.suit}${index}`} />)
                  ) : (
                  <span className={styles.emptyCards}>{waitingForFirstDeal ? t.preparingHand : t.noCommunity}</span>
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
                    actionOverlay={actionOverlays.get(player.id)}
                    copy={{ profit: t.profit, stack: t.stack, winBadge: t.winBadge }}
                    isCurrent={player.id === state.currentPlayerId}
                    isMine={player.id === snapshot?.myPlayerId}
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
              <span>{t.pot} <AnimatedPotValue announce={false} value={state.pot} /></span>
              <span>{t.hand} #{state.handId}</span>
              <span>{t.phaseLabel} {phaseLabel}</span>
              <span>{t.currentBet} {formatChipAmount(state.currentBet)}</span>
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
            <div className={styles.desktopSidePanels}>
              {renderLogPanel("human-table-desktop-action")}
              {renderReviewPanel()}
            </div>
            <div className={styles.mobileSideTabs}>
              <HumanTableMobileSideTabs
                activeTab={mobileSideTab}
                copy={{ tabLog: t.recentActions, tabReview: t.handReview }}
                logPanel={renderLogPanel("human-table-mobile-action")}
                onTabChange={setMobileSideTab}
                reviewPanel={renderReviewPanel()}
              />
            </div>
          </aside>
        </section>
      ) : null}

      {statsOpen ? (
        <section className={styles.statsOverlay} role="dialog" aria-modal="true" aria-labelledby="human-table-stats-title" aria-describedby="human-table-stats-description">
          <div className={styles.statsDialog}>
            <div className={styles.statsHeader}>
              <div>
                <p className={styles.eyebrow}>{t.humanTable}</p>
                <h2 id="human-table-stats-title">{finalPlayerStats ? t.finalStats : t.stats}</h2>
                <p className={styles.muted} id="human-table-stats-description">{t.tableStatsHint}</p>
              </div>
              <button aria-label={t.finalStatsClose} type="button" onClick={() => setStatsOpen(false)}>×</button>
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
                  <span className={styles.statsStack}><small>{t.currentStack}</small><b>{formatChipAmount(stat.currentStack)}</b></span>
                  <span className={styles.statsCommitted}><small>{t.committed}</small><b>{formatChipAmount(stat.committedChips)}</b></span>
                  <span className={styles.statsEffective}><small>{t.effectiveStack}</small><b>{formatChipAmount(stat.effectiveStack)}</b></span>
                  <em className={seatDeltaClassName(stat.profit)}>{formatSeatDelta(stat.profit)}</em>
                </article>
              ))}
              {playerStats.length === 0 ? <p className={styles.muted}>{t.noActions}</p> : null}
            </div>
            {finalPlayerStats ? (
              <div className={styles.statsFinalFooter}>
                <p className={styles.muted}>{t.finalStatsCtaHint}</p>
                <div className={styles.sessionEndActions}>
                  <button className={styles.sessionEndPrimary} type="button" onClick={handleFinalStatsPrimary}>
                    {finalStatsPrimaryLabel}
                  </button>
                  <Link className={styles.sessionEndSecondary} href="/tables">
                    {t.backToLobbyCta}
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {needsRebuy || buyInDialogOpen ? (
        <section className={styles.buyInOverlay} role="dialog" aria-modal="true" aria-labelledby="human-table-buy-in-title" aria-describedby="human-table-buy-in-description">
          <div className={styles.buyInDialog}>
            <div className={styles.statsHeader}>
              <div>
                <p className={styles.eyebrow}>{t.buyIn}</p>
                <h2 id="human-table-buy-in-title">{needsRebuy ? t.rebuyTitle : t.buyInNextHand}</h2>
                <p className={styles.muted} id="human-table-buy-in-description">{needsRebuy ? t.rebuyText : t.buyInHint}</p>
              </div>
              {!needsRebuy ? <button aria-label={t.close} type="button" onClick={() => setBuyInDialogOpen(false)}>×</button> : null}
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
              <button disabled={Boolean(busy) || !isValidBuyIn(nextBuyIn)} type="submit">{t.buyInNextHand}</button>
            </form>
            {needsRebuy ? (
              <div className={styles.buyInDialogActions}>
                <button
                  className={styles.dangerAction}
                  disabled={Boolean(busy)}
                  type="button"
                  onClick={() => {
                    if (snapshot?.tableStatus?.canEndGame) {
                      void endGame();
                      return;
                    }
                    void leaveTable();
                  }}
                >
                  {snapshot?.tableStatus?.canEndGame ? t.endGame : t.leave}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <TableMomentOverlay
        countdownLabel={winnerRevealSecondsLeft > 0 ? t.nextHandCountdown(winnerRevealSecondsLeft) : undefined}
        countdownSeconds={winnerRevealSecondsLeft}
        eyebrow={t.handWinners}
        handId={winnerReveal?.handId ?? state?.handId ?? 0}
        handLabel={t.hand}
        onViewLog={scrollToHandLogs}
        open={Boolean(winnerReveal?.overlayVisible && handWinners.length > 0)}
        variant="handWin"
        viewLogLabel={t.viewHandLog}
        winners={handWinners.map((winner) => ({
          amount: winner.amount,
          name: winner.name,
          netAmount: winner.netAmount,
          netChipsLabel: t.netChips,
          playerId: winner.playerId,
          winReason: winner.handLabel ? `${t.winReason}: ${formatWinReason(winner.handLabel, language)}` : undefined,
          wonChipsLabel: t.wonChips,
        }))}
      />
    </main>
  );
}

function PasswordPanel({
  autoFocusPassword = false,
  busy,
  buttonText,
  buyIn,
  buyInHint,
  buyInLabel,
  description,
  eyebrow,
  errorMessage,
  joinMode = false,
  onSubmit,
  panelRef,
  password,
  passwordHint,
  passwordInputRef,
  passwordLabel,
  passwordPlaceholder,
  setBuyIn,
  setPassword,
  title,
}: {
  autoFocusPassword?: boolean;
  busy: boolean;
  buttonText: string;
  buyIn: string;
  buyInHint: string;
  buyInLabel: string;
  description: string;
  eyebrow?: string;
  errorMessage?: string;
  joinMode?: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  panelRef?: RefObject<HTMLElement | null>;
  password: string;
  passwordHint?: string;
  passwordInputRef?: RefObject<HTMLInputElement | null>;
  passwordLabel: string;
  passwordPlaceholder: string;
  setBuyIn: (value: string) => void;
  setPassword: (value: string) => void;
  title: string;
}) {
  const parsedBuyIn = Number(buyIn);
  const buyInValid = Number.isFinite(parsedBuyIn) && parsedBuyIn >= initialStack && parsedBuyIn % initialStack === 0;
  const panelId = joinMode ? "human-table-join" : "human-table-password";
  const errorId = errorMessage ? `${panelId}-error` : undefined;
  const passwordHintId = passwordHint ? `${panelId}-password-hint` : undefined;
  const passwordDescription = [passwordHintId, errorId].filter(Boolean).join(" ") || undefined;
  const titleId = `${panelId}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className={`${styles.joinPanel} ${joinMode ? styles.joinPanelInviteMode : ""}`}
      id={panelId}
      ref={panelRef}
    >
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h2 id={titleId}>{title}</h2>
      <p className={styles.muted}>{description}</p>
      <form className={styles.coachingForm} onSubmit={onSubmit}>
        <label>
          {passwordLabel}
          <input
            aria-describedby={passwordDescription}
            aria-errormessage={errorId}
            aria-invalid={errorMessage ? true : undefined}
            autoFocus={autoFocusPassword}
            className={styles.textInput}
            minLength={4}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={passwordPlaceholder}
            ref={passwordInputRef}
            type="password"
            value={password}
          />
          {passwordHint ? <span className={styles.fieldHint} id={passwordHintId}>{passwordHint}</span> : null}
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
        <FormFieldError id={errorId} message={errorMessage} variant="inline" />
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
  stack,
  t,
  toCall,
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
  stack: number;
  t: (typeof copy)["zh"];
  toCall: number;
}) {
  const [amountPicker, setAmountPicker] = useState<"bet" | "raise">();
  const [customAmount, setCustomAmount] = useState("");
  const amountActionType: "bet" | "raise" | undefined = legalActions.includes("bet") ? "bet" : legalActions.includes("raise") ? "raise" : undefined;
  const callLabel = `${t.call} ${formatChipAmount(Math.min(toCall, stack))}`;
  const raiseLabel = `${t.raise} +${formatChipAmount(minRaise)}`;
  const allInLabel = `${t.allIn} ${formatChipAmount(stack)}`;
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
    return Math.min(maxAllowedAmount(type), Math.max(minimum, potAmount));
  }

  function minimumAmount(type: "bet" | "raise") {
    return type === "raise" ? minRaise : bigBlind;
  }

  function maxAllowedAmount(type: "bet" | "raise") {
    return type === "raise" ? Math.max(0, maxAmount - currentBet) : maxAmount;
  }

  function submitAmount(type: "bet" | "raise", amount: number) {
    const maxAllowed = maxAllowedAmount(type);
    if (!Number.isFinite(amount) || amount <= 0 || amount > maxAllowed) {
      setStatus(t.amountInvalid);
      return;
    }
    if (type === "raise" && amount < minRaise && amount !== maxAllowed) {
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
      onSubmit({ type: "raise", amount: maxAllowedAmount("raise") });
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
        {legalActions.includes("call") ? <button disabled={busy} type="button" onClick={() => onSubmit({ type: "call" })}>{callLabel}</button> : null}
        {legalActions.includes("bet") ? <button disabled={busy} type="button" onClick={() => openAmountPicker("bet")}>{t.bet}</button> : null}
        {legalActions.includes("raise") ? <button disabled={busy} type="button" onClick={() => openAmountPicker("raise")}>{raiseLabel}</button> : null}
        {legalActions.some((action) => action === "bet" || action === "raise" || action === "call") ? (
          <button className={styles.allInAction} disabled={busy} type="button" onClick={submitAllIn}>{allInLabel}</button>
        ) : null}
      </div>
      {amountActionType && amountPicker ? (
        <section className={styles.amountOverlay} role="dialog" aria-modal="true" aria-labelledby="human-table-amount-title">
          <div className={styles.amountDialog}>
            <div className={styles.statsHeader}>
              <div>
                <p className={styles.eyebrow}>{amountPicker === "raise" ? t.raise : t.bet}</p>
                <h2 id="human-table-amount-title">{t.chooseAmount}</h2>
                {amountPicker === "raise" ? <p className={styles.muted}>{t.raiseRule}</p> : null}
              </div>
              <button aria-label={t.close} type="button" onClick={closeAmountPicker}>×</button>
            </div>
            <div className={styles.amountChoices}>
              {potOptions.map((option) => (
                <button disabled={busy} key={option.label} type="button" onClick={() => submitAmount(amountPicker, option.amount)}>
                  <span>{option.label}</span>
                  <strong>{formatChipAmount(option.amount)}</strong>
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

function currentStreetActions(state: GameSnapshot | undefined, language: "zh" | "en") {
  const actions = new Map<string, string>();
  if (!state) {
    return actions;
  }

  for (const item of safeArray(state.actionHistory)) {
    if (item.handId !== state.handId || item.round !== state.phase || item.action === "deal" || item.action === "win") {
      continue;
    }
    actions.set(item.playerId, formatStreetActionLabel(item, language));
  }

  return actions;
}

function currentActionOverlays(state: GameSnapshot | undefined, nowMs: number, language: "zh" | "en") {
  const actions = new Map<string, string>();
  if (!state) {
    return actions;
  }

  for (const item of safeArray(state.actionHistory)) {
    if (item.handId !== state.handId || item.round !== state.phase || item.action === "deal" || item.action === "win") {
      continue;
    }
    const createdAtMs = new Date(item.createdAt).getTime();
    if (!Number.isFinite(createdAtMs) || nowMs - createdAtMs > actionOverlayVisibleMs) {
      continue;
    }
    actions.set(item.playerId, formatStreetActionLabel(item, language));
  }

  return actions;
}

function handWinnerSummaries(state?: GameSnapshot) {
  if (!state) {
    return [];
  }

  const committedByPlayerId = new Map(safeArray(state.players).map((player) => [player.id, player.totalCommitted]));
  const winners = new Map<string, { amount: number; handLabel?: string; name: string; netAmount: number; playerId: string }>();
  for (const item of safeArray(state.actionHistory)) {
    if (item.handId !== state.handId || item.action !== "win") {
      continue;
    }
    const current = winners.get(item.playerId);
    const amount = (current?.amount ?? 0) + (item.amount ?? 0);
    winners.set(item.playerId, {
      amount,
      handLabel: current?.handLabel ?? item.handLabel,
      name: item.playerName,
      netAmount: amount - (committedByPlayerId.get(item.playerId) ?? 0),
      playerId: item.playerId,
    });
  }

  return [...winners.values()].sort((left, right) => right.netAmount - left.netAmount || right.amount - left.amount);
}

function normalizeGameSnapshot(state: GameSnapshot): GameSnapshot {
  return {
    ...state,
    actionHistory: safeArray(state.actionHistory),
    communityCards: safeArray(state.communityCards),
    currentBet: safeNumber(state.currentBet),
    handId: safeNumber(state.handId),
    logs: safeArray(state.logs),
    modelStats: safeArray(state.modelStats),
    players: safeArray(state.players).map((player) => ({
      ...player,
      currentBet: safeNumber(player.currentBet),
      holeCards: safeArray(player.holeCards),
      stack: safeNumber(player.stack),
      totalCommitted: safeNumber(player.totalCommitted),
    })),
    pot: safeNumber(state.pot),
    stats: safeArray(state.stats),
  };
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
