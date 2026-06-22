"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { AnimatedPotValue } from "@/components/AnimatedPotValue";
import { FormFieldError, FormFieldHint } from "@/components/FormFieldMessage";
import { SkeletonStack } from "@/components/SkeletonBlock";
import { resetCoachingStreak } from "@/lib/client/coachingStreak";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { LazyEngagementToastStack } from "@/components/LazyEngagementToastStack";
import { LazySpectatorActionLogList } from "@/components/LazySpectatorActionLogList";
import { LazyHandReviewList } from "@/components/LazyHandReviewList";
import { LazyReactionBar } from "@/components/LazyReactionBar";
import { SpectatorSideTabs } from "@/components/SpectatorSideTabs";
import { TableMomentOverlay } from "@/components/TableMomentOverlay";
import { SoundToggle } from "@/components/SoundToggle";
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
import { connectReconnectingEventSource } from "@/lib/client/reconnectingEventSource";
import { pushEngagementToast } from "@/lib/client/engagementToast";
import { useLanguage } from "@/lib/client/i18n";
import { liveRegionProps } from "@/lib/client/liveRegion";
import { mergeGameSnapshotForSse } from "@/lib/client/sseSnapshotMerge";
import {
  DAILY_TASKS_COMPLETE_COPY,
  getDailyTasksProgress,
  recordDailySpectatedHand,
} from "@/lib/client/dailyTasks";
import { recordRecentSpectate } from "@/lib/client/recentSpectate";
import { recordQuestQuickPlayComplete, recordQuestShareComplete } from "@/lib/client/questOptionalProgress";
import { useSpectatorPointsToast } from "@/lib/client/useSpectatorPointsToast";
import { useTableSounds } from "@/lib/client/tableSoundEvents";
import type { SlimGameSnapshotForSse } from "@/lib/server/sseSnapshot";
import type { AgentHandSummary, Card, GameSnapshot } from "@/lib/poker/types";
import styles from "../../table/table.module.css";

const CoachDock = dynamic(
  () => import("@/components/CoachDock").then((mod) => ({ default: mod.CoachDock })),
  {
    loading: () => <SkeletonStack label="Loading coach panel" rows={3} />,
    ssr: false,
  },
);

