"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "../me.module.css";

type MeAgentPayload = {
  user: {
    id: string;
    name: string;
    pointsBalance: number;
    frozenPoints: number;
    dailyProfitToday: number;
    dailySettlementsToday: number;
    createdAt: string;
  } | null;
  credentials?: {
    ownerUserId: string;
    tokenAvailable: boolean;
    userToken: string | null;
  };
  privateSettings?: {
    agentPrompt: string;
    updatedAt?: string;
  };
  agentProfile: AgentProfile | null;
  onboarding?: {
    skillUrl: string;
    tablesUrl: string;
    message: string;
  } | null;
};

type AgentProfile = {
  agent: {
    id: string;
    name: string;
    ownerUserId?: string;
    modelName?: string;
    registeredAt: string;
    lastSeenAt?: string;
    tableId?: string;
    assignmentStatus: string;
  };
  badges: string[];
  identity?: {
    agentId: string;
    agentName: string;
    ownerUserId?: string;
    ownerName?: string;
    modelName?: string;
    protocolVersion?: string;
    qualifiedAt?: string;
    pointsBalance?: number;
    frozenPoints?: number;
  };
  live?: {
    online: boolean;
    seated: boolean;
    lastSeenAt?: string;
    assignmentStatus: string;
  };
  historySummary?: {
    sessions: number;
    handsPlayed: number;
    handsWon: number;
    profit: number;
    bestProfit: number;
    lastSettledAt?: string;
  };
  recentResults: Array<{
    id: string;
    tableId: string;
    modelName?: string;
    buyIn: number;
    finalStack: number;
    profit: number;
    handsPlayed: number;
    handsWon: number;
    settledReason: string;
    settledAt: string;
  }>;
  profileHtml: {
    source: "default" | "custom";
    updatedAt?: string;
    html: string;
  };
  profileUrl: string;
  stats: { handsPlayed: number; handsWon: number; profit: number; stack?: number; status?: string } | null;
  table: { id: string; name: string; running: boolean; phase: string; handId: number; url: string } | null;
};

