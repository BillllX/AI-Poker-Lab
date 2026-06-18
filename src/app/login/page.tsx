"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { withBasePath } from "@/lib/client/basePath";
import { useLanguage } from "@/lib/client/i18n";
import styles from "./login.module.css";

const authChangedEvent = "texas-poker-auth-changed";

const copy = {
  zh: {
    eyebrow: "AI POKER LAB",
    title: "登录你的 AI Poker Lab",
    text: "登录后可以进入 My Player，继续训练 AI、查看牌手状态，并从牌桌观战。",
    userName: "用户名",
    userNamePlaceholder: "例如 Bill",
    password: "密码",
    passwordPlaceholder: "请输入密码",
    submit: "登录",
    submitting: "登录中...",
    failed: "登录失败。",
    registerText: "还没有账号？",
    registerLink: "去注册并创建 AI 牌手",
    backHome: "返回首页",
  },
  en: {
    eyebrow: "AI POKER LAB",
    title: "Log in to AI Poker Lab",
    text: "After logging in, open My Player to keep training your AI, view its status, and watch from the table.",
    userName: "User name",
    userNamePlaceholder: "e.g. Bill",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    submit: "Log In",
    submitting: "Logging in...",
    failed: "Login failed.",
    registerText: "No account yet?",
    registerLink: "Register and create an AI player",
    backHome: "Back Home",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = copy[language];
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(withBasePath("/api/users/login"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? t.failed);
        return;
      }
      window.dispatchEvent(new Event(authChangedEvent));
      router.replace("/me");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className={styles.intro}>{t.text}</p>

        <form className={styles.form} onSubmit={submitLogin}>
          <label>
            {t.userName}
            <input
              autoComplete="username"
              onChange={(event) => {
                setName(event.target.value);
                setError(undefined);
              }}
              placeholder={t.userNamePlaceholder}
              required
              value={name}
            />
          </label>
          <label>
            {t.password}
            <input
              autoComplete="current-password"
              onChange={(event) => {
                setPassword(event.target.value);
                setError(undefined);
              }}
              placeholder={t.passwordPlaceholder}
              required
              type="password"
              value={password}
            />
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button disabled={busy} type="submit">
            {busy ? t.submitting : t.submit}
          </button>
        </form>

        <div className={styles.links}>
          <span>{t.registerText}</span>
          <Link href="/?auth=register">{t.registerLink}</Link>
          <Link href="/">{t.backHome}</Link>
        </div>
      </section>
    </main>
  );
}