const copy = {
  zh: {
    eyebrow: "AI 观战牌桌",
    running: "运行中",
    waitingStart: "等待开局",
    seats: "座位",
    hand: "手",
    home: "首页",
    backLobby: "返回大厅",
    pot: "底池",
    waitingCommunity: "等待公共牌",
    emptySeat: "空位",
    waitingAssign: "等待分配",
    stack: "筹码",
    bet: "下注",
    action: "动作",
    waiting: "等待",
    actionLog: "行动日志",
    recentActions: "最近动作",
    noActions: "还没有行动。",
    logCapHint: "仅显示最近 {shown} 条，另有 {hidden} 条较早记录未展示。",
    virtualAgent: "BOT",
    currentBet: "当前注额",
    chipChange: "筹码变化",
    players: "玩家",
    profit: "盈亏",
    position: "位置",
    myPlayer: "我的牌手",
    loginToView: "登录后，如果你的牌手在本桌，会显示当前状态和离桌控制。",
    joinTable: "坐上这张桌",
    joiningTable: "正在上桌...",
    joinTableHint: "你已登录，可以让自己的托管牌手加入这张桌，从下一手开始参与。",
    joinTableFailed: "上桌失败。",
    joinTableQueued: "已加入这张桌，等待下一手入局。",
    leaveTable: "离桌",
    leaveFailed: "离开牌桌失败。",
    leaving: "离开中...",
    loadingLogin: "正在读取登录状态...",
    leaveSettled: "已离开牌桌并结算。",
    leaveNoPlayer: "当前没有需要离开的牌手。",
    hostedAgent: "托管 Agent",
    externalAgent: "本地 Agent",
    spectatorMode: "观战模式",
    spectatorHint: "观战模式：你不是本桌下注玩家，可观察 AI 决策与互动条；登录后可创建牌手并 Coaching。",
    spectatorCount: (count: number) => `${count} 人正在观战`,
    thinking: "正在思考",
    preparingHand: "准备发牌",
    handWinners: "本局赢家",
    wonChips: "赢得筹码",
    netChips: "净赢",
    viewHandLog: "查看本手日志",
    handReview: "最近复盘",
    noHandSummaries: "还没有完成的手牌摘要。",
    noCommunity: "暂无公共牌",
    handInsightTitle: "本手牌力",
    handInsightMadeHand: "成牌",
    handInsightBoard: "牌面",
    handInsightDraws: "听牌",
    handInsightNone: "无",
    handInsightReasoning: "决策",
    previousHandInsightTitle: "上一手洞察",
    previousHandResult: "你的结果",
    previousHandBoard: "公共牌",
    previousHandWinners: "赢家",
    previousHandNoBoard: "未发公共牌",
    lastReasoning: "最近决策",
    coachingTitle: "下一手 Coaching",
    coachingCollapse: "收起",
    coachingExpand: "展开",
    coachingCollapsedSummary: "给下一手发送策略建议 — 点击展开 Coaching 面板",
    coachingHint: "建议会在下一手开始时注入你的 AI 牌手 Prompt。",
    coachingPlaceholder: "例如：这手后收紧范围，少在边缘 spot 加注。",
    coachingSubmit: "提交 Coaching",
    coachingSubmitting: "提交中...",
    coachingAppliedFromHand: (handId: number) => `已从第 ${handId} 手起生效。`,
    coachingRecent: "最近 3 条 Coaching",
    coachingFailed: "Coaching 提交失败。",
    noCoachingHistory: "还没有 Coaching 记录。",
    coachingHistoryLoading: "正在加载 Coaching 记录…",
    coachingHistoryLoadFailed: "无法加载 Coaching 历史。",
    coachingStreakActive: "活跃教练",
    coachingStreakProgress: (count: number, target: number) => `${count}/${target} 活跃教练`,
    coachingMilestoneToast: (count: number) => `第 ${count} 次 Coaching 里程碑达成！`,
    coachingStreakMilestoneToast: "第 3 次 Coaching — 活跃教练达成！",
    coachingPending: (handId: number) => `Coaching 待生效 · 手 #${handId}`,
    coachingAppliedToast: "你的 Coaching 已在本手生效",
    leaveSettledToast: "已离桌并结算，积分已回账",
    agentBustToast: (name: string) => `${name} 已清台，本局已结算`,
    handWinPointsToast: (amount: number) => `本手 +${amount.toLocaleString()}`,
    accountPointsToast: (delta: number, dailyRank?: number) => {
      const signed = `${delta > 0 ? "+" : ""}${delta.toLocaleString()}`;
      return dailyRank ? `实验积分 ${signed} · 今日第 ${dailyRank} 名` : `实验积分 ${signed} 已更新`;
    },
    dailyRankToast: (rank: number) => `你的牌手升到今日第 ${rank} 名`,
    reactionTitle: "观战互动",
    reactionShortcutHint: "按键 1–8 快捷发送",
    reactionRecentLabel: "最近互动",
    reactionRateLimited: "发送太频繁，请稍后再试",
    reactionSendFailed: "发送失败，请重试",
    winBadge: "胜",
    streamConnecting: "连接中",
    streamLive: "实时连接",
    streamRecovering: "重连中",
    myAgentOtherTable: (tableName: string) => `你的牌手正在「${tableName}」`,
    goToMyAgentTable: "前往我的牌手所在桌",
    tableFull: "本桌已满，暂无法入座。",
    tabLog: "日志",
    tabCoach: "教练",
    tabInsight: "洞察",
    coachTabEmpty: "登录并让牌手入座后，可在此发送 Coaching。",
    insightTabEmpty: "摊牌后会显示你的牌手牌力分析。",
    insightTabWaiting: "本手进行中，摊牌后查看牌力洞察。",
    copySpectatorShare: "复制观战链接",
    spectatorShareCopied: "已复制",
    sessionEndLeaveTitle: "本局已结算",
    sessionEndBustTitle: "你的牌手已清台",
    sessionEndLeaveText: "积分已回账。要再开一局，还是回大厅看看其他牌桌？",
    sessionEndBustText: "这手结束后已自动结算。再来一局，或回大厅选别的桌。",
    playAgainCta: "再来一局",
    backToLobbyCta: "回大厅",
    playAgainStarting: "正在匹配牌桌…",
  },
  en: {
    eyebrow: "Texas Poker Table",
    running: "Running",
    waitingStart: "Waiting to start",
    seats: "Seats",
    hand: "Hand",
    home: "Home",
    backLobby: "Back to Lobby",
    pot: "Pot",
    waitingCommunity: "Waiting for community cards",
    emptySeat: "Empty Seat",
    waitingAssign: "Waiting for assignment",
    stack: "Stack",
    bet: "Bet",
    action: "Action",
    waiting: "Waiting",
    actionLog: "Action Log",
    recentActions: "Recent Actions",
    logCapHint: "Showing {shown} recent entries ({hidden} older entries hidden).",
    noActions: "No actions yet.",
    virtualAgent: "BOT",
    currentBet: "Current bet",
    chipChange: "Chip Changes",
    players: "Players",
    profit: "P&L",
    position: "Position",
    myPlayer: "My Player",
    loginToView: "Log in to see current status and leave controls when your player is seated here.",
    joinTable: "Join This Table",
    joiningTable: "Joining...",
    joinTableHint: "You are logged in. Seat your hosted player at this table and it will join from the next hand.",
    joinTableFailed: "Failed to join this table.",
    joinTableQueued: "Joined this table. Your player will enter on the next hand.",
    leaveTable: "Leave",
    leaveFailed: "Failed to leave table.",
    leaving: "Leaving...",
    loadingLogin: "Reading login status...",
    leaveSettled: "Left table and settled.",
    leaveNoPlayer: "No player needs to leave right now.",
    hostedAgent: "Hosted Agent",
    externalAgent: "Local Agent",
    spectatorMode: "Spectator mode",
    spectatorHint: "Spectator mode: you're not betting at this table. Watch AI decisions and reactions; log in to seat your player or coach.",
    spectatorCount: (count: number) => `${count} watching`,
    thinking: "Thinking",
    preparingHand: "Preparing cards",
    handWinners: "Hand Winners",
    wonChips: "Won chips",
    netChips: "Net",
    viewHandLog: "View this hand's log",
    handReview: "Recent Review",
    noHandSummaries: "No completed hand summaries yet.",
    noCommunity: "No community cards",
    handInsightTitle: "Hand Insight",
    handInsightMadeHand: "Made hand",
    handInsightBoard: "Board",
    handInsightDraws: "Draws",
    handInsightNone: "None",
    handInsightReasoning: "Decision",
    previousHandInsightTitle: "Previous hand insight",
    previousHandResult: "Your result",
    previousHandBoard: "Board",
    previousHandWinners: "Winners",
    previousHandNoBoard: "No board dealt",
    lastReasoning: "Latest reasoning",
    coachingTitle: "Next-hand coaching",
    coachingCollapse: "Collapse",
    coachingExpand: "Expand",
    coachingCollapsedSummary: "Coach your player for the next hand — expand to open the panel",
    coachingHint: "Advice is injected into your AI player prompt from the next hand.",
    coachingPlaceholder: "Example: tighten up after this hand and avoid marginal raises.",
    coachingSubmit: "Send coaching",
    coachingSubmitting: "Sending...",
    coachingAppliedFromHand: (handId: number) => `Active from hand #${handId}.`,
    coachingRecent: "Recent 3 coaching notes",
    coachingFailed: "Unable to send coaching.",
    noCoachingHistory: "No coaching notes yet.",
    coachingHistoryLoading: "Loading coaching notes…",
    coachingHistoryLoadFailed: "Couldn't load coaching history.",
    coachingStreakActive: "Active coach",
    coachingStreakProgress: (count: number, target: number) => `${count}/${target} active coach`,
    coachingMilestoneToast: (count: number) => `Coaching milestone: submission #${count}!`,
    coachingStreakMilestoneToast: "3 coaching submissions in 3 hands — Active coach unlocked!",
    coachingPending: (handId: number) => `Coaching pending · hand #${handId}`,
    coachingAppliedToast: "Your coaching is active this hand",
    leaveSettledToast: "Left the table and settled back to your balance",
    agentBustToast: (name: string) => `${name} busted out and this session was settled`,
    handWinPointsToast: (amount: number) => `This hand +${amount.toLocaleString()}`,
    accountPointsToast: (delta: number, dailyRank?: number) => {
      const signed = `${delta > 0 ? "+" : ""}${delta.toLocaleString()}`;
      return dailyRank ? `Lab points ${signed} · #${dailyRank} today` : `Lab points ${signed} updated`;
    },
    dailyRankToast: (rank: number) => `Your player moved up to #${rank} on today's board`,
    reactionTitle: "Spectator reactions",
    reactionShortcutHint: "Keys 1–8 for quick send",
    reactionRecentLabel: "Recent reactions",
    reactionRateLimited: "Too many reactions — please wait a moment",
    reactionSendFailed: "Could not send reaction",
    winBadge: "WIN",
    streamConnecting: "Connecting",
    streamLive: "Live",
    streamRecovering: "Reconnecting",
    myAgentOtherTable: (tableName: string) => `Your player is at "${tableName}"`,
    goToMyAgentTable: "Go to my player's table",
    tableFull: "This table is full.",
    tabLog: "Log",
    tabCoach: "Coach",
    tabInsight: "Insight",
    coachTabEmpty: "Log in and seat your player to send coaching here.",
    insightTabEmpty: "Hand strength insights appear after showdown.",
    insightTabWaiting: "Hand in progress — insights unlock at showdown.",
    copySpectatorShare: "Copy watch link",
    spectatorShareCopied: "Copied",
    sessionEndLeaveTitle: "Session settled",
    sessionEndBustTitle: "Your player busted out",
    sessionEndLeaveText: "Points are back in your balance. Play again or return to the lobby?",
    sessionEndBustText: "This session was settled. Start another table or browse the lobby.",
    playAgainCta: "Play again",
    backToLobbyCta: "Back to lobby",
    playAgainStarting: "Finding a table…",
  },
};

