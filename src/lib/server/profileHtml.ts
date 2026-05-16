const maxProfileHtmlLength = 24_000;

type DefaultProfileHtmlInput = {
  displayName: string;
  agentId: string;
  modelName?: string;
  status: string;
  badges: string[];
  history: {
    sessions: number;
    handsPlayed: number;
    handsWon: number;
    profit: number;
    bestProfit: number;
  };
};

const blockedPatterns = [
  { pattern: /<\s*script\b/i, reason: "script tags are not allowed." },
  { pattern: /<\s*(iframe|object|embed|form|input|button|textarea|select|base|link|meta)\b/i, reason: "interactive or external document tags are not allowed." },
  { pattern: /\son[a-z]+\s*=/i, reason: "event handler attributes are not allowed." },
  { pattern: /\b(?:src|href|action|formaction|poster)\s*=\s*["']?\s*(?:https?:|\/\/|javascript:|data:text\/html)/i, reason: "external URLs and executable URLs are not allowed." },
  { pattern: /@import/i, reason: "CSS imports are not allowed." },
  { pattern: /url\(\s*["']?\s*(?:https?:|\/\/|javascript:|data:text\/html)/i, reason: "external CSS URLs are not allowed." },
];

export function validateProfileHtml(html: unknown) {
  if (typeof html !== "string" || !html.trim()) {
    throw new Error("html is required.");
  }

  const trimmed = html.trim();
  if (trimmed.length > maxProfileHtmlLength) {
    throw new Error(`html must be ${maxProfileHtmlLength} characters or less.`);
  }

  for (const item of blockedPatterns) {
    if (item.pattern.test(trimmed)) {
      throw new Error(`Unsafe profile html: ${item.reason}`);
    }
  }

  return trimmed;
}

export function wrapProfileHtml(html: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; connect-src 'none'; script-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: transparent; color: #eef8f1; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { padding: 0; overflow-wrap: anywhere; }
    a { color: inherit; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
}

export function buildDefaultProfileHtml(input: DefaultProfileHtmlInput) {
  const title = titleFor(input.history);
  const winRate = input.history.handsPlayed > 0 ? Math.round((input.history.handsWon / input.history.handsPlayed) * 100) : 0;
  const profitText = formatSigned(input.history.profit);
  const bestText = formatSigned(input.history.bestProfit);
  const badgeHtml = input.badges.slice(0, 5).map((badge) => `<span>${escapeHtml(badge)}</span>`).join("");

  return wrapProfileHtml(`
<section class="agent-card">
  <div class="glow"></div>
  <header>
    <p>AI POKER PROFILE</p>
    <strong>${escapeHtml(input.status)}</strong>
  </header>
  <main>
    <div class="avatar">${escapeHtml(initials(input.displayName))}</div>
    <div>
      <h1>${escapeHtml(input.displayName)}</h1>
      <h2>${escapeHtml(title)}</h2>
      <p class="bio">${escapeHtml(summaryFor(input, winRate))}</p>
    </div>
  </main>
  <div class="badges">${badgeHtml || "<span>New Agent</span>"}</div>
  <div class="stats">
    <article><small>Model</small><b>${escapeHtml(input.modelName ?? "Unknown Model")}</b></article>
    <article><small>Sessions</small><b>${input.history.sessions}</b></article>
    <article><small>Hands</small><b>${input.history.handsPlayed}</b></article>
    <article><small>Win Rate</small><b>${winRate}%</b></article>
    <article><small>Total P&L</small><b class="${input.history.profit < 0 ? "down" : "up"}">${profitText}</b></article>
    <article><small>Best Session</small><b class="${input.history.bestProfit < 0 ? "down" : "up"}">${bestText}</b></article>
  </div>
  <footer>${escapeHtml(input.agentId)}</footer>
</section>
<style>
  .agent-card { position: relative; min-height: 420px; overflow: hidden; border: 1px solid rgba(110,231,168,.28); border-radius: 28px; padding: 24px; background: radial-gradient(circle at 82% 12%, rgba(250,204,21,.22), transparent 15rem), linear-gradient(135deg, rgba(7,42,26,.96), rgba(4,19,14,.98)); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 26px 70px rgba(0,0,0,.32); }
  .glow { position: absolute; inset: auto -20% -45% 20%; height: 260px; background: radial-gradient(circle, rgba(110,231,168,.28), transparent 62%); pointer-events: none; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 16px; position: relative; z-index: 1; }
  header p { margin: 0; color: #6ee7a8; font-size: 12px; font-weight: 900; letter-spacing: .18em; }
  header strong, .badges span { border: 1px solid rgba(110,231,168,.3); border-radius: 999px; background: rgba(110,231,168,.1); color: #6ee7a8; font-size: 12px; padding: 7px 10px; }
  main { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 18px; align-items: center; margin-top: 34px; position: relative; z-index: 1; }
  .avatar { display: grid; place-items: center; width: 96px; height: 96px; border-radius: 30px; background: linear-gradient(145deg, #facc15, #6ee7a8); color: #052014; font-size: 34px; font-weight: 1000; box-shadow: 0 18px 38px rgba(0,0,0,.28); }
  h1 { margin: 0; font-size: clamp(36px, 9vw, 72px); line-height: .9; letter-spacing: -.07em; }
  h2 { margin: 10px 0 0; color: #facc15; font-size: 18px; }
  .bio { max-width: 760px; margin: 14px 0 0; color: rgba(238,248,241,.74); line-height: 1.65; }
  .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; position: relative; z-index: 1; }
  .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 22px; position: relative; z-index: 1; }
  article { border: 1px solid rgba(255,255,255,.12); border-radius: 18px; padding: 14px; background: rgba(255,255,255,.06); }
  small { display: block; color: rgba(238,248,241,.58); }
  b { display: block; margin-top: 5px; color: #eef8f1; font-size: 20px; }
  .up { color: #6ee7a8; } .down { color: #fb7185; }
  footer { margin-top: 20px; color: rgba(238,248,241,.42); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; position: relative; z-index: 1; }
  @media (max-width: 640px) { main, .stats { grid-template-columns: 1fr; } .avatar { width: 82px; height: 82px; border-radius: 24px; } }
</style>`);
}

function titleFor(history: DefaultProfileHtmlInput["history"]) {
  if (history.sessions === 0) {
    return "新晋挑战者";
  }
  if (history.profit > 0 && history.handsPlayed >= 20) {
    return "盈利型牌手";
  }
  if (history.bestProfit >= 300) {
    return "爆发型猎手";
  }
  if (history.handsPlayed >= 50) {
    return "长线磨炼者";
  }
  return "训练中的 AI 牌手";
}

function summaryFor(input: DefaultProfileHtmlInput, winRate: number) {
  if (input.history.sessions === 0) {
    return `${input.displayName} 正在准备第一场正式比赛。连接 Agent 后，它的训练轨迹、战绩和风格会沉淀在这里。`;
  }

  return `${input.displayName} 已完成 ${input.history.sessions} 场结算，累计 ${input.history.handsPlayed} 手，胜场率 ${winRate}%，总盈亏 ${formatSigned(input.history.profit)}。`;
}

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "AI";
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString()}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char);
}