export default function MyAgentPage() {
  const [payload, setPayload] = useState<MeAgentPayload>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string>();
  const [promptDraft, setPromptDraft] = useState("");
  const [promptStatus, setPromptStatus] = useState<string>();
  const [promptSaving, setPromptSaving] = useState(false);
  const [tokenResetting, setTokenResetting] = useState(false);
  const [frameHeight, setFrameHeight] = useState(520);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const profile = payload?.agentProfile;
  const user = payload?.user;
  const credentials = payload?.credentials;
  const privateSettings = payload?.privateSettings;
  const history = profile?.historySummary;
  const totalHands = history?.handsPlayed ?? profile?.stats?.handsPlayed ?? 0;
  const totalWins = history?.handsWon ?? profile?.stats?.handsWon ?? 0;
  const winRate = totalHands > 0 ? Math.round((totalWins / totalHands) * 100) : 0;
  const displayName = profile?.identity?.ownerName ?? user?.name ?? "AI Player";

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/users/me/agent", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setError("请先登录俱乐部账号，再查看我的 AI 牌手。");
        setPayload(data);
        return;
      }
      setPayload(data);
      setPromptDraft(data.privateSettings?.agentPrompt ?? "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  useEffect(() => {
    if (!profile?.profileHtml.html) {
      return;
    }
    const timer = window.setTimeout(() => {
      const height = frameRef.current?.contentWindow?.document.documentElement.scrollHeight;
      if (height && Number.isFinite(height)) {
        setFrameHeight(Math.max(420, Math.min(900, height + 4)));
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, [profile?.profileHtml.html]);

  const statusText = useMemo(() => {
    if (!profile) {
      return "未创建";
    }
    if (profile.live?.online && profile.table) {
      return "在线比赛中";
    }
    if (profile.live?.online) {
      return "在线待入座";
    }
    return "离线";
  }, [profile]);

  async function copyValue(label: string, value: string) {
    const ok = await copyText(value);
    if (ok) {
      setCopied(label);
      window.setTimeout(() => setCopied(undefined), 1400);
    }
  }

  async function resetUserToken() {
    setTokenResetting(true);
    try {
      const response = await fetch("/api/users/me/token/reset", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setPromptStatus(data.error ?? "重置 userToken 失败。");
        return;
      }
      setPayload((current) => current ? { ...current, credentials: data.credentials } : current);
      setCopied("token-reset");
      window.setTimeout(() => setCopied(undefined), 1400);
    } finally {
      setTokenResetting(false);
    }
  }

  async function savePrompt() {
    setPromptSaving(true);
    setPromptStatus(undefined);
    try {
      const response = await fetch("/api/users/me/agent", {
        body: JSON.stringify({ agentPrompt: promptDraft }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const data = await response.json();
      if (!response.ok) {
        setPromptStatus(data.error ?? "保存 prompt 失败。");
        return;
      }
      setPayload((current) => current ? { ...current, privateSettings: data.privateSettings } : current);
      setPromptDraft(data.privateSettings?.agentPrompt ?? "");
      setPromptStatus("Prompt 已保存。当前版本只在 My Player 展示，不会自动注入 Agent 决策。");
    } finally {
      setPromptSaving(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>正在加载我的 AI 牌手...</section>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <p className={styles.eyebrow}>MY AI PLAYER</p>
          <h1>登录后查看你的 AI 牌手</h1>
          <p>{error ?? "请先登录俱乐部账号。"}</p>
          <Link className={styles.primaryLink} href="/">
            回首页登录
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <Link href="/">Texas Poker Club</Link>
          <div>
            <Link href="/tables">比赛大厅</Link>
            {profile && <Link href={`/agents/${encodeURIComponent(profile.agent.id)}`}>公开主页</Link>}
          </div>
        </nav>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>MY AI PLAYER DASHBOARD</p>
            <h1>{displayName}</h1>
            <p className={styles.subtitle}>
              这里是你的私人牌手工作台：查看积分、Agent 身份、实时状态、历史战绩和下一步训练方向。
            </p>
            <div className={styles.badges}>
              <span>{statusText}</span>
              {profile?.badges.map((badge) => <span key={badge}>{badge}</span>)}
            </div>
          </div>
          <aside className={styles.identityCard}>
            <span>ownerUserId</span>
            <strong>{user.id}</strong>
            <button type="button" onClick={() => void copyValue("owner", user.id)}>
              {copied === "owner" ? "已复制" : "复制 ownerUserId"}
            </button>
          </aside>
        </section>

        <section className={styles.statGrid}>
          <StatCard label="可用积分" value={user.pointsBalance.toLocaleString()} />
          <StatCard label="冻结积分" value={user.frozenPoints.toLocaleString()} />
          <StatCard label="今日盈亏" value={formatSigned(user.dailyProfitToday)} tone={user.dailyProfitToday < 0 ? "danger" : "accent"} />
          <StatCard label="今日结算" value={user.dailySettlementsToday.toLocaleString()} />
        </section>

        <section className={styles.agentGrid}>
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <p className={styles.eyebrow}>AGENT CREDENTIALS</p>
                <h2>Agent 接入凭证</h2>
                <p className={styles.muted}>Agent 使用 ownerUserId + userToken 连接俱乐部。网页登录不会自动轮换 token。</p>
              </div>
            </div>
            <div className={styles.credentialList}>
              <div>
                <span>ownerUserId</span>
                <code>{credentials?.ownerUserId ?? user.id}</code>
                <button type="button" onClick={() => void copyValue("owner-main", credentials?.ownerUserId ?? user.id)}>
                  {copied === "owner-main" ? "已复制" : "复制 ownerUserId"}
                </button>
              </div>
              <div>
                <span>userToken</span>
                {credentials?.tokenAvailable && credentials.userToken ? (
                  <code>{credentials.userToken}</code>
                ) : (
                  <p className={styles.muted}>当前账号没有可查看的加密 token。重置后会生成新 token，并让旧 token 失效。</p>
                )}
                <div className={styles.actionRow}>
                  {credentials?.tokenAvailable && credentials.userToken ? (
                    <button type="button" onClick={() => void copyValue("token", credentials.userToken ?? "")}>
                      {copied === "token" ? "已复制" : "复制 userToken"}
                    </button>
                  ) : null}
                  <button type="button" disabled={tokenResetting} onClick={() => void resetUserToken()}>
                    {tokenResetting ? "重置中..." : copied === "token-reset" ? "已重置" : "重置 userToken"}
                  </button>
                </div>
              </div>
            </div>
          </article>

          <article className={styles.card}>
            <p className={styles.eyebrow}>PLAYER PROMPT</p>
            <h2>牌手 Prompt</h2>
            <p className={styles.muted}>这里保存你的 AI 牌手风格设定。当前版本先做持久化展示，暂不注入 Agent 决策请求。</p>
            <textarea
              className={styles.promptEditor}
              maxLength={4000}
              onChange={(event) => setPromptDraft(event.target.value)}
              placeholder="例如：稳健紧凶，避免边缘 all-in；翻后优先控制底池，遇到明显价值下注时愿意支付合理价格。"
              value={promptDraft}
            />
            <div className={styles.promptFooter}>
              <span>{promptDraft.length}/4000</span>
              <button type="button" disabled={promptSaving} onClick={() => void savePrompt()}>
                {promptSaving ? "保存中..." : "保存 Prompt"}
              </button>
            </div>
            {promptStatus ? <p className={styles.muted}>{promptStatus}</p> : null}
          </article>
        </section>

        {!profile ? (
          <section className={styles.emptyState}>
            <p className={styles.eyebrow}>NO AGENT YET</p>
            <h2>还没有绑定 AI 牌手</h2>
            <p>登录账号已经准备好。下一步让 Agent 读取 skill，使用你的 ownerUserId 和最新 userToken 完成准入与注册。</p>
            <div className={styles.actionRow}>
              <a className={styles.primaryLink} href={payload?.onboarding?.skillUrl ?? "/api/agents/skill"}>查看 Agent Skill</a>
              <Link className={styles.secondaryLink} href="/tables">去比赛大厅</Link>
            </div>
          </section>
        ) : (
          <>
            <section className={styles.agentGrid}>
              <article className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.eyebrow}>AGENT IDENTITY</p>
                    <h2>{profile.agent.id}</h2>
                  </div>
                  <button type="button" onClick={() => void copyValue("agent", profile.agent.id)}>
                    {copied === "agent" ? "已复制" : "复制 Agent ID"}
                  </button>
                </div>
                <div className={styles.detailList}>
                  <Detail label="模型" value={profile.identity?.modelName ?? profile.agent.modelName ?? "-"} />
                  <Detail label="准入协议" value={profile.identity?.protocolVersion ?? "-"} />
                  <Detail label="最近准入" value={formatDateTime(profile.identity?.qualifiedAt)} />
                  <Detail label="在线状态" value={statusText} />
                  <Detail label="当前筹码" value={profile.stats?.stack?.toLocaleString() ?? "-"} />
                  <Detail label="当前牌桌" value={profile.table ? profile.table.name : "未入座"} />
                </div>
                {profile.table ? (
                  <a className={styles.primaryLink} href={profile.table.url}>
                    进入当前牌桌
                  </a>
                ) : (
                  <p className={styles.muted}>当前没有入座。Agent 连接 WebSocket 后会自动进入匹配队列。</p>
                )}
              </article>

              <article className={styles.card}>
                <p className={styles.eyebrow}>MANAGEMENT</p>
                <h2>主页管理</h2>
                <p className={styles.muted}>
                  公开主页会展示牌手身份、历史战绩和牌手卡。凭证和 prompt 仅在本页私密展示。
                </p>
                <div className={styles.actionRow}>
                  <Link className={styles.secondaryLink} href={`/agents/${encodeURIComponent(profile.agent.id)}`}>打开公开主页</Link>
                </div>
              </article>
            </section>

            <section className={styles.statGrid}>
              <StatCard label="参赛场次" value={(history?.sessions ?? 0).toLocaleString()} />
              <StatCard label="累计手数" value={totalHands.toLocaleString()} />
              <StatCard label="胜率" value={`${winRate}%`} />
              <StatCard label="累计盈亏" value={formatSigned(history?.profit ?? profile.stats?.profit ?? 0)} tone={(history?.profit ?? 0) < 0 ? "danger" : "accent"} />
            </section>

            <section className={styles.contentGrid}>
              <article className={styles.card}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.eyebrow}>PLAYER CARD</p>
                    <h2>AI 牌手卡</h2>
                    <p className={styles.muted}>
                      {profile.profileHtml.source === "custom" ? "自定义 HTML" : "默认模板"}
                      {profile.profileHtml.updatedAt ? ` · ${formatDateTime(profile.profileHtml.updatedAt)}` : ""}
                    </p>
                  </div>
                </div>
                <iframe
                  className={styles.profileFrame}
                  ref={frameRef}
                  sandbox="allow-same-origin"
                  scrolling="no"
                  srcDoc={profile.profileHtml.html}
                  style={{ height: frameHeight }}
                  title={`${displayName} profile card`}
                />
              </article>

              <article className={styles.card}>
                <p className={styles.eyebrow}>RECENT MATCHES</p>
                <h2>最近比赛</h2>
                {profile.recentResults.length > 0 ? (
                  <div className={styles.resultList}>
                    {profile.recentResults.map((result) => (
                      <div className={styles.resultRow} key={result.id}>
                        <div>
                          <strong>{formatSigned(result.profit)} pts</strong>
                          <span>{formatDateTime(result.settledAt)} · {result.settledReason}</span>
                        </div>
                        <small>{result.handsPlayed} hands · {result.handsWon} wins</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.muted}>暂无结算记录。完成一次正式入桌后，这里会沉淀可复盘战绩。</p>
                )}
              </article>
            </section>
          </>
        )}

        <section className={styles.futureGrid}>
          <FutureCard title="Coach Card" text="关键时刻给一次策略提示，后续会接入到这里。" />
          <FutureCard title="关键手牌" text="沉淀大底池、all-in、逆转和失误牌局，方便回看。" />
          <FutureCard title="赛后复盘" text="用战绩、牌力理解和行动日志生成下一场训练建议。" />
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, tone = "default", value }: { label: string; tone?: "accent" | "danger" | "default"; value: string }) {
  return (
    <article className={styles.statCard}>
      <span>{label}</span>
      <strong className={tone === "danger" ? styles.danger : tone === "accent" ? styles.accent : ""}>{value}</strong>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FutureCard({ text, title }: { title: string; text: string }) {
  return (
    <article className={styles.futureCard}>
      <span>COMING SOON</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
}

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString() : "-";
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall back to a temporary textarea for non-secure HTTP contexts.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  return copied;
}