const initialStack = 1_000;
const actionOverlayVisibleMs = 3_000;

type WinnerReveal = {
  handId: number;
  winners: Array<{ amount: number; name: string; netAmount: number; playerId: string }>;
};

type ClubUser = {
  dailyProfitToday: number;
  id: string;
  name: string;
  pointsBalance: number;
};

type RemoteAgentTable = {
  id: string;
  name: string;
  url: string;
};

type SessionEndReason = "leave" | "bust";

export default function TableDetailPage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = use(params);
  const router = useRouter();
  const { language } = useLanguage();
  const t = copy[language];
  const [state, setState] = useState<GameSnapshot>();
  const [me, setMe] = useState<ClubUser | null>();
  const [controlStatus, setControlStatus] = useState<string>();
  const [controlStatusIsError, setControlStatusIsError] = useState(false);
  const [controlBusy, setControlBusy] = useState<"join" | "leave">();
  const [winnerReveal, setWinnerReveal] = useState<WinnerReveal>();
  const [winnerRevealSecondsLeft, setWinnerRevealSecondsLeft] = useState(0);
  const [highlightHandId, setHighlightHandId] = useState<number>();
  const [pendingCoachingHandId, setPendingCoachingHandId] = useState<number>();
  const [coachingStreakVersion, setCoachingStreakVersion] = useState(0);
  const [remoteAgentTable, setRemoteAgentTable] = useState<RemoteAgentTable | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [sessionEndReason, setSessionEndReason] = useState<SessionEndReason | null>(null);
  const [playAgainBusy, setPlayAgainBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const lastWinnerRevealHandIdRef = useRef<number | undefined>(undefined);
  const winnerRevealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const winnerRevealCountdownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastBustToastHandIdRef = useRef<number | undefined>(undefined);
  const lastCoachingToastHandIdRef = useRef<number | undefined>(undefined);
  const sessionStartedAtRef = useRef<number>(0);
  const sessionStartHandIdRef = useRef<number>(0);
  const lastSeenHandIdRef = useRef<number>(0);
  const players = state?.players ?? [];
  const myPlayer = me ? players.find((player) => player.ownerUserId === me.id) : undefined;
  const myAgentRemoteTable = me && !myPlayer ? remoteAgentTable : null;
  const tableIsFull = players.length >= 6;
  const canJoinThisTable = Boolean(me && !myPlayer && !tableIsFull);
  const myPlayerSeatIndex = myPlayer ? players.findIndex((player) => player.id === myPlayer.id) : -1;
  const activePlayer = players.find((player) => player.id === state?.currentPlayerId);
  const waitingForFirstDeal = Boolean(state?.running && state.handId === 0 && players.length >= 2 && players.every((player) => (player.holeCards?.length ?? 0) === 0));
  const streetActions = currentStreetActions(state);
  const actionOverlays = currentActionOverlays(state, nowMs);
  const handWinners = winnerReveal?.winners ?? [];
  const winningPlayerIds = new Set(handWinners.map((winner) => winner.playerId));

  useTableSounds(state, {
    enableMyAgentDeciding: Boolean(me?.id),
    myAgentOwnerUserId: me?.id,
  });

  const pointsToastCopy = useMemo(
    () => ({
      accountPointsToast: t.accountPointsToast,
      dailyRankToast: t.dailyRankToast,
      handWinPointsToast: t.handWinPointsToast,
    }),
    [t],
  );

  const handleMePointsUpdate = useCallback((user: Pick<ClubUser, "dailyProfitToday" | "id" | "pointsBalance">) => {
    setMe((previous) => (previous ? { ...previous, ...user } : previous));
  }, []);

  useSpectatorPointsToast({
    copy: pointsToastCopy,
    handId: winnerReveal?.handId ?? state?.handId,
    handWinners,
    me,
    myPlayerId: myPlayer?.id,
    onMeUpdate: handleMePointsUpdate,
    tableId,
  });

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

  const revealWinnersForSnapshot = useCallback((snapshot: GameSnapshot) => {
    if (snapshot.handId === lastWinnerRevealHandIdRef.current) {
      return;
    }

    const winners = handWinnerSummaries(snapshot);
    if (winners.length === 0) {
      return;
    }

    lastWinnerRevealHandIdRef.current = snapshot.handId;
    setWinnerReveal({ handId: snapshot.handId, winners });
    setWinnerRevealSecondsLeft(5);
    clearWinnerRevealTimers();
    winnerRevealCountdownRef.current = setInterval(() => {
      setWinnerRevealSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1_000);
    winnerRevealTimerRef.current = setTimeout(() => {
      setWinnerReveal(undefined);
      setWinnerRevealSecondsLeft(0);
      clearWinnerRevealTimers();
      winnerRevealTimerRef.current = undefined;
    }, 5_000);
  }, [clearWinnerRevealTimers]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return connectReconnectingEventSource({
      url: withBasePath(`/api/tables/${tableId}/events`),
      onSnapshot: (data) => {
        const incoming = JSON.parse(data) as SlimGameSnapshotForSse;
        setState((previous) => {
          const merged = mergeGameSnapshotForSse(previous, incoming);
          revealWinnersForSnapshot(merged);
          return merged;
        });
      },
      onRecover: async () => {
        const response = await fetch(withBasePath(`/api/tables/${tableId}/state`), { cache: "no-store" });
        if (response.ok) {
          const nextState = (await response.json()) as GameSnapshot;
          setState(nextState);
          revealWinnersForSnapshot(nextState);
        }
      },
    });
  }, [revealWinnersForSnapshot, tableId]);

  useEffect(() => {
    const tableName = state?.tableName;
    if (!tableName) {
      return;
    }
    recordRecentSpectate(tableId, tableName);
  }, [state?.tableName, tableId]);

  useEffect(() => {
    sessionStartedAtRef.current = Date.now();
    sessionStartHandIdRef.current = 0;
    lastSeenHandIdRef.current = 0;
  }, [tableId]);

  useEffect(() => {
    const startedAt = sessionStartedAtRef.current;
    return () => {
      trackEngagement({
        at: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        handsSeen: Math.max(0, lastSeenHandIdRef.current - sessionStartHandIdRef.current),
        name: "engagement.spectator.session_end",
        tableId,
      });
    };
  }, [tableId]);

  useEffect(() => {
    const handId = state?.handId ?? 0;
    if (handId <= 0) {
      return;
    }
    if (sessionStartHandIdRef.current === 0) {
      sessionStartHandIdRef.current = handId;
    }
    lastSeenHandIdRef.current = Math.max(lastSeenHandIdRef.current, handId);

    const before = getDailyTasksProgress();
    recordDailySpectatedHand(tableId, handId);
    const after = getDailyTasksProgress();
    if (after.complete && !before.complete) {
      trackEngagement({
        at: new Date().toISOString(),
        name: "engagement.daily_tasks.complete",
      });
      pushEngagementToast({
        expiresMs: 6500,
        id: `daily-tasks-complete-${tableId}-${handId}`,
        kind: "coaching",
        message: DAILY_TASKS_COMPLETE_COPY[language],
      });
    }
  }, [language, state?.handId, tableId]);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      const response = await fetch(withBasePath("/api/users/me"), { cache: "no-store" });
      if (cancelled) {
        return;
      }
      if (!response.ok) {
        setMe(null);
        return;
      }
      const payload = await response.json();
      setMe(payload.user ?? null);
    }

    void loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!me || myPlayer) {
      return;
    }

    let cancelled = false;
    async function loadRemoteAgentTable() {
      const response = await fetch(withBasePath("/api/users/me/agent"), { cache: "no-store" });
      if (!response.ok || cancelled) {
        return;
      }

      const payload = await response.json();
      const remoteId = payload.agentProfile?.table?.id ?? payload.hostedAgent?.agent?.tableId;
      if (!remoteId || remoteId === tableId) {
        if (!cancelled) {
          setRemoteAgentTable(null);
        }
        return;
      }

      if (!cancelled) {
        setRemoteAgentTable({
          id: remoteId,
          name: payload.agentProfile?.table?.name ?? remoteId,
          url: payload.agentProfile?.table?.url ?? `/tables/${encodeURIComponent(remoteId)}`,
        });
      }
    }

    void loadRemoteAgentTable();
    return () => {
      cancelled = true;
    };
  }, [me, myPlayer, tableId]);

  useEffect(() => {
    return () => {
      if (winnerRevealTimerRef.current) {
        clearTimeout(winnerRevealTimerRef.current);
      }
      if (winnerRevealCountdownRef.current) {
        clearInterval(winnerRevealCountdownRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!myPlayer || myPlayer.stack > 0 || myPlayer.status !== "out") {
      return;
    }
    const handId = state?.handId ?? 0;
    if (handId <= 0 || lastBustToastHandIdRef.current === handId) {
      return;
    }
    lastBustToastHandIdRef.current = handId;
    resetCoachingStreak(tableId);
    setCoachingStreakVersion((version) => version + 1);
    pushEngagementToast({
      kind: "bust",
      message: t.agentBustToast(myPlayer.name),
      expiresMs: 8000,
      id: `agent-bust-${tableId}-${handId}`,
    });
    setSessionEndReason("bust");
  }, [myPlayer, state?.handId, t, tableId]);

  useEffect(() => {
    if (pendingCoachingHandId === undefined) {
      return;
    }
    const currentHandId = state?.handId ?? 0;
    if (currentHandId < pendingCoachingHandId || lastCoachingToastHandIdRef.current === currentHandId) {
      return;
    }
    lastCoachingToastHandIdRef.current = currentHandId;
    pushEngagementToast({
      kind: "coaching",
      message: t.coachingAppliedToast,
      expiresMs: 5000,
      id: `coaching-applied-${tableId}-${currentHandId}`,
    });
  }, [pendingCoachingHandId, state?.handId, tableId, t]);

  async function refreshTableState() {
    const response = await fetch(withBasePath(`/api/tables/${tableId}/state`), { cache: "no-store" });
    if (response.ok) {
      const nextState = (await response.json()) as GameSnapshot;
      setState(nextState);
      revealWinnersForSnapshot(nextState);
    }
  }

  async function leaveMyPlayer() {
    if (!myPlayer || !window.confirm(t.leaveTable)) {
      return;
    }

    setControlBusy("leave");
    setControlStatus(undefined);
    setControlStatusIsError(false);
    try {
      const response = await fetch(withBasePath("/api/users/me/agent/leave"), {
        body: JSON.stringify({ tableId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        setControlStatus(payload.error ?? t.leaveFailed);
        setControlStatusIsError(true);
        return;
      }
      setControlStatus(payload.removed ? t.leaveSettled : t.leaveNoPlayer);
      if (payload.removed) {
        pushEngagementToast({
          kind: "settled",
          message: t.leaveSettledToast,
          expiresMs: 5000,
          id: `leave-settled-${tableId}`,
        });
        setSessionEndReason("leave");
      }
      await refreshTableState();
    } finally {
      setControlBusy(undefined);
    }
  }

  function scrollToHandLogs() {
    const handId = winnerReveal?.handId ?? state?.handId;
    if (handId !== undefined) {
      setHighlightHandId(handId);
    }
    sessionStorage.setItem(`spectator-side-tab:${tableId}`, "log");
    window.dispatchEvent(new Event("spectator-side-tab"));
    document.getElementById("hand-action-logs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    setWinnerReveal(undefined);
    setWinnerRevealSecondsLeft(0);
    clearWinnerRevealTimers();
  }

  async function joinThisTable() {
    setControlBusy("join");
    setControlStatus(undefined);
    setControlStatusIsError(false);
    try {
      const response = await fetch(withBasePath(`/api/tables/${tableId}/join`), { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setControlStatus(payload.error ?? t.joinTableFailed);
        setControlStatusIsError(true);
        return;
      }
      setControlStatus(t.joinTableQueued);
      await refreshTableState();
    } finally {
      setControlBusy(undefined);
    }
  }

  const showCoachingPending =
    pendingCoachingHandId !== undefined && (state?.handId ?? 0) < pendingCoachingHandId;

  const previousHandInsight = myPlayer
    ? latestCompletedHandInsight(state?.handSummaries ?? [], myPlayer.id)
    : undefined;
  const showHandInsight = Boolean(previousHandInsight);

  const spectatorShareText = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    const url = window.location.href;
    const name = state?.tableName ?? tableId;
    return language === "zh"
      ? `来 AI Poker Lab 观战「${name}」：${url}`
      : `Watch "${name}" live on AI Poker Lab: ${url}`;
  }, [language, state?.tableName, tableId]);

  async function copySpectatorShare() {
    if (!spectatorShareText || !navigator.clipboard?.writeText) {
      return;
    }
    await navigator.clipboard.writeText(spectatorShareText);
    recordQuestShareComplete();
    setShareCopied(true);
    trackEngagement({
      at: new Date().toISOString(),
      name: "engagement.share.copy",
      agentId: `spectator:${tableId}`,
    });
    window.setTimeout(() => setShareCopied(false), 2000);
  }

  async function playAgainAfterSettlement() {
    if (!sessionEndReason) {
      return;
    }
    trackEngagement({
      at: new Date().toISOString(),
      name: "engagement.settlement.play_again",
      reason: sessionEndReason,
      tableId,
    });
    setSessionEndReason(null);
    setPlayAgainBusy(true);
    try {
      const response = await fetch(withBasePath("/api/users/quick-play"), {
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      const tableUrl =
        (typeof payload.tableUrl === "string" && payload.tableUrl) ||
        (typeof payload.tableId === "string" ? `/tables/${encodeURIComponent(payload.tableId)}` : "/tables");
      if (response.ok) {
        trackEngagement({
          at: new Date().toISOString(),
          name: "engagement.quick_play.success",
          tableId: payload.tableId ?? undefined,
        });
        recordQuestQuickPlayComplete();
      }
      router.push(tableUrl);
    } catch {
      router.push("/tables");
    } finally {
      setPlayAgainBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <LazyEngagementToastStack />
      <section className={styles.header}>
        <div className={styles.mobileHeaderMain}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1>{state?.tableName ?? tableId}</h1>
        </div>
        <div className={styles.headerActions}>
          <Link aria-label={t.backLobby} className={styles.headerNavAction} href="/tables" title={t.backLobby}>
            <HeaderActionIcon type="back" />
          </Link>
          {myPlayer ? (
            <button
              aria-label={controlBusy === "leave" ? t.leaving : t.leaveTable}
              className={styles.navLeaveAction}
              disabled={controlBusy === "leave"}
              title={controlBusy === "leave" ? t.leaving : t.leaveTable}
              type="button"
              onClick={() => void leaveMyPlayer()}
            >
              <HeaderActionIcon type="leave" />
            </button>
          ) : null}
          <button
            aria-label={shareCopied ? t.spectatorShareCopied : t.copySpectatorShare}
            className={styles.shareCopyAction}
            title={shareCopied ? t.spectatorShareCopied : t.copySpectatorShare}
            type="button"
            onClick={() => void copySpectatorShare()}
          >
            <HeaderActionIcon type={shareCopied ? "check" : "share"} />
          </button>
          <SoundToggle className={styles.headerSoundAction} />
        </div>
      </section>

      <section className={styles.layout}>
        <div className={styles.tableArea}>
          <div className={styles.table}>
            <div className={styles.tableCenter}>
              <div className={styles.centerStats}>
                <span className={styles.phase}>{state?.phase ?? "preflop"}</span>
                <span className={styles.centerPot}>
                  {t.pot} <AnimatedPotValue value={state?.pot ?? 0} />
                </span>
              </div>
              <div className={styles.cards}>
                {state?.communityCards.length ? (
                  state.communityCards.map((card, index) => <PlayingCard card={card} key={`${card.rank}${card.suit}${index}`} />)
                ) : (
                  <span className={styles.emptyCards}>{waitingForFirstDeal ? t.preparingHand : t.waitingCommunity}</span>
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
                    subtitle={t.waitingAssign}
                    title={t.emptySeat}
                  />
                );
              }

              return (
                <TablePlayerSeat
                  actionOverlay={actionOverlays.get(player.id)}
                  copy={{ profit: t.profit, stack: t.stack, virtualAgent: t.virtualAgent, winBadge: t.winBadge }}
                  isCurrent={player.id === state?.currentPlayerId}
                  isMine={player.ownerUserId === me?.id}
                  isWinning={winningPlayerIds.has(player.id)}
                  key={player.id}
                  player={player}
                  position={seatPositionLabel(index, state?.dealerIndex ?? 0, players.length)}
                  profitDelta={player.stack - initialStack}
                  seatStyle={seatStyle}
                  showProfileLink
                  showReasoning={player.ownerUserId === me?.id && Boolean(player.lastReasoning)}
                  streetAction={streetActions.get(player.id) ?? (player.id === state?.currentPlayerId ? t.thinking : t.waiting)}
                />
              );
            })}
            <TableMomentOverlay
              countdownLabel={
                winnerRevealSecondsLeft > 0
                  ? (language === "zh" ? `下一手倒计时 ${winnerRevealSecondsLeft}s` : `Next hand in ${winnerRevealSecondsLeft}s`)
                  : undefined
              }
              countdownSeconds={winnerRevealSecondsLeft}
              eyebrow={t.handWinners}
              handId={winnerReveal?.handId ?? state?.handId ?? 0}
              handLabel={t.hand}
              open={handWinners.length > 0}
              variant="handWin"
              viewLogLabel={t.viewHandLog}
              winners={handWinners.map((winner) => ({
                amount: winner.amount,
                name: winner.name,
                netAmount: winner.netAmount,
                netChipsLabel: t.netChips,
                playerId: winner.playerId,
                wonChipsLabel: t.wonChips,
              }))}
              onViewLog={scrollToHandLogs}
            />
          </div>
          <div className={styles.tableInfoBar}>
            <span>
              {t.pot} <AnimatedPotValue value={state?.pot ?? 0} />
            </span>
            <span>{t.hand} #{state?.handId ?? 0}</span>
            <span>{t.currentBet} {state?.currentBet ?? 0}</span>
            <span>{waitingForFirstDeal ? t.preparingHand : activePlayer ? `${activePlayer.name} ${t.thinking}` : t.spectatorMode}</span>
          </div>
          <LazyReactionBar
            copy={{
              rateLimited: t.reactionRateLimited,
              recentLabel: t.reactionRecentLabel,
              sendFailed: t.reactionSendFailed,
              shortcutHint: t.reactionShortcutHint,
              title: t.reactionTitle,
            }}
            recentReactions={state?.recentReactions}
            tableId={tableId}
          />
        </div>

        <aside className={styles.sidePanel}>
          {!myPlayer && state ? (
            <p className={styles.spectatorBanner} {...liveRegionProps("status")}>
              {t.spectatorHint}
            </p>
          ) : null}
          <section className={`${styles.panel} ${myPlayer ? styles.myPlayerPanel : ""}`}>
            <h2>{t.myPlayer}</h2>
            {myPlayer ? (
              <>
                {controlStatus ? (
                  controlStatusIsError ? (
                    <FormFieldError message={controlStatus} />
                  ) : (
                    <FormFieldHint message={controlStatus} />
                  )
                ) : null}
                <div className={styles.myPlayerSummary}>
                  <div>
                    <strong>{myPlayer.name}</strong>
                    <span>{myPlayer.kind === "hosted" ? t.hostedAgent : t.externalAgent}</span>
                  </div>
                  <em className={seatDeltaClassName(myPlayer.stack - initialStack)}>{formatSeatDelta(myPlayer.stack - initialStack)}</em>
                </div>
                {showCoachingPending ? (
                  <span className={styles.coachingPendingBadge} {...liveRegionProps("status")}>
                    {t.coachingPending(pendingCoachingHandId!)}
                  </span>
                ) : null}
                <div className={styles.myPlayerStats}>
                  <span>{t.stack} {myPlayer.stack}</span>
                  <span>{t.bet} {myPlayer.currentBet}</span>
                  <span>{t.action} {myPlayer.lastAction ?? t.waiting}</span>
                  <span>{myPlayer.id === state?.currentPlayerId ? t.thinking : myPlayer.status}</span>
                </div>
                {myPlayer.lastReasoning ? (
                  <div className={styles.reasoningBlock}>
                    <strong>{t.lastReasoning}</strong>
                    <p>{myPlayer.lastReasoning}</p>
                  </div>
                ) : null}
              </>
            ) : canJoinThisTable ? (
              <>
                <p className={styles.muted}>{t.joinTableHint}</p>
                {controlStatus ? (
                  controlStatusIsError ? (
                    <FormFieldError message={controlStatus} />
                  ) : (
                    <FormFieldHint message={controlStatus} />
                  )
                ) : null}
                <button disabled={controlBusy === "join"} type="button" onClick={() => void joinThisTable()}>
                  {controlBusy === "join" ? t.joiningTable : t.joinTable}
                </button>
              </>
            ) : myAgentRemoteTable ? (
              <>
                <p className={styles.muted}>{t.myAgentOtherTable(myAgentRemoteTable.name)}</p>
                <Link className={styles.remoteAgentTableLink} href={`/tables/${encodeURIComponent(myAgentRemoteTable.id)}`}>
                  {t.goToMyAgentTable}
                </Link>
              </>
            ) : me && tableIsFull ? (
              <p className={styles.muted}>{t.tableFull}</p>
            ) : (
              <p className={styles.muted}>{me === undefined ? t.loadingLogin : t.loginToView}</p>
            )}
          </section>

          <SpectatorSideTabs
            coachAvailable={Boolean(myPlayer)}
            coachPanel={
              myPlayer ? (
                <CoachDock
                  agentId={myPlayer.id}
                  coachingStreakVersion={coachingStreakVersion}
                  copy={{
                    appliedFromHand: t.coachingAppliedFromHand,
                    coachingHistoryLoadFailed: t.coachingHistoryLoadFailed,
                    coachingHistoryLoading: t.coachingHistoryLoading,
                    coachingStreakActive: t.coachingStreakActive,
                    coachingStreakProgress: t.coachingStreakProgress,
                    coachingMilestoneToast: t.coachingMilestoneToast,
                    coachingStreakMilestoneToast: t.coachingStreakMilestoneToast,
                    collapsedSummary: t.coachingCollapsedSummary,
                    collapse: t.coachingCollapse,
                    expand: t.coachingExpand,
                    failed: t.coachingFailed,
                    hint: t.coachingHint,
                    loginRequired: t.loginToView,
                    noCoachingHistory: t.noCoachingHistory,
                    placeholder: t.coachingPlaceholder,
                    recentTitle: t.coachingRecent,
                    submit: t.coachingSubmit,
                    submitting: t.coachingSubmitting,
                    title: t.coachingTitle,
                  }}
                  currentHandId={state?.handId ?? 0}
                  tableId={tableId}
                  onCoachingApplied={setPendingCoachingHandId}
                />
              ) : (
                <p className={styles.muted}>{t.coachTabEmpty}</p>
              )
            }
            copy={{ tabCoach: t.tabCoach, tabInsight: t.tabInsight, tabLog: t.tabLog }}
            insightPanel={
              previousHandInsight && myPlayer ? (
                <PreviousHandInsightPanel
                  copy={{
                    board: t.previousHandBoard,
                    hand: t.hand,
                    noBoard: t.previousHandNoBoard,
                    result: t.previousHandResult,
                    title: t.previousHandInsightTitle,
                    winners: t.previousHandWinners,
                  }}
                  insight={previousHandInsight}
                  language={language}
                />
              ) : (
                <p className={styles.muted}>{t.insightTabEmpty}</p>
              )
            }
            insightReady={showHandInsight}
            logPanel={
              <>
                <LazySpectatorActionLogList
                  copy={{
                    logCapHint: t.logCapHint,
                    noActions: t.noActions,
                    recentActions: t.recentActions,
                  }}
                  highlightHandId={highlightHandId}
                  logs={state?.logs ?? []}
                  myPlayerName={myPlayer?.name}
                />

                <LazyHandReviewList
                  copy={{
                    hand: t.hand,
                    handReview: t.handReview,
                    noCommunity: t.noCommunity,
                    noHandSummaries: t.noHandSummaries,
                  }}
                  language={language}
                  myPlayerId={myPlayer?.id}
                  summaries={state?.handSummaries ?? []}
                />

                <section className={styles.panel}>
                  <h2>{t.chipChange}</h2>
                  <div className={styles.chipBoard}>
                    {players.map((player) => {
                      const delta = player.stack - initialStack;
                      return (
                        <article className={styles.chipRow} key={player.id}>
                          <div>
                            <Link className={styles.playerProfileLink} href={`/agents/${encodeURIComponent(player.id)}`}>
                              {player.name}
                            </Link>
                            <small>{player.kind === "virtual" ? t.virtualAgent : player.status}</small>
                          </div>
                          <span>{player.stack}</span>
                          <em className={seatDeltaClassName(delta)}>{formatSeatDelta(delta)}</em>
                        </article>
                      );
                    })}
                    {players.length === 0 && <p className={styles.muted}>{t.noActions}</p>}
                  </div>
                </section>
              </>
            }
            tableId={tableId}
          />
        </aside>
      </section>
      <TableMomentOverlay
        description={sessionEndReason === "bust" ? t.sessionEndBustText : t.sessionEndLeaveText}
        eyebrow={sessionEndReason === "bust" ? t.sessionEndBustTitle : t.sessionEndLeaveTitle}
        open={Boolean(sessionEndReason)}
        primaryBusy={playAgainBusy}
        primaryLabel={playAgainBusy ? t.playAgainStarting : t.playAgainCta}
        secondaryHref="/tables"
        secondaryLabel={t.backToLobbyCta}
        title={sessionEndReason === "bust" ? t.sessionEndBustTitle : t.sessionEndLeaveTitle}
        variant="sessionEnd"
        onPrimary={() => void playAgainAfterSettlement()}
        onSecondaryClick={() => {
          if (sessionEndReason) {
            trackEngagement({
              at: new Date().toISOString(),
              name: "engagement.settlement.back_lobby",
              reason: sessionEndReason,
              tableId,
            });
          }
          setSessionEndReason(null);
        }}
      />
    </main>
  );
}

function HeaderActionIcon({ type }: { type: "back" | "check" | "leave" | "share" }) {
  if (type === "back") {
    return (
      <svg aria-hidden="true" className={styles.headerActionIcon} viewBox="0 0 24 24">
        <path d="M10.8 5.2 4 12l6.8 6.8 1.6-1.6L8.3 13H20v-2H8.3l4.1-4.2z" />
      </svg>
    );
  }
  if (type === "leave") {
    return (
      <svg aria-hidden="true" className={styles.headerActionIcon} viewBox="0 0 24 24">
        <path d="M5 4h8.8v2H7v12h6.8v2H5z" />
        <path d="m15.6 8.2 3.8 3.8-3.8 3.8-1.4-1.4 1.4-1.4H10v-2h5.6l-1.4-1.4z" />
      </svg>
    );
  }
  if (type === "check") {
    return (
      <svg aria-hidden="true" className={styles.headerActionIcon} viewBox="0 0 24 24">
        <path d="m9.3 16.6-4-4 1.5-1.5 2.5 2.5 7.9-7.9 1.5 1.5z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className={styles.headerActionIcon} viewBox="0 0 24 24">
      <path d="M9 7.5a3 3 0 1 1 .8 2.1l-2.1 1.2a3.2 3.2 0 0 1 0 2.4l2.1 1.2a3 3 0 1 1-1 1.8l-2.1-1.2a3 3 0 1 1 0-6l2.1-1.2A3 3 0 0 1 9 7.5" />
    </svg>
  );
}

type PreviousHandInsight = {
  hero: AgentHandSummary["players"][number];
  heroWinner?: AgentHandSummary["winners"][number];
  summary: AgentHandSummary;
};

function latestCompletedHandInsight(summaries: AgentHandSummary[], playerId: string): PreviousHandInsight | undefined {
  for (const summary of summaries) {
    const hero = summary.players.find((player) => player.playerId === playerId);
    if (!hero) {
      continue;
    }
    return {
      hero,
      heroWinner: summary.winners.find((winner) => winner.playerId === playerId),
      summary,
    };
  }
  return undefined;
}

function PreviousHandInsightPanel({
  copy,
  insight,
  language,
}: {
  copy: {
    board: string;
    hand: string;
    noBoard: string;
    result: string;
    title: string;
    winners: string;
  };
  insight: PreviousHandInsight;
  language: "en" | "zh";
}) {
  const { hero, heroWinner, summary } = insight;
  const resultText = heroWinner
    ? `${copy.winners} +${heroWinner.amount.toLocaleString()} · ${formatHandLabel(heroWinner.handLabel, language)}`
    : formatSeatDelta(hero.netChips);

  return (
    <section className={`${styles.panel} ${styles.handInsightPanel}`}>
      <h2>{copy.title}</h2>
      <p className={styles.muted}>
        {hero.name} · {copy.hand} #{summary.handId}
      </p>
      <dl className={styles.handInsightList}>
        <div>
          <dt>{copy.result}</dt>
          <dd className={seatDeltaClassName(hero.netChips)}>{resultText}</dd>
        </div>
        <div>
          <dt>{copy.board}</dt>
          <dd>
            {summary.communityCards.length > 0 ? (
              <span className={styles.previousHandCards}>
                {summary.communityCards.map((card, index) => (
                  <PlayingCard card={card} key={`${summary.handId}-${card.rank}${card.suit}-${index}`} small />
                ))}
              </span>
            ) : (
              copy.noBoard
            )}
          </dd>
        </div>
        <div>
          <dt>{copy.winners}</dt>
          <dd>
            {summary.winners.map((winner) => (
              <span className={styles.previousHandWinner} key={`${summary.handId}-${winner.playerId}`}>
                {winner.name} +{winner.amount.toLocaleString()}
                {winner.handLabel ? ` · ${formatHandLabel(winner.handLabel, language)}` : ""}
              </span>
            ))}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function formatHandLabel(label: string | undefined, language: "en" | "zh") {
  if (!label) {
    return language === "zh" ? "未摊牌获胜" : "won without showdown";
  }
  const zh: Record<string, string> = {
    flush: "同花",
    "four of a kind": "四条",
    "full house": "葫芦",
    "high card": "高牌",
    pair: "一对",
    straight: "顺子",
    "straight flush": "同花顺",
    "three of a kind": "三条",
    "two pair": "两对",
    "all opponents folded": "其他玩家弃牌",
  };
  return language === "zh" ? (zh[label] ?? label) : label;
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

function currentActionOverlays(state: GameSnapshot | undefined, nowMs: number) {
  const actions = new Map<string, string>();
  if (!state) {
    return actions;
  }

  for (const item of state.actionHistory) {
    if (item.handId !== state.handId || item.round !== state.phase || item.action === "deal" || item.action === "win") {
      continue;
    }
    const createdAtMs = new Date(item.createdAt).getTime();
    if (!Number.isFinite(createdAtMs) || nowMs - createdAtMs > actionOverlayVisibleMs) {
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

  const committedByPlayerId = new Map(state.players.map((player) => [player.id, player.totalCommitted]));
  const winners = new Map<string, { amount: number; name: string; netAmount: number; playerId: string }>();
  for (const item of state.actionHistory) {
    if (item.handId !== state.handId || item.action !== "win") {
      continue;
    }
    const current = winners.get(item.playerId);
    const amount = (current?.amount ?? 0) + (item.amount ?? 0);
    winners.set(item.playerId, {
      amount,
      name: item.playerName,
      netAmount: amount - (committedByPlayerId.get(item.playerId) ?? 0),
      playerId: item.playerId,
    });
  }

  return [...winners.values()].sort((left, right) => right.netAmount - left.netAmount || right.amount - left.amount);
}

function formatStreetAction(item: GameSnapshot["actionHistory"][number]) {
  if (item.action === "post-blind") {
    return item.amount ? `blind ${item.amount}` : "blind";
  }
  if (item.action === "call") {
    return item.amount ? `Call ${item.amount}` : "Call";
  }
  if (item.action === "raise") {
    return item.amount ? `Raise +${item.amount}` : "Raise";
  }
  if (item.action === "bet") {
    return item.targetBet ? `Bet ${item.targetBet}` : item.amount ? `Bet ${item.amount}` : "Bet";
  }
  if (item.action === "check") {
    return "Check";
  }
  if (item.action === "fold") {
    return "Fold";
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
