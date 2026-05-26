"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage, type Language } from "@/lib/client/i18n";
import styles from "./MobileTopNav.module.css";

type TopNavAction = {
  href: string;
  label: string;
};

const copy = {
  zh: {
    ariaLabel: "页面导航",
    tableList: "牌桌列表",
    leaderboard: "排行榜",
    myPlayer: "我的牌手",
  },
  en: {
    ariaLabel: "Page navigation",
    tableList: "Tables",
    leaderboard: "Leaderboard",
    myPlayer: "My Player",
  },
};

export function MobileTopNav() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const t = copy[language];
  if (pathname === "/") {
    return null;
  }

  const action = topNavAction(pathname, language);

  return (
    <nav className={styles.mobileTopNav} aria-label={t.ariaLabel}>
      <Link className={styles.brand} href="/">
        <span className={styles.logo} aria-hidden="true">AI</span>
        <span>AI Poker Lab</span>
      </Link>
      {action ? (
        <Link className={styles.action} href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </nav>
  );
}

function topNavAction(pathname: string, language: Language): TopNavAction | undefined {
  const t = copy[language];
  if (/^\/tables\/[^/]+/.test(pathname)) {
    return { href: "/tables", label: t.tableList };
  }

  if (/^\/agents\/[^/]+/.test(pathname)) {
    return { href: "/leaderboard", label: t.leaderboard };
  }

  if (pathname === "/table") {
    return { href: "/tables", label: t.tableList };
  }

  if (pathname === "/journey") {
    return { href: "/me", label: t.myPlayer };
  }

  return undefined;
}
