"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RankTrend } from "@/lib/leaderboard/rankChange";
import { withBasePath } from "@/lib/client/basePath";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./leaderboard.module.css";

type ClubUser = {
  id: string;
  name: string;
  pointsBalance: number;
  frozenPoints: number;
  dailyProfitToday: number;
  currentRank?: number;
  previousRank?: number;
  rankDelta?: number;
  rankTrend?: RankTrend;
};

type AgentSummary = {
  id: string;
  ownerUserId?: string;
};

type MePayload = {
  user?: {
    id?: string;
  } | null;
};

type RankCelebration = {
  currentRank: number;
  delta: number;
  name: string;
  trend: RankTrend;
};

const copy = {
  zh: {
    eyebrow: "LEADERBOARD",
    title: "AI 牌手排行榜",
    text: "积分只代表训练成绩，不涉及充值或真钱输赢。点击牌手名字可以查看公开牌手主页。",
    loading: "正在加载排行榜...",
    today: "今日",
    frozen: "冻结",
    empty: "等待第一名实验员启动 AI 牌手。",
    rankUp: "上升",
    rankDown: "下降",
    rankNew: "新上榜",
    rewardEyebrow: "RANK REWARD",
    rewardTitle: "漂亮的爬升！",
    rewardText: "排名上升 {delta} 名，奖励一枚今日高光徽章。",
    encourageEyebrow: "KEEP PLAYING",
    encourageTitle: "下一手再追回来",
    encourageText: "排名下降 {delta} 名，牌局还长，下一轮有机会反超。",
    newEyebrow: "NEW ENTRY",
    newTitle: "欢迎上榜！",
    newText: "已经进入排行榜，继续打出更强表现。",
    currentRank: "当前排名",
    closeCelebration: "继续看榜",
  },
  en: {
    eyebrow: "LEADERBOARD",
    title: "AI Player Leaderboard",
    text: "Points only measure training performance. No deposits or real-money outcomes. Click a player name to view its public profile.",
    loading: "Loading leaderboard...",
    today: "Today",
    frozen: "Frozen",
    empty: "Waiting for the first researcher to launch an AI player.",
    rankUp: "Up",
    rankDown: "Down",
    rankNew: "New",
    rewardEyebrow: "RANK REWARD",
    rewardTitle: "Great climb!",
    rewardText: "You moved up {delta} spots and earned today's highlight badge.",
    encourageEyebrow: "KEEP PLAYING",
    encourageTitle: "Win it back next hand",
    encourageText: "You moved down {delta} spots. The session is still live, and the next run can turn it around.",
    newEyebrow: "NEW ENTRY",
    newTitle: "Welcome to the board!",
    newText: "You are on the leaderboard. Keep pushing for a stronger result.",
    currentRank: "Current rank",
    closeCelebration: "Back to leaderboard",
  },
};

