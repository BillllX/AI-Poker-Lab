import { useEffect, useRef } from "react";
import { withBasePath } from "@/lib/client/basePath";
import { pushEngagementToast } from "@/lib/client/engagementToast";
import { trackEngagement } from "@/lib/client/engagementAnalytics";

export type PointsWatcherUser = {
  dailyProfitToday: number;
  id: string;
  pointsBalance: number;
};

type PointsToastCopy = {
  accountPointsToast: (delta: number, dailyRank?: number) => string;
  dailyRankToast: (rank: number) => string;
  handWinPointsToast: (amount: number) => string;
};

type HandWinner = { amount: number; playerId: string };

type UseSpectatorPointsToastOptions = {
  copy: PointsToastCopy;
  handId?: number;
  handWinners: HandWinner[];
  me?: PointsWatcherUser | null;
  myPlayerId?: string;
  onMeUpdate: (user: PointsWatcherUser) => void;
  tableId: string;
};

export function useSpectatorPointsToast({
  copy,
  handId,
  handWinners,
  me,
  myPlayerId,
  onMeUpdate,
  tableId,
}: UseSpectatorPointsToastOptions) {
  const lastHandWinToastHandIdRef = useRef<number | undefined>(undefined);
  const lastAccountBalanceRef = useRef<number | undefined>(undefined);
  const lastDailyRankRef = useRef<number | undefined>(undefined);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    if (me) {
      lastAccountBalanceRef.current = me.pointsBalance;
    }
  }, [me?.id, me?.pointsBalance]);

  useEffect(() => {
    if (!myPlayerId || !handId || handId <= 0 || handWinners.length === 0) {
      return;
    }
    if (lastHandWinToastHandIdRef.current === handId) {
      return;
    }

    const myWin = handWinners.find((winner) => winner.playerId === myPlayerId);
    if (!myWin || myWin.amount <= 0) {
      return;
    }

    lastHandWinToastHandIdRef.current = handId;
    pushEngagementToast({
      kind: "points",
      message: copy.handWinPointsToast(myWin.amount),
      expiresMs: 4_500,
      id: `hand-win-${tableId}-${handId}-${myPlayerId}`,
    });
    trackEngagement({
      at: new Date().toISOString(),
      delta: myWin.amount,
      handId,
      kind: "hand_win",
      name: "engagement.points_delta_seen",
      tableId,
    });
  }, [copy, handId, handWinners, myPlayerId, tableId]);

  useEffect(() => {
    if (!me || !myPlayerId || handId === undefined || handId <= 0) {
      return;
    }

    let cancelled = false;
    const baselineBalance = me.pointsBalance;
    const settledHandId = handId;

    async function refreshAccountPoints() {
      if (refreshInFlightRef.current) {
        return;
      }
      refreshInFlightRef.current = true;

      try {
        const [meResponse, rankResponse] = await Promise.all([
          fetch(withBasePath("/api/users/me"), { cache: "no-store" }),
          fetch(withBasePath("/api/users/me/rank?sort=daily"), { cache: "no-store" }),
        ]);
        if (cancelled || !meResponse.ok) {
          return;
        }

        const mePayload = (await meResponse.json()) as { user?: PointsWatcherUser };
        const nextUser = mePayload.user;
        if (!nextUser) {
          return;
        }

        const previousBalance = lastAccountBalanceRef.current ?? baselineBalance;
        const delta = nextUser.pointsBalance - previousBalance;
        const rankPayload = rankResponse.ok
          ? ((await rankResponse.json()) as { rank?: number | null })
          : { rank: null };
        const dailyRank = typeof rankPayload.rank === "number" ? rankPayload.rank : undefined;

        if (delta !== 0) {
          pushEngagementToast({
            kind: "points",
            message: copy.accountPointsToast(delta, dailyRank),
            expiresMs: 6_500,
            id: `account-points-${tableId}-${settledHandId}-${nextUser.id}`,
          });
          trackEngagement({
            at: new Date().toISOString(),
            delta,
            dailyRank,
            handId: settledHandId,
            kind: "account_balance",
            name: "engagement.points_delta_seen",
            tableId,
          });
        } else if (
          dailyRank !== undefined &&
          lastDailyRankRef.current !== undefined &&
          dailyRank < lastDailyRankRef.current
        ) {
          pushEngagementToast({
            kind: "rank",
            message: copy.dailyRankToast(dailyRank),
            expiresMs: 5_000,
            id: `daily-rank-${tableId}-${settledHandId}-${nextUser.id}-${dailyRank}`,
          });
          trackEngagement({
            at: new Date().toISOString(),
            dailyRank,
            handId: settledHandId,
            kind: "daily_rank",
            name: "engagement.points_delta_seen",
            tableId,
          });
        }

        lastAccountBalanceRef.current = nextUser.pointsBalance;
        if (dailyRank !== undefined) {
          lastDailyRankRef.current = dailyRank;
        }
        onMeUpdate(nextUser);
      } finally {
        refreshInFlightRef.current = false;
      }
    }

    void refreshAccountPoints();
    return () => {
      cancelled = true;
    };
  }, [copy, handId, me, onMeUpdate, tableId]);
}
