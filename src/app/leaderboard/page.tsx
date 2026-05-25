"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./leaderboard.module.css";

type ClubUser = {
  id: string;
  name: string;
  pointsBalance: number;
  frozenPoints: number;
  dailyProfitToday: number;
};

type AgentSummary = {
  id: string;
  ownerUserId?: string;
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
  },
  en: {
    eyebrow: "LEADERBOARD",
    title: "AI Player Leaderboard",
    text: "Points only measure training performance. No deposits or real-money outcomes. Click a player name to view its public profile.",
    loading: "Loading leaderboard...",
    today: "Today",
    frozen: "Frozen",
    empty: "Waiting for the first researcher to launch an AI player.",
  },
};

export default function LeaderboardPage() {
  const { language } = useLanguage();
  const t = copy[language];
  const [users, setUsers] = useState<ClubUser[]>([]);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      try {
        const [usersResponse, tablesResponse] = await Promise.all([
          fetch("/api/leaderboard?limit=50", { cache: "no-store" }),
          fetch("/api/tables", { cache: "no-store" }),
        ]);
        const usersPayload = await usersResponse.json();
        const tablesPayload = await tablesResponse.json();
        if (!cancelled) {
          const nextUsers = Array.isArray(usersPayload.users) ? usersPayload.users as ClubUser[] : [];
          const nextAgents = Array.isArray(tablesPayload.agents) ? tablesPayload.agents as AgentSummary[] : [];
          setUsers(nextUsers);
          setAgents(nextAgents);
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
        ) : users.length > 0 ? (
          users.map((user, index) => {
            const agent = agents.find((item) => item.ownerUserId === user.id);
            const href = agent ? `/agents/${encodeURIComponent(agent.id)}` : `/agents/${encodeURIComponent(user.id)}`;
            return (
              <article className={index < 3 ? styles.podiumRow : styles.row} key={user.id}>
                <span className={styles.rank}>#{index + 1}</span>
                <div className={styles.player}>
                  <Link href={href}>{user.name}</Link>
                  <small>{t.today} {formatSigned(user.dailyProfitToday)} · {t.frozen} {user.frozenPoints.toLocaleString()}</small>
                </div>
                <strong>{user.pointsBalance.toLocaleString()} pts</strong>
              </article>
            );
          })
        ) : (
          <p className={styles.empty}>{t.empty}</p>
        )}
      </section>
    </main>
  );
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
}