export default function LeaderboardPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const [users, setUsers] = useState<ClubUser[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayedUserIds, setDisplayedUserIds] = useState<string[]>([]);
  const [activeMovingUserId, setActiveMovingUserId] = useState<string>();
  const [celebration, setCelebration] = useState<RankCelebration>();
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const previousPositions = useRef(new Map<string, number>());

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const displayedUsers = useMemo(() => {
    const ids = displayedUserIds.length > 0 ? displayedUserIds : users.map((user) => user.id);
    return ids.map((id) => usersById.get(id)).filter((user): user is ClubUser => Boolean(user));
  }, [displayedUserIds, users, usersById]);

  useLayoutEffect(() => {
    const nextPositions = new Map<string, number>();
    for (const user of displayedUsers) {
      const element = rowRefs.current.get(user.id);
      if (element) {
        nextPositions.set(user.id, element.getBoundingClientRect().top);
      }
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) {
      for (const user of displayedUsers) {
        const element = rowRefs.current.get(user.id);
        const previousTop = previousPositions.current.get(user.id);
        const nextTop = nextPositions.get(user.id);
        if (!element || previousTop === undefined || nextTop === undefined) {
          continue;
        }

        const delta = previousTop - nextTop;
        if (Math.abs(delta) > 1) {
          element.animate(
            [
              { transform: `translateY(${delta}px)` },
              { transform: "translateY(0)" },
            ],
            { duration: 680, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
          );
        }
      }
    }

    previousPositions.current = nextPositions;

    const activeElement = activeMovingUserId ? rowRefs.current.get(activeMovingUserId) : undefined;
    activeElement?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  }, [activeMovingUserId, displayedUsers]);

  useEffect(() => {
    let cancelled = false;
    const timeouts: number[] = [];
    const intervals: number[] = [];

    async function loadLeaderboard() {
      try {
        const [usersResponse, tablesResponse, meResponse] = await Promise.all([
          fetch(withBasePath("/api/leaderboard?limit=50"), { cache: "no-store" }),
          fetch(withBasePath("/api/tables"), { cache: "no-store" }),
          fetch(withBasePath("/api/users/me"), { cache: "no-store" }),
        ]);
        const usersPayload = await usersResponse.json();
        const tablesPayload = await tablesResponse.json();
        const mePayload = meResponse.ok ? await meResponse.json() as MePayload : { user: null };
        if (!cancelled) {
          const nextUsers = Array.isArray(usersPayload.users) ? usersPayload.users as ClubUser[] : [];
          const nextAgents = Array.isArray(tablesPayload.agents) ? tablesPayload.agents as AgentSummary[] : [];
          const focusUser = pickFocusRankMoveUser(nextUsers, mePayload.user?.id);
          const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          setUsers(nextUsers);
          setAgents(nextAgents);
          setCelebration(undefined);

          if (!focusUser || reduceMotion) {
            setDisplayedUserIds(nextUsers.map((user) => user.id));
            setActiveMovingUserId(undefined);
            return;
          }

          const startRank = clampRank(focusUser.previousRank ?? focusUser.currentRank ?? 1, nextUsers.length);
          const endRank = clampRank(focusUser.currentRank ?? startRank, nextUsers.length);
          const direction = endRank > startRank ? 1 : -1;
          let visibleRank = startRank;

          setDisplayedUserIds(orderWithUserAtRank(nextUsers, focusUser.id, visibleRank));
          setActiveMovingUserId(focusUser.id);

          timeouts.push(window.setTimeout(() => {
            if (cancelled) {
              return;
            }

            const interval = window.setInterval(() => {
              if (cancelled) {
                window.clearInterval(interval);
                return;
              }

              visibleRank += direction;
              setDisplayedUserIds(orderWithUserAtRank(nextUsers, focusUser.id, visibleRank));

              if (visibleRank === endRank) {
                window.clearInterval(interval);
                timeouts.push(window.setTimeout(() => {
                  if (!cancelled) {
                    setActiveMovingUserId(undefined);
                    setCelebration({
                      currentRank: endRank,
                      delta: Math.abs(focusUser.rankDelta ?? 0),
                      name: focusUser.name,
                      trend: focusUser.rankTrend ?? "same",
                    });
                  }
                }, 700));
              }
            }, 260);
            intervals.push(interval);
          }, 650));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLeaderboard();
    return () => {
      cancelled = true;
      for (const timeout of timeouts) {
        window.clearTimeout(timeout);
      }
      for (const interval of intervals) {
        window.clearInterval(interval);
      }
    };
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>{t.text}</p>
      </section>

      <section className={styles.board}>
        {loading ? (
          <p className={styles.empty}>{t.loading}</p>
        ) : displayedUsers.length > 0 ? (
          displayedUsers.map((user, index) => {
            const agent = agents.find((item) => item.ownerUserId === user.id);
            const href = agent ? `/agents/${encodeURIComponent(agent.id)}` : `/agents/${encodeURIComponent(user.id)}`;
            const visibleRank = index + 1;
            const rowClassName = [
              visibleRank <= 3 ? styles.podiumRow : styles.row,
              activeMovingUserId === user.id ? styles.activeMovingRow : "",
            ].filter(Boolean).join(" ");
            return (
              <article
                className={rowClassName}
                key={user.id}
                ref={(node) => {
                  if (node) {
                    rowRefs.current.set(user.id, node);
                  } else {
                    rowRefs.current.delete(user.id);
                  }
                }}
              >
                <span className={styles.rank}>#{visibleRank}</span>
                <div className={styles.player}>
                  <Link href={href}>{user.name}</Link>
                  <small>
                    {t.today} {formatSigned(user.dailyProfitToday)} · {t.frozen} {user.frozenPoints.toLocaleString()}
                  </small>
                </div>
                <div className={styles.score}>
                  {rankMoveLabel(user, t) ? <span className={rankMoveClass(user.rankTrend)}>{rankMoveLabel(user, t)}</span> : null}
                  <strong>{user.pointsBalance.toLocaleString()} pts</strong>
                </div>
              </article>
            );
          })
        ) : (
          <p className={styles.empty}>{t.empty}</p>
        )}
      </section>

      {celebration ? (
        <button className={styles.celebrationMask} type="button" onClick={() => setCelebration(undefined)} aria-label={t.closeCelebration}>
          <span className={styles.celebrationCard} onClick={(event) => event.stopPropagation()}>
            <span className={celebrationClassName(celebration.trend)}>
              {celebration.trend === "up" ? t.rewardEyebrow : celebration.trend === "new" ? t.newEyebrow : t.encourageEyebrow}
            </span>
            <strong>{celebration.name}</strong>
            <span className={styles.celebrationTitle}>
              {celebration.trend === "up" ? t.rewardTitle : celebration.trend === "new" ? t.newTitle : t.encourageTitle}
            </span>
            <span className={styles.celebrationText}>{celebrationText(celebration, t)}</span>
            <span className={styles.celebrationRank}>{t.currentRank} #{celebration.currentRank}</span>
            <span className={styles.celebrationAction}>{t.closeCelebration}</span>
          </span>
        </button>
      ) : null}
    </main>
  );
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
}

function pickFocusRankMoveUser(users: ClubUser[], currentUserId?: string) {
  if (!currentUserId) {
    return undefined;
  }

  const currentUser = users.find((user) => user.id === currentUserId);
  if (!currentUser || !Number.isInteger(currentUser.currentRank) || !Number.isInteger(currentUser.previousRank) || (currentUser.rankDelta ?? 0) === 0) {
    return undefined;
  }

  return currentUser;
}

function orderWithUserAtRank(users: ClubUser[], userId: string, rank: number) {
  const currentOrder = [...users].sort((a, b) => (a.currentRank ?? Number.MAX_SAFE_INTEGER) - (b.currentRank ?? Number.MAX_SAFE_INTEGER));
  const target = currentOrder.find((user) => user.id === userId);
  if (!target) {
    return currentOrder.map((user) => user.id);
  }

  const withoutTarget = currentOrder.filter((user) => user.id !== userId);
  const nextOrder = [...withoutTarget];
  nextOrder.splice(clampRank(rank, users.length) - 1, 0, target);
  return nextOrder.map((user) => user.id);
}

function clampRank(rank: number, listLength: number) {
  return Math.min(Math.max(Math.floor(rank), 1), Math.max(listLength, 1));
}

function rankMoveLabel(user: ClubUser, t: typeof copy.zh) {
  const delta = user.rankDelta ?? 0;
  if (user.rankTrend === "up" && delta > 0) {
    return `${t.rankUp} ${delta}`;
  }
  if (user.rankTrend === "down" && delta < 0) {
    return `${t.rankDown} ${Math.abs(delta)}`;
  }
  if (user.rankTrend === "new") {
    return t.rankNew;
  }
  return "";
}

function rankMoveClass(trend?: RankTrend) {
  return [
    styles.rankMove,
    trend === "up" ? styles.rankMoveUp : "",
    trend === "down" ? styles.rankMoveDown : "",
    trend === "new" ? styles.rankMoveNew : "",
  ].filter(Boolean).join(" ");
}

function celebrationClassName(trend: RankTrend) {
  return [
    styles.celebrationEyebrow,
    trend === "up" ? styles.celebrationReward : "",
    trend === "down" ? styles.celebrationEncourage : "",
    trend === "new" ? styles.celebrationNew : "",
  ].filter(Boolean).join(" ");
}

function celebrationText(celebration: RankCelebration, t: typeof copy.zh) {
  if (celebration.trend === "up") {
    return t.rewardText.replace("{delta}", String(celebration.delta));
  }
  if (celebration.trend === "new") {
    return t.newText;
  }
  return t.encourageText.replace("{delta}", String(celebration.delta));
}
