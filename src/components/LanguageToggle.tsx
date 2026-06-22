"use client";

import { pickOperationalCopy } from "@/lib/client/localizedCopy";
import { useLanguage, type Language } from "@/lib/client/i18n";
import styles from "./LanguageToggle.module.css";

type LanguageToggleProps = {
  className?: string;
};

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      aria-label={pickOperationalCopy(language, "uiLanguageToggle")}
      className={[styles.toggle, className].filter(Boolean).join(" ")}
      role="group"
    >
      {(["en", "zh"] as Language[]).map((option) => (
        <button
          aria-pressed={language === option}
          className={language === option ? styles.active : undefined}
          key={option}
          type="button"
          onClick={() => setLanguage(option)}
        >
          {pickOperationalCopy(language, option === "en" ? "uiLanguageEn" : "uiLanguageZh")}
        </button>
      ))}
    </div>
  );
}
