"use client";

import { useEffect, useState } from "react";

export type Language = "zh" | "en";

const storageKey = "texas-poker-language";
const languageChangedEvent = "texas-poker-language-changed";

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const initial = setTimeout(() => {
      setLanguageState(readInitialLanguage());
    }, 0);

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
      clearTimeout(initial);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(languageChangedEvent, handleLanguageChanged);
    };
  }, []);

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(storageKey, nextLanguage);
    window.dispatchEvent(new CustomEvent(languageChangedEvent, { detail: nextLanguage }));
  }

  return { language, setLanguage };
}

function readInitialLanguage(): Language {
  const stored = window.localStorage.getItem(storageKey);
  if (isLanguage(stored)) {
    return stored;
  }

  return "en";
}

function isLanguage(value: unknown): value is Language {
  return value === "zh" || value === "en";
}
