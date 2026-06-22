"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Language = "zh" | "en";

const storageKey = "texas-poker-language";
const languageChangedEvent = "texas-poker-language-changed";

export function useLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguageSnapshot, getServerLanguageSnapshot);

  useEffect(() => {
    const fromQuery = readLanguageFromQuery();
    if (fromQuery) {
      window.localStorage.setItem(storageKey, fromQuery);
    }
    document.documentElement.lang = language === "zh" ? "zh-Hans" : "en";
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    window.localStorage.setItem(storageKey, nextLanguage);
    window.dispatchEvent(new CustomEvent(languageChangedEvent, { detail: nextLanguage }));
  }, []);

  return { language, setLanguage };
}

function subscribeLanguage(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === storageKey) {
      onStoreChange();
    }
  }

  function handleLanguageChanged() {
    onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(languageChangedEvent, handleLanguageChanged);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(languageChangedEvent, handleLanguageChanged);
  };
}

function getServerLanguageSnapshot(): Language {
  return "en";
}

function getLanguageSnapshot(): Language {
  const fromQuery = readLanguageFromQuery();
  if (fromQuery) {
    return fromQuery;
  }

  const stored = window.localStorage.getItem(storageKey);
  if (isLanguage(stored)) {
    return stored;
  }
  return readBrowserLanguage();
}

function readLanguageFromQuery(): Language | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const lang = new URLSearchParams(window.location.search).get("lang")?.toLowerCase();
  if (lang === "zh-hans" || lang === "zh-cn" || lang === "zh") {
    return "zh";
  }
  if (lang === "en") {
    return "en";
  }
  return undefined;
}

function readBrowserLanguage(): Language {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((item) => item.toLowerCase().startsWith("zh")) ? "zh" : "en";
}

function isLanguage(value: unknown): value is Language {
  return value === "zh" || value === "en";
}
