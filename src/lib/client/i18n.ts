"use client";

import { useEffect, useState } from "react";

export type Language = "zh" | "en";

const storageKey = "texas-poker-language";
const languageChangedEvent = "texas-poker-language-changed";

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(() => readInitialLanguage());

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === storageKey && isLanguage(event.newValue)) {
        setLanguageState(event.newValue);
      }
    }

    function handleLanguageChanged(event: Event) {
      const nextLanguage = (event as CustomEvent<Language>).detail;
      if (isLanguage(nextLanguage)) {
        setLanguageState(nextLanguage);
      }
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(languageChangedEvent, handleLanguageChanged);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(languageChangedEvent, handleLanguageChanged);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(storageKey, nextLanguage);
    window.dispatchEvent(new CustomEvent(languageChangedEvent, { detail: nextLanguage }));
  }

  return { language, setLanguage };
}

function readInitialLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((item) => item.toLowerCase().startsWith("zh")) ? "zh" : "en";
}

function isLanguage(value: unknown): value is Language {
  return value === "zh" || value === "en";
}
