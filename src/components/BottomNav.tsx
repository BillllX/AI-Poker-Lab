"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trackEngagement } from "@/lib/client/engagementAnalytics";
import { withBasePath } from "@/lib/client/basePath";
import { prefetchAppRoute, prefetchLobbyRoute } from "@/lib/client/prefetchTableRoutes";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./BottomNav.module.css";

type SessionUser = {
  id: string;
  name: string;
};

const copy = {
  zh: {
    ariaLabel: "主导航",
    home: "主页",
    leaderboard: "排行榜",
    arena: "竞技场",
    practice: "练习",
    myPlayer: "我的牌手",
    login: "登录",
  },
  en: {
    ariaLabel: "Main navigation",
    home: "Home",
    leaderboard: "Leaderboard",
    arena: "Arena",
    practice: "Practice",
    myPlayer: "My Player",
    login: "Log in",
  },
};

const authChangedEvent = "texas-poker-auth-changed";

export function BottomNav() {
  const router = useRouter();
  const { language } = useLanguage();
  const pathname = usePathname();
  const t = copy[language];
  const [user, setUser] = useState<SessionUser | null>(null);
  const profileHref = user ? "/me" : "/login";
  const profileLabel = user ? t.myPlayer : t.login;
  const navItems = [
    {
      href: "/",
      icon: HomeIcon,
      label: t.home,
      match: (currentPathname: string) => currentPathname === "/",
    },
    {
      href: "/leaderboard",
      icon: TrophyIcon,
      label: t.leaderboard,
      match: (currentPathname: string) => currentPathname === "/leaderboard",
    },
    {
      href: "/tables",
      icon: ArenaIcon,
      label: t.arena,
      match: (currentPathname: string) => currentPathname === "/tables" || currentPathname.startsWith("/tables/") || currentPathname === "/table",
    },
    {
      href: "/human-table",
      icon: PracticeIcon,
      label: t.practice,
      match: (currentPathname: string) => currentPathname === "/human-table",
    },
  ];

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch(withBasePath("/api/users/me"), { cache: "no-store" });
        const payload = await response.json();
        if (!cancelled) {
          const nextUser = response.ok ? payload.user ?? null : null;
          setUser((current) => (current?.id === nextUser?.id && current?.name === nextUser?.name ? current : nextUser));
        }
      } catch {
        if (!cancelled) {
          setUser((current) => (current === null ? current : null));
        }
      }
    }

    void loadSession();
    window.addEventListener("focus", loadSession);
    window.addEventListener(authChangedEvent, loadSession);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadSession);
      window.removeEventListener(authChangedEvent, loadSession);
    };
  }, [router]);

  function prefetchNavRoute(href: string) {
    if (href === "/tables") {
      prefetchLobbyRoute(router);
      return;
    }
    prefetchAppRoute(router, href);
  }

  return (
    <nav className={styles.bottomNav} aria-label={t.ariaLabel}>
      {[...navItems, {
        href: profileHref,
        icon: PlayerIcon,
        label: profileLabel,
        match: (currentPathname: string) =>
          currentPathname === "/me" || currentPathname === "/journey" || currentPathname === "/login",
      }].map((item) => {
        const Icon = item.icon;
        const active = item.match(pathname);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={styles.navItem}
            data-active={active ? "true" : undefined}
            href={item.href}
            key={item.href}
            onMouseEnter={() => prefetchNavRoute(item.href)}
            onClick={() => {
              if (item.href === "/human-table") {
                trackEngagement({
                  at: new Date().toISOString(),
                  from: pathname,
                  name: "engagement.nav.practice_click",
                });
              }
            }}
          >
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3.8 10.6 12 3.9l8.2 6.7v9a1.5 1.5 0 0 1-1.5 1.5h-4.1v-5.8H9.4v5.8H5.3a1.5 1.5 0 0 1-1.5-1.5z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 4h10v2h3.4v2.4c0 3.1-1.8 5.3-4.8 5.9a5.1 5.1 0 0 1-2.1 1.2v2.4h3.2v2.2H7.3v-2.2h3.2v-2.4a5.1 5.1 0 0 1-2.1-1.2c-3-.6-4.8-2.8-4.8-5.9V6H7zm10 2v5.3c1-.5 1.5-1.5 1.5-2.9V8H17zM5.5 8v.4c0 1.4.5 2.4 1.5 2.9V8z" />
    </svg>
  );
}

function ArenaIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6.8 4.2h10.4a2 2 0 0 1 2 2v11.6a2 2 0 0 1-2 2H6.8a2 2 0 0 1-2-2V6.2a2 2 0 0 1 2-2m1.1 3.2v4.1h3.2V7.4zm5 0v4.1h3.2V7.4zm-5 6.1v3.1h8.2v-3.1z" />
    </svg>
  );
}

function PracticeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7.2 4.8h9.6a1.8 1.8 0 0 1 1.8 1.8v10.8a1.8 1.8 0 0 1-1.8 1.8H7.2a1.8 1.8 0 0 1-1.8-1.8V6.6a1.8 1.8 0 0 1 1.8-1.8m2.2 2.4a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8m5.2 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8M6.8 18.2c1.2-2.8 2.8-4.2 5.2-4.2s4 1.4 5.2 4.2z" />
    </svg>
  );
}

function PlayerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2M4.6 20.8c.6-4 3.4-6.2 7.4-6.2s6.8 2.2 7.4 6.2z" />
    </svg>
  );
}
