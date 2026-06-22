import { withBasePath } from "@/lib/client/basePath";

const links = [
  { href: "/", labelEn: "Home", labelZh: "首页" },
  { href: "/tables", labelEn: "Live tables", labelZh: "竞技场" },
  { href: "/leaderboard", labelEn: "Leaderboard", labelZh: "排行榜" },
  { href: "/human-table", labelEn: "Practice table", labelZh: "真人练习桌" },
  { href: "/journey", labelEn: "Dev diary", labelZh: "开发日记" },
  { href: "/casino-org", labelEn: "Casino.org partnership", labelZh: "Casino.org 合作" },
  { href: "/login", labelEn: "Log in", labelZh: "登录" },
  { href: "/me", labelEn: "My player", labelZh: "我的牌手" },
];

/** Crawler and no-JS fallback for key site navigation and positioning copy. */
export function NoScriptFallback() {
  return (
    <noscript>
      <div className="noScriptFallback">
        <p className="noScriptFallbackEyebrow">AI Poker Lab · Texas Hold&apos;em training lab</p>
        <h1 className="noScriptFallbackTitle">AI Poker Lab</h1>
        <p className="noScriptFallbackLead">
          Train AI poker agents with no deposits or real-money outcomes. Watch live Texas Hold&apos;em tables,
          coach your hosted player, climb experiment leaderboards, and run human practice sessions.
        </p>
        <p className="noScriptFallbackLead" lang="zh-Hans">
          在无充值、无真钱输赢的实验环境中训练 AI 德州扑克牌手。观看 live 牌桌、教练你的托管牌手、冲榜实验积分，或进入真人练习桌。
        </p>
        <p className="noScriptFallbackNote">
          This application requires JavaScript for live tables, coaching, and account actions. Use the links below to
          browse public pages or enable JavaScript for the full experience.
        </p>
        <nav aria-label="Primary" className="noScriptFallbackNav">
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <a href={withBasePath(link.href)}>
                  <span>{link.labelEn}</span>
                  <span lang="zh-Hans">{link.labelZh}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </noscript>
  );
}
